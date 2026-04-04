import axios from "axios";
import config from "../../config";

const MYFATOORAH_API_URL = config.myfatoorah.base_url;
const MYFATOORAH_TOKEN = config.myfatoorah.api_key;

/**
 * Execute payment via MyFatoorah
 */
export const executeMyFatoorahPayment = async (data: {
    amount: number;
    currency: string;
    customerName: string;
    customerEmail: string;
    successUrl: string;
    errorUrl: string;
    metadata?: any;
}) => {
    try {
        const response = await axios.post(
            `${MYFATOORAH_API_URL}/v2/ExecutePayment`,
            {
                InvoiceValue: data.amount,
                DisplayCurrencyIso: data.currency,
                CustomerName: data.customerName,
                CustomerEmail: data.customerEmail,
                CallBackUrl: data.successUrl,
                ErrorUrl: data.errorUrl,
                UserDefinedField: JSON.stringify(data.metadata),
                Language: "en",
            },
            {
                headers: {
                    Authorization: `Bearer ${MYFATOORAH_TOKEN}`,
                    "Content-Type": "application/json",
                },
            }
        );

        return response.data;
    } catch (error: any) {
        console.error("MyFatoorah ExecutePayment Error:", error.response?.data || error.message);
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
            }
        );

        return response.data;
    } catch (error: any) {
        console.error("MyFatoorah GetPaymentStatus Error:", error.response?.data || error.message);
        throw error;
    }
};
