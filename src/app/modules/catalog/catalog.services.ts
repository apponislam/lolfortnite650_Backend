import httpStatus from "http-status";
import ApiError from "../../../errors/ApiError";
import { ICatalog, CatalogType } from "./catalog.interface";
import { CatalogModel } from "./catalog.model";

/**
 * Create a new catalog item
 */
const createCatalog = async (payload: ICatalog) => {
    // Check if name already exists for this type (not deleted)
    const existing = await CatalogModel.findOne({
        type: payload.type,
        name: payload.name,
        isDeleted: false,
    });

    if (existing) {
        throw new ApiError(httpStatus.BAD_REQUEST, `A ${payload.type} with name "${payload.name}" already exists`);
    }

    const result = await CatalogModel.create(payload);
    return result;
};

/**
 * Update an existing catalog item
 */
const updateCatalog = async (id: string, payload: Partial<ICatalog>) => {
    const existingItem = await CatalogModel.findById(id);
    if (!existingItem || existingItem.isDeleted) {
        throw new ApiError(httpStatus.NOT_FOUND, "Catalog item not found");
    }

    // If name is being changed, check for duplicates
    if (payload.name && payload.name !== existingItem.name) {
        const duplicate = await CatalogModel.findOne({
            type: existingItem.type,
            name: payload.name,
            isDeleted: false,
        });

        if (duplicate) {
            throw new ApiError(httpStatus.BAD_REQUEST, `A ${existingItem.type} with name "${payload.name}" already exists`);
        }
    }

    const result = await CatalogModel.findByIdAndUpdate(id, payload, {
        new: true,
        runValidators: true,
    });
    return result;
};

/**
 * Soft delete a catalog item
 */
const deleteCatalog = async (id: string) => {
    const existingItem = await CatalogModel.findById(id);
    if (!existingItem || existingItem.isDeleted) {
        throw new ApiError(httpStatus.NOT_FOUND, "Catalog item not found");
    }

    const result = await CatalogModel.findByIdAndUpdate(id, { $set: { isDeleted: true } }, { new: true });
    return result;
};

/**
 * Get catalog items by type (publicly available)
 */
const getCatalogsByType = async (type: CatalogType) => {
    const result = await CatalogModel.find({
        type,
        status: "active",
        isDeleted: false,
    }).sort({ name: 1 });
    return result;
};

/**
 * Get all catalogs (for admin)
 */
const getAllCatalogs = async (query: any) => {
    const { type, status, page = 1, limit = 10 } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const filters: any = { isDeleted: false };
    if (type) filters.type = type;
    if (status) filters.status = status;

    const result = await CatalogModel.find(filters).sort({ type: 1, name: 1 }).skip(skip).limit(Number(limit));

    const total = await CatalogModel.countDocuments(filters);

    return {
        data: result,
        meta: {
            page: Number(page),
            limit: Number(limit),
            total,
            totalPages: Math.ceil(total / Number(limit)),
        },
    };
};

export const catalogService = {
    createCatalog,
    updateCatalog,
    deleteCatalog,
    getCatalogsByType,
    getAllCatalogs,
};
