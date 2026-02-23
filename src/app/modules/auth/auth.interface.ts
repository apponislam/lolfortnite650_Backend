import mongoose from "mongoose";

export type UserRole = "SUPER_ADMIN" | "TEACHER" | "STUDENT" | "ADMIN" | "GUEST";
export type TeacherApprovalStatus = "PENDING" | "APPROVED" | "REJECTED" | "BLOCKED";

export interface User {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    phone?: string;
    location?: {
        lat?: number;
        lng?: number;
    };
    language?: string;
    address?: {
        street?: string;
        city?: string;
        state?: string;
        zipCode?: string;
        country?: string;
    };
    isActive: boolean;
    isEmailVerified: boolean;
    lastLogin?: Date;

    // Teacher approval workflow
    teacherApprovalStatus?: TeacherApprovalStatus;
    approvedBy?: mongoose.Types.ObjectId;
    approvalDate?: Date;

    // Password reset fields
    resetPasswordOtp?: string;
    resetPasswordOtpExpiry?: Date;
    resetPasswordToken?: string;
    resetPasswordTokenExpiry?: Date;

    // Email verification fields (new)
    verificationToken?: string;
    verificationExpiry?: Date;

    // Email update fields
    pendingEmail?: string;
    emailVerificationToken?: string;
    emailVerificationExpiry?: Date;

    createdAt: Date;
    updatedAt: Date;
}
