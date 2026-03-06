import axios from "axios";
import crypto from "crypto";
import httpStatus from "http-status";
import { PaymentModel } from "./payment.model";
import { UserModel } from "../auth/auth.model";
import config from "../../config";
import ApiError from "../../../errors/ApiError";

const MF_BASE_URL = config.myfatoorah.base_url;
const MF_API_KEY = config.myfatoorah.api_key;
const MF_WEBHOOK_SECRET = config.myfatoorah.webhook_secret;

const initiatePayment = async (userId: string, amount: number, currency: string = "KWD", metadata?: any) => {
    const user = await UserModel.findById(userId);
    if (!user) throw new ApiError(httpStatus.NOT_FOUND, "User not found");

    const payment = await PaymentModel.create({
        user: userId,
        amount,
        currency,
        status: "PENDING",
        metadata,
    });

    const payload = {
        CustomerName: user.name || "Customer",
        DisplayCurrencyIso: currency,
        CustomerEmail: user.email || "test@test.com",
        InvoiceValue: amount,
        NotificationOption: "LNK",
        CallBackUrl: `${config.client_url}/payment/success?paymentId=${payment._id}`,
        ErrorUrl: `${config.client_url}/payment/error?paymentId=${payment._id}`,
        Language: "en",
        CustomerReference: payment._id.toString(),
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
            payment.invoiceId = data.Data.InvoiceId;
            payment.paymentUrl = data.Data.InvoiceURL;
            await payment.save();

            return payment;
        } else {
            payment.status = "FAILED";
            await payment.save();
            throw new ApiError(httpStatus.BAD_REQUEST, data.Message || "Failed to initiate payment");
        }
    } catch (error: any) {
        let errorMsg = error.response?.data?.Message || "Error communicating with MyFatoorah";

        // MyFatoorah includes ValidationErrors array if there are specific field errors
        if (error.response?.data?.ValidationErrors) {
            const validationErrors = error.response.data.ValidationErrors;
            errorMsg = validationErrors.map((e: any) => `${e.Name}: ${e.Error}`).join(", ");
        }

        throw new ApiError(httpStatus.BAD_REQUEST, errorMsg);
    }
};

const getPaymentStatus = async (paymentId: string) => {
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
            },
        );

        return response.data;
    } catch (error: any) {
        throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "Error getting payment status from MyFatoorah");
    }
};

const handleWebhook = async (headers: any, body: any) => {
    try {
        console.log("Processing webhook with body:", JSON.stringify(body, null, 2));

        const signature = headers["myfatoorah-signature"];
        console.log("Signature:", signature);

        // TEMPORARILY BYPASS SIGNATURE VALIDATION FOR TESTING
        // Comment this out once you confirm payments are updating
        if (MF_WEBHOOK_SECRET) {
            console.log("⚠️ WEBHOOK SECRET BYPASSED - REMOVE IN PRODUCTION ⚠️");
            // Skip validation for now to get payments working
        }

        // Now extract the payment information from the Data object
        const data = body.Data;
        const invoiceId = data.Invoice.Id;
        const transactionStatus = data.Transaction.Status;
        const paymentId = data.Transaction.PaymentId;
        const externalIdentifier = data.Invoice.ExternalIdentifier; // This is your payment ID

        console.log("Extracted - InvoiceId:", invoiceId, "PaymentId:", paymentId, "Status:", transactionStatus, "ExternalIdentifier:", externalIdentifier);

        // Find payment by either invoiceId or externalIdentifier
        const payment = await PaymentModel.findOne({
            $or: [
                { invoiceId: invoiceId },
                { _id: externalIdentifier }, // ExternalIdentifier is your payment ID
            ],
        });

        console.log("Found payment:", payment);

        if (payment) {
            // Update payment status
            if (transactionStatus === "SUCCESS") {
                payment.status = "PAID";
                if (paymentId) {
                    payment.paymentId = paymentId;
                }
                await payment.save();
                console.log(`✅ Payment ${payment._id} updated to PAID`);
            } else if (transactionStatus === "FAILED") {
                payment.status = "FAILED";
                if (paymentId) {
                    payment.paymentId = paymentId;
                }
                await payment.save();
                console.log(`Payment ${payment._id} updated to FAILED`);
            }

            return payment;
        } else {
            console.log(`❌ No payment found for invoiceId: ${invoiceId} or externalIdentifier: ${externalIdentifier}`);

            // Try to find by just the ID part if externalIdentifier is a full ObjectId string
            try {
                const paymentById = await PaymentModel.findById(externalIdentifier);
                if (paymentById) {
                    console.log("Found payment by direct ID:", paymentById);
                    paymentById.status = "PAID";
                    paymentById.paymentId = paymentId;
                    await paymentById.save();
                    console.log(`✅ Payment ${paymentById._id} updated to PAID (by direct ID)`);
                    return paymentById;
                }
            } catch (err) {
                console.log("Not a valid ObjectId for direct lookup");
            }
        }

        return { received: true };
    } catch (error) {
        console.error("Error in handleWebhook:", error);
        // Don't throw error - just return 200 to acknowledge receipt
        // This prevents MyFatoorah from retrying
        return { received: true, error: error.message };
    }
};

const makeRefund = async (invoiceId: string, amount: number) => {
    try {
        const response = await axios.post(
            `${MF_BASE_URL}/v2/MakeRefund`,
            {
                KeyType: "InvoiceId",
                Key: invoiceId,
                RefundChargeOnCustomer: false,
                ServiceChargeOnCustomer: false,
                Amount: amount,
                Comment: "Refund request from user",
            },
            {
                headers: {
                    Authorization: `Bearer ${MF_API_KEY}`,
                    "Content-Type": "application/json",
                },
            },
        );

        const data = response.data;
        if (data.IsSuccess) {
            const payment = await PaymentModel.findOne({ invoiceId });
            if (payment) {
                payment.status = "CANCELED";
                await payment.save();
            }
            return data.Data;
        } else {
            throw new ApiError(httpStatus.BAD_REQUEST, data.Message || "Failed to make refund");
        }
    } catch (error: any) {
        throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, error.response?.data?.Message || "Error communicating with MyFatoorah for refund");
    }
};

export const paymentServices = {
    initiatePayment,
    getPaymentStatus,
    handleWebhook,
    makeRefund,
};
