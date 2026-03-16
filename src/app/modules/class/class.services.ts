import { Types } from "mongoose";
import httpStatus from "http-status";
import ApiError from "../../../errors/ApiError";
import { ClassModel } from "./class.model";
import { ClassStatus } from "./class.interface";

 const createClass = async (userId: string, payload: any) => {
    const data = {
        ...payload,
        createdBy: new Types.ObjectId(userId),
        status: "DRAFT" as ClassStatus,
    };

    const result = await ClassModel.create(data);
    return result;
};

 const getClasses = async (query: any = {}) => {
    const filter: any = {};
    if (query.status) filter.status = query.status;
    if (query.classType) filter.classType = query.classType;
    if (query.subject) filter.subject = { $regex: query.subject, $options: "i" };

    const result = await ClassModel.find(filter).sort({ createdAt: -1 });
    return result;
};

 const getClassById = async (classId: string) => {
    const result = await ClassModel.findById(classId);
    if (!result) throw new ApiError(httpStatus.NOT_FOUND, "Class not found");
    return result;
};

 const updateClass = async (classId: string, userId: string, payload: any) => {
    const cls = await ClassModel.findById(classId);
    if (!cls) throw new ApiError(httpStatus.NOT_FOUND, "Class not found");

    if (cls.createdBy.toString() !== userId) {
        throw new ApiError(httpStatus.FORBIDDEN, "Only the creator can update this class");
    }

    Object.assign(cls, payload);
    await cls.save();
    return cls;
};

 const deleteClass = async (classId: string, userId: string, role?: string) => {
    const cls = await ClassModel.findById(classId);
    if (!cls) throw new ApiError(httpStatus.NOT_FOUND, "Class not found");

    if (cls.createdBy.toString() !== userId && role !== "ADMIN" && role !== "SUPER_ADMIN") {
        throw new ApiError(httpStatus.FORBIDDEN, "Not authorized to delete this class");
    }

    await ClassModel.deleteOne({ _id: classId });
    return;
};

 const submitForReview = async (classId: string, userId: string) => {
    const cls = await ClassModel.findById(classId);
    if (!cls) throw new ApiError(httpStatus.NOT_FOUND, "Class not found");

    if (cls.createdBy.toString() !== userId) {
        throw new ApiError(httpStatus.FORBIDDEN, "Only the creator can submit for review");
    }

    cls.status = "PENDING";
    await cls.save();
    return cls;
};

 const setClassStatus = async (classId: string, status: ClassStatus) => {
    const cls = await ClassModel.findById(classId);
    if (!cls) throw new ApiError(httpStatus.NOT_FOUND, "Class not found");

    cls.status = status;
    await cls.save();
    return cls;
};

export const classServices = {
    createClass,
    getClasses,
    getClassById,
    updateClass,
    deleteClass,
    submitForReview,
    setClassStatus,
};
