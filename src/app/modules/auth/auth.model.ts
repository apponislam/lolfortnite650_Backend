import mongoose, { Schema } from "mongoose";

const UserSchema = new Schema(
    {
        firstName: { type: String, required: [true, "First name is required"] },
        lastName: { type: String, required: [true, "Last name is required"] },
        email: {
            type: String,
            required: [true, "Email is required"],
            match: [/.+\@.+\..+/, "Please enter a valid email address"],
        },
        password: { type: String, required: [true, "Password is required"] },
        role: {
            type: String,
            enum: ["VENDOR", "BUYER", "DRIVER", "INVENTORY_MANAGER", "PRICER", "TREASURER", "MANAGER", "CLIENT", "SALES_AGENT"],
            required: [true, "Role is required"],
        },
        phone: { type: String },
        location: { type: String },
        isActive: { type: Boolean, default: true },
        isEmailVerified: { type: Boolean, default: false }, // Added
        lastLogin: { type: Date },

        // Password reset fields
        resetPasswordOtp: { type: String },
        resetPasswordOtpExpiry: { type: Date },
        resetPasswordToken: { type: String },
        resetPasswordTokenExpiry: { type: Date },

        // Email verification fields (added)
        verificationToken: { type: String },
        verificationExpiry: { type: Date },

        // Email update fields
        pendingEmail: { type: String },
        emailVerificationToken: { type: String },
        emailVerificationExpiry: { type: Date },
    },
    {
        timestamps: true,
        versionKey: false,
        toJSON: {
            transform(doc, ret) {
                const retObj = ret as any;
                delete retObj.password;
                delete retObj.resetPasswordOtp;
                delete retObj.resetPasswordOtpExpiry;
                delete retObj.resetPasswordToken;
                delete retObj.resetPasswordTokenExpiry;
                delete retObj.verificationToken;
                delete retObj.verificationExpiry;
                delete retObj.emailVerificationToken;
                delete retObj.emailVerificationExpiry;
                delete retObj.pendingEmail;
                return retObj;
            },
        },
    },
);

// Indexes
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ role: 1 });
UserSchema.index({ isActive: 1 });
UserSchema.index({ resetPasswordToken: 1 });
UserSchema.index({ verificationToken: 1 }); // Added
UserSchema.index({ emailVerificationToken: 1 });

export const UserModel = mongoose.model("User", UserSchema);
