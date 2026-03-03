import express from "express";
import { authRoutes } from "../modules/auth/auth.routes";
import { ClassRoutes } from "../modules/class/class.routes";
import { publicRoutes } from "../modules/public/public.routes";
import { bankDetailsRoutes } from "../modules/bankDetails/bankDetails.routes";
import { faqRoutes } from "../modules/faq/faq.routes";

const router = express.Router();

const moduleRoutes = [
    {
        path: "/auth",
        route: authRoutes,
    },
    {
        path: "/classes",
        route: ClassRoutes,
    },
    {
        path: "/public",
        route: publicRoutes,
    },
    {
        path: "/bank-details",
        route: bankDetailsRoutes,
    },
    {
        path: "/faqs",
        route: faqRoutes,
    },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
