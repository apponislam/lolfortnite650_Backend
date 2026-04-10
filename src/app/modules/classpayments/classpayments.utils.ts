import axios from "axios";
import config from "../../config";

const MYFATOORAH_API_URL = config.myfatoorah.base_url;
const MYFATOORAH_TOKEN = config.myfatoorah.api_key;

/**
 * Execute payment via MyFatoorah
 */
export const executeMyFatoorahPayment = async (data: { amount: number; currency: string; customerName: string; customerEmail: string; successUrl: string; errorUrl: string; customerReference?: string; userDefinedField?: string; metadata?: any }) => {
    try {
        const payload: any = {
            CustomerName: data.customerName || "Customer",
            DisplayCurrencyIso: data.currency || "KWD",
            CustomerEmail: data.customerEmail || "test@test.com",
            InvoiceValue: data.amount,
            CallBackUrl: data.successUrl,
            ErrorUrl: data.errorUrl,
            Language: "en",
            NotificationOption: "LNK",
        };

        if (data.customerReference) payload.CustomerReference = data.customerReference;
        if (data.userDefinedField) payload.UserDefinedField = data.userDefinedField;
        else if (data.metadata) payload.UserDefinedField = JSON.stringify(data.metadata);

        const response = await axios.post(`${MYFATOORAH_API_URL}/v2/SendPayment`, payload, {
            headers: {
                Authorization: `Bearer ${MYFATOORAH_TOKEN}`,
                "Content-Type": "application/json",
            },
        });

        return response.data;
    } catch (error: any) {
        let errorMsg = error.response?.data?.Message || "Error communicating with MyFatoorah";

        // MyFatoorah includes ValidationErrors array if there are specific field errors
        if (error.response?.data?.ValidationErrors) {
            const validationErrors = error.response.data.ValidationErrors;
            errorMsg = validationErrors.map((e: any) => `${e.Name}: ${e.Error}`).join(", ");
        }

        console.error("MyFatoorah SendPayment Error:", error.response?.data || error.message);
        throw new Error(errorMsg);
    }
};

/**
 * Initiate Session for Mobile SDK (Apple Pay / Google Pay)
 */
export const initiateMyFatoorahSession = async (customerIdentifier?: string) => {
    try {
        const payload: any = {};
        if (customerIdentifier) payload.CustomerIdentifier = customerIdentifier;

        const response = await axios.post(`${MYFATOORAH_API_URL}/v2/InitiateSession`, payload, {
            headers: {
                Authorization: `Bearer ${MYFATOORAH_TOKEN}`,
                "Content-Type": "application/json",
            },
        });

        return response.data;
    } catch (error: any) {
        console.error("MyFatoorah InitiateSession Error:", error.response?.data || error.message);
        throw error;
    }
};

/**
 * Initiate Payment to get Payment Methods (for native selection UI)
 */
export const initiateMyFatoorahPayment = async (amount: number, currency: string = "KWD") => {
    try {
        const response = await axios.post(
            `${MYFATOORAH_API_URL}/v2/InitiatePayment`,
            {
                InvoiceAmount: amount,
                CurrencyIso: currency,
            },
            {
                headers: {
                    Authorization: `Bearer ${MYFATOORAH_TOKEN}`,
                    "Content-Type": "application/json",
                },
            },
        );

        return response.data;
    } catch (error: any) {
        console.error("MyFatoorah InitiatePayment Error:", error.response?.data || error.message);
        throw error;
    }
};

/**
 * Get payment status from MyFatoorah
 */
export const getMyFatoorahPaymentStatus = async (key: string, keyType: "PaymentId" | "InvoiceId" = "PaymentId") => {
    try {
        const response = await axios.post(
            `${MYFATOORAH_API_URL}/v2/GetPaymentStatus`,
            {
                Key: key,
                KeyType: keyType,
            },
            {
                headers: {
                    Authorization: `Bearer ${MYFATOORAH_TOKEN}`,
                    "Content-Type": "application/json",
                },
            },
        );

        return response.data;
    } catch (error: any) {
        console.error("MyFatoorah GetPaymentStatus Error:", error.response?.data || error.message);
        throw error;
    }
};
