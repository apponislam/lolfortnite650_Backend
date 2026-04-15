import { Types } from "mongoose";
import ApiError from "../../../errors/ApiError";
import httpStatus from "http-status";
import { ClassPaymentModel } from "./classpayments.model";
import { executeMyFatoorahPayment, getMyFatoorahPaymentStatus, initiateMyFatoorahPayment, initiateMyFatoorahSession } from "./classpayments.utils";
import { UserModel } from "../auth/auth.model";
import { ClassModel } from "../class/class.model";
import { HourlyClassModel } from "../hourlyclasses/hourlyclass.model";
import { Slot } from "../slot/slot.model";
import { completeOffer } from "../messages/messages.services";
import config from "../../config";

/**
 * Core payment preparation logic (Shared between standard and mobile)
 */
const preparePaymentData = async (userId: string, payload: any) => {
    const { classType, classId, slotId, messageId, amount, currency = "KWD" } = payload;

    const student = await UserModel.findById(userId);
    if (!student) throw new ApiError(httpStatus.NOT_FOUND, "Student not found");

    let teacherId: Types.ObjectId | undefined;
    let finalAmount = amount;
    let classDetailType: any = undefined;

    // Validate class and get teacher
    if (classType === "CLASS") {
        const classData = await ClassModel.findById(classId);
        if (!classData) throw new ApiError(httpStatus.NOT_FOUND, "Class not found");

        const alreadyEnrolled = await ClassPaymentModel.findOne({
            student: userId,
            classId: classId,
            status: "PAID",
        });

        if (alreadyEnrolled) {
            throw new ApiError(httpStatus.BAD_REQUEST, "You are already enrolled in this class");
        }

        if (classData.maxStudents && classData.enrolledStudents && classData.enrolledStudents >= classData.maxStudents) {
            throw new ApiError(httpStatus.BAD_REQUEST, "Class is already full");
        }

        teacherId = classData.createdBy;
        finalAmount = classData.price;
        classDetailType = classData.classType;
    } else if (classType === "HOURLY_CLASS") {
        const hourlyClass = await HourlyClassModel.findById(classId);
        if (!hourlyClass) throw new ApiError(httpStatus.NOT_FOUND, "Hourly class not found");
        teacherId = hourlyClass.createdBy;

        if (slotId) {
            const slotData = await Slot.findById(slotId);
            if (slotData) {
                finalAmount = hourlyClass.pricePerHour * slotData.hours;
            } else {
                finalAmount = hourlyClass.pricePerHour;
            }
        } else if (!finalAmount) {
            finalAmount = hourlyClass.pricePerHour;
        }
    }

    if (!finalAmount || finalAmount <= 0) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Invalid payment amount");
    }

    if (!teacherId) throw new ApiError(httpStatus.BAD_REQUEST, "Teacher not found for this class");

    const teacher = await UserModel.findById(teacherId);
    const percentage = teacher?.percentage ?? 20;

    const commission = (finalAmount * percentage) / 100;
    const teacherFee = finalAmount - commission;

    const classPayment = await ClassPaymentModel.create({
        student: userId,
        teacher: teacherId,
        amount: finalAmount,
        commission,
        teacherFee,
        currency,
        status: "PENDING",
        classType,
        classDetailType,
        classId,
        slotId,
        messageId,
        metadata: payload,
    });

    return { classPayment, student, finalAmount, currency };
};

/**
 * Initiate standard payment (Web/Standard Redirect)
 */
const initiateClassPayment = async (userId: string, payload: any) => {
    const { classPayment, student, finalAmount, currency = "KWD" } = await preparePaymentData(userId, payload);
    console.log(classPayment, student, finalAmount, currency);

    try {
        const successUrl = `${config.client_url}/payment/success?classPaymentId=${classPayment._id}`;
        const errorUrl = `${config.client_url}/payment/error?classPaymentId=${classPayment._id}`;

        const paymentResponse = await executeMyFatoorahPayment({
            amount: finalAmount,
            currency,
            customerName: student.name || "Customer",
            customerEmail: student.email || "test@test.com",
            successUrl,
            errorUrl,
            customerReference: classPayment._id.toString(),
        });

        if (!paymentResponse.IsSuccess) {
            classPayment.status = "FAILED";
            await classPayment.save();
            throw new ApiError(httpStatus.BAD_GATEWAY, "Payment initiation failed");
        }

        classPayment.invoiceId = paymentResponse.Data.InvoiceId;
        classPayment.paymentUrl = paymentResponse.Data.InvoiceURL;
        classPayment.metadata = { ...payload, rawResponse: paymentResponse.Data };
        await classPayment.save();

        return {
            paymentUrl: paymentResponse.Data.InvoiceURL,
            invoiceId: paymentResponse.Data.InvoiceId,
            classPaymentId: classPayment._id,
            successUrl,
            errorUrl,
        };
    } catch (error: any) {
        classPayment.status = "FAILED";
        await classPayment.save();
        throw new ApiError(httpStatus.BAD_REQUEST, error.message || "Failed to initiate payment");
    }
};

