import express from "express";
import { authRoutes } from "../modules/auth/auth.routes";
import { ClassRoutes } from "../modules/class/class.routes";
import { publicRoutes } from "../modules/public/public.routes";
import { bankDetailsRoutes } from "../modules/bankDetails/bankDetails.routes";
import { faqRoutes } from "../modules/faq/faq.routes";
import { contactRoutes } from "../modules/contact/contact.routes";
import { paymentRoutes } from "../modules/payment/payment.routes";
import { cardRoutes } from "../modules/card/card.routes";

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
    {
        path: "/contact",
        route: contactRoutes,
    },
    {
        path: "/payments",
        route: paymentRoutes,
    },
    {
        path: "/cards",
        route: cardRoutes,
    },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
