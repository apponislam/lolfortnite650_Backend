import express from "express";
import auth from "../../middlewares/auth";
import authorize from "../../middlewares/authorized";
import { catalogControllers } from "./catalog.controllers";

const router = express.Router();

/**
 * Public routes
 */
router.get("/type/:type", catalogControllers.getCatalogsByType);

/**
 * Admin protected routes
 */
router.get("/admin", auth, authorize(["ADMIN", "SUPER_ADMIN"]), catalogControllers.getAllCatalogs);
router.post("/create", auth, authorize(["ADMIN", "SUPER_ADMIN"]), catalogControllers.createCatalog);
router.patch("/update/:id", auth, authorize(["ADMIN", "SUPER_ADMIN"]), catalogControllers.updateCatalog);
router.delete("/delete/:id", auth, authorize(["ADMIN", "SUPER_ADMIN"]), catalogControllers.deleteCatalog);

export const CatalogRoutes = router;
