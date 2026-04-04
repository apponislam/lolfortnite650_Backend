import { Types } from "mongoose";
import ApiError from "../../../errors/ApiError";
import httpStatus from "http-status";
import { ClassPaymentModel } from "./classpayments.model";
import { executeMyFatoorahPayment, getMyFatoorahPaymentStatus } from "./classpayments.utils";
import { UserModel } from "../auth/auth.model";
import { ClassModel } from "../class/class.model";
import { HourlyClassModel } from "../hourlyclasses/hourlyclass.model";
import { Slot } from "../slot/slot.model";
import { completeOffer } from "../messages/messages.services";
import config from "../../config";

/**
 * Initiate payment for a class (Regular or Hourly)
 */
export const initiateClassPayment = async (userId: string, payload: any) => {
    const { classType, classId, slotId, messageId, amount, currency = "KWD" } = payload;

    const student = await UserModel.findById(userId);
    if (!student) throw new ApiError(httpStatus.NOT_FOUND, "Student not found");

    let teacherId: Types.ObjectId | undefined;
    let finalAmount = amount;

    // Validate class and get teacher
    if (classType === "CLASS") {
        const classData = await ClassModel.findById(classId);
        if (!classData) throw new ApiError(httpStatus.NOT_FOUND, "Class not found");

        // Check if student is already enrolled
        const alreadyEnrolled = await ClassPaymentModel.findOne({
            student: userId,
            classId: classId,
            status: "PAID",
        });

        if (alreadyEnrolled) {
            throw new ApiError(httpStatus.BAD_REQUEST, "You are already enrolled in this class");
        }

        // Check if class is full
        if (classData.maxStudents && classData.enrolledStudents && classData.enrolledStudents >= classData.maxStudents) {
            throw new ApiError(httpStatus.BAD_REQUEST, "Class is already full");
        }

        teacherId = classData.createdBy;
        finalAmount = classData.price;
    } else if (classType === "HOURLY_CLASS") {
        const hourlyClass = await HourlyClassModel.findById(classId);
        if (!hourlyClass) throw new ApiError(httpStatus.NOT_FOUND, "Hourly class not found");
        teacherId = hourlyClass.createdBy;

        // If slot is provided, ensure amount is correct
        if (slotId) {
            const slotData = await Slot.findById(slotId);
            if (slotData) {
                finalAmount = hourlyClass.pricePerHour * slotData.hours;
            }
        }
    }

    if (!teacherId) throw new ApiError(httpStatus.BAD_REQUEST, "Teacher not found for this class");

    // Get teacher percentage
    const teacher = await UserModel.findById(teacherId);
    const percentage = teacher?.percentage ?? 20;

    // Calculate commission and teacher fee
    const commission = (finalAmount * percentage) / 100;
    const teacherFee = finalAmount - commission;

    // Execute MyFatoorah Payment
    const paymentResponse = await executeMyFatoorahPayment({
        amount: finalAmount,
        currency,
        customerName: student.name,
        customerEmail: student.email,
        successUrl: `${config.client_url}/payment/success`,
        errorUrl: `${config.client_url}/payment/error`,
        metadata: { classType, classId, slotId, messageId, studentId: userId, teacherId },
    });

    if (!paymentResponse.IsSuccess) {
        throw new ApiError(httpStatus.BAD_GATEWAY, "Payment initiation failed");
    }

    // Create record in ClassPayment
    const classPayment = await ClassPaymentModel.create({
        student: userId,
        teacher: teacherId,
        amount: finalAmount,
        commission,
        teacherFee,
        currency,
        status: "PENDING",
        invoiceId: paymentResponse.Data.InvoiceId,
        paymentUrl: paymentResponse.Data.PaymentURL,
        classType,
        classId,
        slotId,
        messageId,
        metadata: { ...payload, rawResponse: paymentResponse.Data },
    });

    return {
        paymentUrl: paymentResponse.Data.PaymentURL,
        invoiceId: paymentResponse.Data.InvoiceId,
        classPaymentId: classPayment._id,
    };
};

/**
 * Verify payment status (usually called from success callback or webhook)
 */
export const verifyClassPayment = async (paymentId: string) => {
    const statusResponse = await getMyFatoorahPaymentStatus(paymentId, "PaymentId");

    if (!statusResponse.IsSuccess) {
        throw new ApiError(httpStatus.BAD_GATEWAY, "Failed to fetch payment status");
    }

    const invoiceData = statusResponse.Data;
    const classPayment = await ClassPaymentModel.findOne({ invoiceId: invoiceData.InvoiceId });

    if (!classPayment) throw new ApiError(httpStatus.NOT_FOUND, "Payment record not found");

    if (invoiceData.InvoiceStatus === "Paid") {
        classPayment.status = "PAID";
        classPayment.paymentId = paymentId;
        classPayment.transactionId = invoiceData.InvoiceTransactions[0]?.TransactionId;
        await classPayment.save();

        // Add balance to teacher
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
    } else {
        classPayment.status = "FAILED";
        await classPayment.save();
    }

    return classPayment;
};

/**
 * Get student's enrolled classes
 */
export const getStudentClasses = async (studentId: string, query: any) => {
    const { page = 1, limit = 10, status } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const filters: any = { student: new Types.ObjectId(studentId) };
    if (status) filters.status = status;

    const result = await ClassPaymentModel.find(filters).populate("teacher", "name email avatar").populate("slotId").sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean();

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
export const getTeacherClasses = async (teacherId: string, query: any) => {
    const { page = 1, limit = 10, status } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const filters: any = { teacher: new Types.ObjectId(teacherId) };
    if (status) filters.status = status;

    const result = await ClassPaymentModel.find(filters).populate("student", "name email avatar").populate("slotId").sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean();

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

export const classPaymentService = {
    initiateClassPayment,
    verifyClassPayment,
    getStudentClasses,
    getTeacherClasses,
};