/**
 * Initiate mobile SDK payment (Session + Payment Methods)
 */
const initiateMobileClassPayment = async (userId: string, payload: any) => {
    const { classPayment, finalAmount, currency } = await preparePaymentData(userId, payload);

    try {
        // ✅ STEP 1: Create the invoice (same as web payment)
        const successUrl = `${config.client_url}/payment/success?classPaymentId=${classPayment._id}`;
        const errorUrl = `${config.client_url}/payment/error?classPaymentId=${classPayment._id}`;

        const invoiceResponse = await executeMyFatoorahPayment({
            amount: finalAmount,
            currency,
            customerName: payload.customerName || "Customer",
            customerEmail: payload.customerEmail || "test@test.com",
            successUrl,
            errorUrl,
            customerReference: classPayment._id.toString(),
        });

        if (!invoiceResponse.IsSuccess) {
            classPayment.status = "FAILED";
            await classPayment.save();
            throw new ApiError(httpStatus.BAD_GATEWAY, "Failed to create invoice");
        }

        // ✅ STEP 2: Save the invoice ID
        classPayment.invoiceId = invoiceResponse.Data.InvoiceId;
        await classPayment.save();

        // ✅ STEP 3: Get session and payment methods (you already have this)
        const [sessionResponse, methodsResponse] = await Promise.all([initiateMyFatoorahSession(userId), initiateMyFatoorahPayment(finalAmount, currency)]);

        // ✅ STEP 4: Return INCLUDING invoiceId
        return {
            classPaymentId: classPayment._id,
            invoiceId: invoiceResponse.Data.InvoiceId, // ← ADD THIS
            amount: finalAmount,
            currency: currency,
            sessionId: sessionResponse?.Data?.SessionId,
            countryCode: sessionResponse?.Data?.CountryCode,
            paymentMethods: methodsResponse?.Data?.PaymentMethods,
        };
    } catch (error: any) {
        classPayment.status = "FAILED";
        await classPayment.save();
        throw new ApiError(httpStatus.BAD_REQUEST, error.message || "Failed to initiate mobile session");
    }
};

/**
 * Verify payment status (usually called from success callback or webhook)
 */
const verifyClassPayment = async (internalPaymentId: string) => {
    // 1. Find the class payment record by our internal ID
    const classPayment = await ClassPaymentModel.findById(internalPaymentId);
    if (!classPayment) {
        throw new ApiError(httpStatus.NOT_FOUND, "Payment record not found");
    }

    // 2. If already paid, return it immediately
    if (classPayment.status === "PAID") {
        return classPayment;
    }

    // 3. Get status from MyFatoorah using the InvoiceId we stored
    const statusResponse = await getMyFatoorahPaymentStatus(classPayment.invoiceId as string, "InvoiceId");

    if (!statusResponse.IsSuccess) {
        throw new ApiError(httpStatus.BAD_GATEWAY, "Failed to fetch payment status from MyFatoorah");
    }

    const invoiceData = statusResponse.Data;
    const invoiceStatus = invoiceData.InvoiceStatus;
    const transactionStatus = invoiceData.InvoiceTransactions?.[0]?.TransactionStatus;

    // 4. Check for multiple success statuses ("Paid", "SUCCESS", "Succeeded", "Captured")
    const isPaid = invoiceStatus === "Paid" || transactionStatus === "SUCCESS" || transactionStatus === "Succeeded" || transactionStatus === "Captured";

    if (isPaid) {
        classPayment.status = "PAID";
        classPayment.paymentId = invoiceData.InvoiceTransactions?.[0]?.PaymentId || classPayment.paymentId;
        classPayment.transactionId = invoiceData.InvoiceTransactions?.[0]?.TransactionId || classPayment.transactionId;
        await classPayment.save();

        // Add balance to teacher (use teacherFee, not amount!)
        await UserModel.findByIdAndUpdate(classPayment.teacher, {
            $inc: { balance: classPayment.teacherFee },
        });

        // Increment enrolledStudents for regular classes
        if (classPayment.classType === "CLASS") {
            await ClassModel.findByIdAndUpdate(classPayment.classId, {
                $inc: { enrolledStudents: 1 },
            });
        }

        // If it's an hourly class related to an offer, complete the offer in messages
        if (classPayment.classType === "HOURLY_CLASS" && classPayment.messageId) {
            try {
                await completeOffer(classPayment.messageId.toString());
            } catch (err) {
                console.error("Failed to complete offer message after payment:", err);
            }
        }
    } else if (invoiceStatus === "Failed" || transactionStatus === "Failed") {
        classPayment.status = "FAILED";
        await classPayment.save();
    }

    return classPayment;
};

