import axios from "axios";
import crypto from "crypto";
import httpStatus from "http-status";
import { PaymentModel } from "./payment.model";
import { UserModel } from "../auth/auth.model";
import config from "../../config";
import ApiError from "../../../errors/ApiError";

const MF_BASE_URL = config.myfatoorah.base_url;
const MF_API_KEY = config.myfatoorah.api_key;

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

const makeRefund = async (invoiceId: string, amount: number) => {
    try {
        console.log("Making refund for:", { invoiceId, amount });

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
        console.log("MyFatoorah response:", data);

        if (data.IsSuccess) {
            const payment = await PaymentModel.findOne({ invoiceId });
            if (payment) {
                payment.status = "CANCELED";
                await payment.save();
            }
            return data.Data;
        } else {
            // Log the actual validation error
            if (data.ValidationErrors && data.ValidationErrors.length > 0) {
                console.error("Validation Error Details:", JSON.stringify(data.ValidationErrors, null, 2));
                throw new ApiError(httpStatus.BAD_REQUEST, data.ValidationErrors[0].Error || data.Message);
            }
            throw new ApiError(httpStatus.BAD_REQUEST, data.Message || "Failed to make refund");
        }
    } catch (error: any) {
        // If it's already an ApiError, rethrow it
        if (error instanceof ApiError) {
            throw error;
        }

        console.error("Full error:", {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status,
        });

        // Handle validation errors from axios error
        if (error.response?.data?.ValidationErrors) {
            const validationError = error.response.data.ValidationErrors[0];
            throw new ApiError(httpStatus.BAD_REQUEST, validationError.Error || error.response.data.Message);
        }

        throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, error.response?.data?.Message || "Error communicating with MyFatoorah for refund");
    }
};

export const paymentServices = {
    initiatePayment,
    getPaymentStatus,
    makeRefund,
};
