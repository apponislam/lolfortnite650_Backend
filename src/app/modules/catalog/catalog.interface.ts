import { Types } from "mongoose";

export type CatalogType = "subject" | "level" | "curriculum";

export type CatalogStatus = "active" | "inactive";

export interface ICatalog {
    _id?: Types.ObjectId;
    type: CatalogType;
    name: string;
    status: CatalogStatus;
    isDeleted: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}