/**
 * Get student's enrolled classes
 */
const getStudentClasses = async (studentId: string, query: any) => {
    const { page = 1, limit = 10 } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const filters: any = {
        student: new Types.ObjectId(studentId),
        status: "PAID",
    };

    const result = await ClassPaymentModel.find(filters).populate("teacher", "name email profileImage").populate("slotId").sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean();

    // Dynamically populate class details based on classType
    const populatedResult = await Promise.all(
        result.map(async (item: any) => {
            if (item.classType === "CLASS") {
                item.classDetails = await ClassModel.findById(item.classId).select("subject level curriculum price images");
            } else {
                item.classDetails = await HourlyClassModel.findById(item.classId).select("subjects curriculum pricePerHour description");
            }
            return item;
        }),
    );

    const total = await ClassPaymentModel.countDocuments(filters);
    return {
        data: populatedResult,
        meta: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) },
    };
};

/**
 * Get teacher's classes/bookings
 */
const getTeacherClasses = async (teacherId: string, query: any) => {
    const { page = 1, limit = 10 } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const filters: any = {
        teacher: new Types.ObjectId(teacherId),
        status: "PAID",
    };

    const result = await ClassPaymentModel.find(filters).populate("student", "name email profileImage").populate("slotId").sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean();

    const populatedResult = await Promise.all(
        result.map(async (item: any) => {
            if (item.classType === "CLASS") {
                item.classDetails = await ClassModel.findById(item.classId).select("subject level curriculum price images");
            } else {
                item.classDetails = await HourlyClassModel.findById(item.classId).select("subjects curriculum pricePerHour description");
            }
            return item;
        }),
    );

    const total = await ClassPaymentModel.countDocuments(filters);
    return {
        data: populatedResult,
        meta: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) },
    };
};

/**
 * Get hourly class teacher payments (all, previous, upcoming)
 */
const getHourlyClassTeacherPayments = async (teacherId: string, query: any) => {
    const { page = 1, limit = 10, timeframe = "all" } = query;
    const skip = (Number(page) - 1) * Number(limit);
    const now = new Date();

    const filters: any = {
        teacher: new Types.ObjectId(teacherId),
        status: "PAID",
        classType: "HOURLY_CLASS",
    };

    const pipeline: any[] = [
        { $match: filters },
        {
            $lookup: {
                from: "slots",
                localField: "slotId",
                foreignField: "_id",
                as: "slotDetails",
            },
        },
        { $unwind: "$slotDetails" },
        {
            $addFields: {
                slotDateTime: {
                    $dateFromParts: {
                        year: { $year: "$slotDetails.date" },
                        month: { $month: "$slotDetails.date" },
                        day: { $dayOfMonth: "$slotDetails.date" },
                        hour: { $toInt: { $arrayElemAt: [{ $split: ["$slotDetails.startTime", ":"] }, 0] } },
                        minute: { $toInt: { $arrayElemAt: [{ $split: ["$slotDetails.startTime", ":"] }, 1] } },
                    },
                },
            },
        },
    ];

    if (timeframe === "previous") {
        pipeline.push({ $match: { slotDateTime: { $lt: now } } });
    } else if (timeframe === "upcoming") {
        pipeline.push({ $match: { slotDateTime: { $gte: now } } });
    }

    // Clone pipeline for count before pagination
    const countPipeline = [...pipeline, { $count: "total" }];

    pipeline.push({ $sort: { slotDateTime: timeframe === "upcoming" ? 1 : -1 } });
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: Number(limit) });

    // Join with student
    pipeline.push(
        {
            $lookup: {
                from: "users",
                localField: "student",
                foreignField: "_id",
                as: "studentData",
            },
        },
        { $unwind: "$studentData" },
        {
            $addFields: {
                student: {
                    _id: "$studentData._id",
                    name: "$studentData.name",
                    email: "$studentData.email",
                    profileImage: "$studentData.profileImage",
                },
            },
        },
    );

    // Join with HourlyClass details
    pipeline.push(
        {
            $lookup: {
                from: "hourlyclasses",
                localField: "classId",
                foreignField: "_id",
                as: "hourlyClassData",
            },
        },
        { $unwind: "$hourlyClassData" },
        {
            $addFields: {
                classDetails: {
                    subjects: "$hourlyClassData.subjects",
                    curriculum: "$hourlyClassData.curriculum",
                    pricePerHour: "$hourlyClassData.pricePerHour",
                    description: "$hourlyClassData.description",
                },
            },
        },
    );

    // Cleanup extra fields from lookup
    pipeline.push({
        $project: {
            studentData: 0,
            hourlyClassData: 0,
        },
    });

    const [result, totalResult] = await Promise.all([ClassPaymentModel.aggregate(pipeline), ClassPaymentModel.aggregate(countPipeline)]);

    const total = totalResult.length > 0 ? totalResult[0].total : 0;

    return {
        data: result,
        meta: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) },
    };
};

