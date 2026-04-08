import axios from "axios";
import config from "../../config";

const MYFATOORAH_API_URL = config.myfatoorah.base_url;
const MYFATOORAH_TOKEN = config.myfatoorah.api_key;

/**
 * Execute payment via MyFatoorah
 */
export const executeMyFatoorahPayment = async (data: { amount: number; currency: string; customerName: string; customerEmail: string; successUrl: string; errorUrl: string; customerReference?: string; userDefinedField?: string; metadata?: any }) => {
    try {
        const response = await axios.post(
            `${MYFATOORAH_API_URL}/v2/SendPayment`,
            {
                InvoiceValue: data.amount,
                DisplayCurrencyIso: data.currency,
                CustomerName: data.customerName || "Customer",
                CustomerEmail: data.customerEmail || "test@test.com",
                CallBackUrl: data.successUrl,
                ErrorUrl: data.errorUrl,
                CustomerReference: data.customerReference,
                UserDefinedField: data.userDefinedField || (data.metadata ? JSON.stringify(data.metadata) : undefined),
                Language: "en",
                NotificationOption: "LNK",
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
