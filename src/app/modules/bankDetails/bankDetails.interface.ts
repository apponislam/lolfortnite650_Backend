import { Types } from "mongoose";

export interface IBankAccount {
    _id?: Types.ObjectId;
    userId: Types.ObjectId;

    accountHolderName: string;
    bankName: string;
    accountNumber: string;

    routingNumber?: string;
    branchName?: string;

    swiftCode?: string;
    iban?: string;
    country?: string;

    bankAddress?: string;
    beneficiaryAddress?: string;

    isVerified: boolean;
    isDefault: boolean;

    createdAt?: Date;
    updatedAt?: Date;
}
