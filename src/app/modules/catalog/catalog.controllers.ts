import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import { catalogService } from "./catalog.services";
import { CatalogType } from "./catalog.interface";

/**
 * Create a new catalog item
 */
const createCatalog = catchAsync(async (req: Request, res: Response) => {
    const result = await catalogService.createCatalog(req.body);

    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message: "Catalog item created successfully",
        data: result,
    });
});

/**
 * Update a catalog item
 */
const updateCatalog = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await catalogService.updateCatalog(id as string, req.body);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Catalog item updated successfully",
        data: result,
    });
});

/**
 * Soft delete a catalog item
 */
const deleteCatalog = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await catalogService.deleteCatalog(id as string);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Catalog item deleted successfully",
        data: result,
    });
});

/**
 * Get catalog items by type
 */
const getCatalogsByType = catchAsync(async (req: Request, res: Response) => {
    const { type } = req.params;
    const result = await catalogService.getCatalogsByType(type as CatalogType);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Catalog items retrieved successfully",
        data: result,
    });
});

/**
 * Get all catalogs (Admin)
 */
const getAllCatalogs = catchAsync(async (req: Request, res: Response) => {
    const result = await catalogService.getAllCatalogs(req.query);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "All catalog items retrieved successfully",
        data: result,
    });
});

export const catalogControllers = {
    createCatalog,
    updateCatalog,
    deleteCatalog,
    getCatalogsByType,
    getAllCatalogs,
};