/**
 * Get hourly class student payments (all, previous, upcoming)
 */
const getHourlyClassStudentPayments = async (studentId: string, query: any) => {
    const { page = 1, limit = 10, timeframe = "all" } = query;
    const skip = (Number(page) - 1) * Number(limit);
    const now = new Date();

    const filters: any = {
        student: new Types.ObjectId(studentId),
        status: "PAID",
        classType: "HOURLY_CLASS",
    };

    const pipeline: any[] = [
        { $match: filters },
        {
            $lookup: {
                from: "slots",
                localField: "slotId",
                foreignField: "_id",
                as: "slotDetails",
            },
        },
        { $unwind: "$slotDetails" },
        {
            $addFields: {
                slotDateTime: {
                    $dateFromParts: {
                        year: { $year: "$slotDetails.date" },
                        month: { $month: "$slotDetails.date" },
                        day: { $dayOfMonth: "$slotDetails.date" },
                        hour: { $toInt: { $arrayElemAt: [{ $split: ["$slotDetails.startTime", ":"] }, 0] } },
                        minute: { $toInt: { $arrayElemAt: [{ $split: ["$slotDetails.startTime", ":"] }, 1] } },
                    },
                },
            },
        },
    ];

    if (timeframe === "previous") {
        pipeline.push({ $match: { slotDateTime: { $lt: now } } });
    } else if (timeframe === "upcoming") {
        pipeline.push({ $match: { slotDateTime: { $gte: now } } });
    }

    // Clone pipeline for count before pagination
    const countPipeline = [...pipeline, { $count: "total" }];

    pipeline.push({ $sort: { slotDateTime: timeframe === "upcoming" ? 1 : -1 } });
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: Number(limit) });

    // Join with teacher
    pipeline.push(
        {
            $lookup: {
                from: "users",
                localField: "teacher",
                foreignField: "_id",
                as: "teacherData",
            },
        },
        { $unwind: "$teacherData" },
        {
            $addFields: {
                teacher: {
                    _id: "$teacherData._id",
                    name: "$teacherData.name",
                    email: "$teacherData.email",
                    profileImage: "$teacherData.profileImage",
                },
            },
        },
    );

    // Join with HourlyClass details
    pipeline.push(
        {
            $lookup: {
                from: "hourlyclasses",
                localField: "classId",
                foreignField: "_id",
                as: "hourlyClassData",
            },
        },
        { $unwind: "$hourlyClassData" },
        {
            $addFields: {
                classDetails: {
                    subjects: "$hourlyClassData.subjects",
                    curriculum: "$hourlyClassData.curriculum",
                    pricePerHour: "$hourlyClassData.pricePerHour",
                    description: "$hourlyClassData.description",
                },
            },
        },
    );

    // Cleanup extra fields from lookup
    pipeline.push({
        $project: {
            teacherData: 0,
            hourlyClassData: 0,
        },
    });

    const [result, totalResult] = await Promise.all([ClassPaymentModel.aggregate(pipeline), ClassPaymentModel.aggregate(countPipeline)]);

    const total = totalResult.length > 0 ? totalResult[0].total : 0;

    return {
        data: result,
        meta: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) },
    };
};

export const classPaymentService = {
    initiateClassPayment,
    initiateMobileClassPayment,
    verifyClassPayment,
    getStudentClasses,
    getTeacherClasses,
    getHourlyClassTeacherPayments,
    getHourlyClassStudentPayments,
};
