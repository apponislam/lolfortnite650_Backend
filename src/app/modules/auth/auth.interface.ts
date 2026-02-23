export type UserRole = "SUPER_ADMIN" | "TEACHER" | "STUDENT" | "ADMIN" | "GUEST";

export interface User {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    phone?: string;
    location?: {
        fullAddress?: string;
        lat?: number;
        lng?: number;
    };
    isActive: boolean;
    isEmailVerified: boolean;
    lastLogin?: Date;

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
