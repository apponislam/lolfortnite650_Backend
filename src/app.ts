import express, { Application, Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import notFound from "./errors/notFound";
import globalErrorHandler from "./errors/globalErrorhandler";
import router from "./app/routes";
import { ZoomWebhook } from "./app/modules/zoom/zoom.webhook";
import { ClassPaymentWebhookControllers } from "./app/modules/classpayments/classpayments.webhook";

const app: Application = express();

app.post("/api/v1/class-payments/webhook", express.raw({ type: "application/json" }), ClassPaymentWebhookControllers.handleMyFatoorahWebhook);
// app.post("/api/v1/payments/webhook", express.raw({ type: "application/json" }), paymentWebhook);
app.post("/api/v1/zoom/webhook", express.raw({ type: "application/json" }), ZoomWebhook);

const corsOptions = {
    origin: ["http://localhost:3000", "http://localhost:3001", "http://localhost:3002", "http://10.10.7.58:3000", "http://10.10.7.58:3001", "http://10.10.7.58:3050"],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
};

app.use(cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.get("/", (req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, "../public/index.html"));
});

app.use("/api/v1", router);

app.use(notFound);
app.use(globalErrorHandler);

export default app;
