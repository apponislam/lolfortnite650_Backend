import axios from "axios";
import crypto from "crypto";
import { PaymentModel } from "./payment.model";
import { UserModel } from "../auth/auth.model";
import config from "../../config";
import ApiError from "../../../errors/ApiError";

const MF_BASE_URL = config.myfatoorah.base_url;
const MF_API_KEY = config.myfatoorah.api_key;
const MF_WEBHOOK_SECRET = config.myfatoorah.webhook_secret;

export const paymentServices = {
    // 1. Initialize Payment
    async initiatePayment(userId: string, amount: number, currency: string = "KWD", metadata?: any) {
        // Fetch User Info
        const user = await UserModel.findById(userId);
        if (!user) throw new ApiError(404, "User not found");

        const payment = await PaymentModel.create({
            user: userId,
            amount,
            currency,
            status: "PENDING",
            metadata,
        });

        // Prepare SendPayment Request
        const payload = {
            CustomerName: user.name,
            DisplayCurrencyIso: currency,
            CustomerEmail: user.email,
            InvoiceValue: amount,
            CallBackUrl: `${config.client_url}/payment/success?paymentId=${payment._id}`,
            ErrorUrl: `${config.client_url}/payment/error?paymentId=${payment._id}`,
            Language: "en",
            CustomerReference: payment._id.toString(),
            // PaymentMethodId: 2 // Assuming 2 is Visa/Mastercard, but omitting it will show all methods
        };

        try {
            const response = await axios.post(`${MF_BASE_URL}/v2/SendPayment`, payload, {
                headers: {
                    Authorization: `Bearer ${MF_API_KEY}`,
                    "Content-Type": "application/json",
                },
            });

            const data = response.data;
            if (data.IsSuccess) {
                payment.invoiceId = data.Data.InvoiceId; // Store InvoiceId
                payment.paymentUrl = data.Data.InvoiceURL;
                await payment.save();

                return payment;
            } else {
                payment.status = "FAILED";
                await payment.save();
                throw new ApiError(400, data.Message || "Failed to initiate payment");
            }
        } catch (error: any) {
             throw new ApiError(500, error.response?.data?.Message || "Error communicating with MyFatoorah");
        }
    },

    // 2. Fetch Payment Status
    async getPaymentStatus(paymentId: string) {
        try {
            const response = await axios.post(
                `${MF_BASE_URL}/v2/GetPaymentStatus`,
                {
                    KeyType: "PaymentId",
                    Key: paymentId,
                },
                {
                    headers: {
                        Authorization: `Bearer ${MF_API_KEY}`,
                        "Content-Type": "application/json",
                    },
                }
            );

            return response.data;
        } catch (error: any) {
            throw new ApiError(500, "Error getting payment status from MyFatoorah");
        }
    },

    // 3. Webhook handler function
    async handleWebhook(headers: any, body: any) {
        const signature = headers["myfatoorah-signature"];

        if (!signature && MF_WEBHOOK_SECRET) {
            // MyFatoorah sends webhook with 'MyFatoorah-Signature' header
            throw new ApiError(400, "Missing MyFatoorah Webhook Signature");
        }

        if (MF_WEBHOOK_SECRET && signature) {
             const data = body.Data;

             // Order parameters alphabetically to create signature string
             const keys = Object.keys(data).sort();
             const signatureString = keys.map((k) => `${k}=${data[k]}`).join(",");

             const expectedSignature = crypto
                 .createHmac("sha256", MF_WEBHOOK_SECRET)
                 .update(signatureString)
                 .digest("base64");

             if (signature !== expectedSignature) {
                 throw new ApiError(400, "Invalid Webhook Signature");
             }
        }

        // Processing payment event
        if (body.Event === "TransactionsStatusChanged") {
            const invoiceId = body.Data.InvoiceId;
            const transactionStatus = body.Data.TransactionStatus; // e.g., "SUCCESS", "FAILED"
            const paymentIdFromWebhook = body.Data.PaymentId;

            // Find payment in our DB
            const payment = await PaymentModel.findOne({ invoiceId: invoiceId });
            if (!payment) return null; // Or throw Error if needed
            
            if (transactionStatus === "SUCCESS") {
                payment.status = "PAID";
                payment.paymentId = paymentIdFromWebhook;
                await payment.save();
            } else if (transactionStatus === "FAILED") {
                payment.status = "FAILED";
                payment.paymentId = paymentIdFromWebhook;
                await payment.save();
            }
            
            return payment;
        }

        return null;
    },
};
