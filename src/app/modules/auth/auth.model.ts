import mongoose, { Schema } from "mongoose";
import { User } from "./auth.interface";

const UserSchema = new Schema<User>(
    {
        name: {
            type: String,
            required: [true, "Name is required"],
            trim: true,
        },

        email: {
            type: String,
            required: [true, "Email is required"],
            lowercase: true,
            trim: true,
            match: [/.+\@.+\..+/, "Please enter a valid email address"],
        },

        password: {
            type: String,
            required: [true, "Password is required"],
        },

        role: {
            type: String,
            enum: ["SUPER_ADMIN", "TEACHER", "STUDENT", "ADMIN", "GUEST"],
            default: "STUDENT",
            required: true,
        },

        phone: {
            type: String,
        },

        location: {
            lat: { type: Number },
            lng: { type: Number },
        },

        language: {
            type: String,
        },

        address: {
            street: String,
            city: String,
            state: String,
            zipCode: String,
            country: String,
        },

        isActive: {
            type: Boolean,
            default: true,
        },

        isEmailVerified: {
            type: Boolean,
            default: false,
        },

        lastLogin: {
            type: Date,
        },

        // Teacher approval workflow
        teacherApprovalStatus: {
            type: String,
            enum: ["PENDING", "APPROVED", "REJECTED", "BLOCKED"],
        },

        approvedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },

        approvalDate: {
            type: Date,
        },

        availabilityLocation: {
            address: String,
            lat: Number,
            lng: Number,
            radiusKm: Number,
        },

        resetPasswordOtp: String,
        resetPasswordOtpExpiry: Date,
        resetPasswordToken: String,
        resetPasswordTokenExpiry: Date,

        verificationToken: String,
        verificationExpiry: Date,

        pendingEmail: String,
        emailVerificationToken: String,
        emailVerificationExpiry: Date,
    },
    {
        timestamps: true,
        versionKey: false,

        toJSON: {
            transform(doc, ret: Partial<User>) {
                delete ret.password;
                delete ret.resetPasswordOtp;
                delete ret.resetPasswordOtpExpiry;
                delete ret.resetPasswordToken;
                delete ret.resetPasswordTokenExpiry;
                delete ret.verificationToken;
                delete ret.verificationExpiry;
                delete ret.emailVerificationToken;
                delete ret.emailVerificationExpiry;
                delete ret.pendingEmail;

                return ret;
            },
        },
    },
);

/*
|--------------------------------------------------------------------------
| Index Strategy (Production Safe)
|--------------------------------------------------------------------------
*/

// Authentication lookup
UserSchema.index({ email: 1 }, { unique: true });

UserSchema.index({ role: 1 });
UserSchema.index({ isActive: 1 });

UserSchema.index({ isEmailVerified: 1 });

// Token lookup indexes (important for auth flows)
UserSchema.index({ resetPasswordToken: 1 });
UserSchema.index({ verificationToken: 1 });
UserSchema.index({ emailVerificationToken: 1 });

// Activity tracking optimization
UserSchema.index({ lastLogin: -1 });

export const UserModel = mongoose.model<User>("User", UserSchema);
