import { Types } from "mongoose";

export interface IBankAccount {
  _id?: string;

  userId: Types.ObjectId;

  accountHolderName: string;
  bankName: string;
  accountNumber: string;

  routingNumber?: string;
  branchName?: string;

  swiftCode?: string;
  iban?: string;
  country?: string;

  isVerified: boolean;
  isDefault: boolean;

  addedAt: Date;
  updatedAt: Date;
}