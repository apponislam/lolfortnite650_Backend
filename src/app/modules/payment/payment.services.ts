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
    makeRefund,
};
