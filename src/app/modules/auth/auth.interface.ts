export type UserRole = "VENDOR" | "BUYER" | "DRIVER" | "INVENTORY_MANAGER" | "PRICER" | "TREASURER" | "MANAGER" | "CLIENT" | "SALES_AGENT";

export interface User {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    role: UserRole;
    phone?: string;
    location?: string;
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
