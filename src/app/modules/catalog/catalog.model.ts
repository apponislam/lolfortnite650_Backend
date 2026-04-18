import { Schema, model } from "mongoose";
import { ICatalog } from "./catalog.interface";

const catalogSchema = new Schema<ICatalog>(
    {
        type: {
            type: String,
            enum: ["subject", "level", "curriculum"],
            required: [true, "Type is required"],
            index: true,
        },
        name: {
            type: String,
            required: [true, "Name is required"],
            trim: true,
            index: true,
        },
        status: {
            type: String,
            enum: ["active", "inactive"],
            default: "active",
            index: true,
        },
        isDeleted: {
            type: Boolean,
            default: false,
            index: true,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    },
);

catalogSchema.index({ type: 1, name: 1, isDeleted: 1 }, { unique: true });

export const CatalogModel = model<ICatalog>("Catalog", catalogSchema);
