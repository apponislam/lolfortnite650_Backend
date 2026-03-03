import mongoose, { Schema, Document } from "mongoose";
import { IContactUs } from "./contact.interface";

export interface ContactDocument extends Omit<IContactUs, "_id">, Document {}

const ContactSchema = new Schema<ContactDocument>(
    {
        customerServiceEmail: { type: String, trim: true },
        customerServicePhone: { type: String, trim: true },
        whatsapp: { type: String, trim: true },
        website: { type: String, trim: true },
        facebook: { type: String, trim: true },
        twitter: { type: String, trim: true },
        instagram: { type: String, trim: true },
        address: { type: String, trim: true },
    },
    {
        timestamps: true,
        versionKey: false,
    },
);

export const ContactModel = mongoose.model<ContactDocument>("Contact", ContactSchema);
