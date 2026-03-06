// src/app/modules/card/card.services.ts
import axios from "axios";
import httpStatus from "http-status";
import { CardModel } from "./card.model";
import { PaymentModel } from "../payment/payment.model";
import config from "../../config";
import ApiError from "../../../errors/ApiError";
import { ICard, IInitiateCardPayment } from "./card.interface";
import { UserModel } from "../auth/auth.model";

const MF_BASE_URL = config.myfatoorah.base_url;
const MF_API_KEY = config.myfatoorah.api_key;

const initiateCardPayment = async (userId: string, payload: IInitiateCardPayment) => {
    const { amount, currency = "KWD", cardId, saveCard, metadata } = payload;

    // Get user
    const user = await UserModel.findById(userId);
    if (!user) throw new ApiError(httpStatus.NOT_FOUND, "User not found");

    // Create payment record
    const payment = await PaymentModel.create({
        user: userId,
        amount,
        currency,
        status: "PENDING",
        metadata,
    });

    // If using saved card
    if (cardId) {
        const card = await CardModel.findOne({ _id: cardId, user: userId, isActive: true });
        if (!card) throw new ApiError(httpStatus.NOT_FOUND, "Card not found");

        // Make payment with token
        const payload = {
            PaymentMethodId: 2, // For card payments
            CustomerName: user.name || "Customer",
            DisplayCurrencyIso: currency,
            CustomerEmail: user.email,
            InvoiceValue: amount,
            CallBackUrl: `${config.client_url}/payment/success?paymentId=${payment._id}`,
            ErrorUrl: `${config.client_url}/payment/error?paymentId=${payment._id}`,
            Language: "en",
            CustomerReference: payment._id.toString(),
            Token: card.myfatoorahToken,
        };

        const response = await axios.post(`${MF_BASE_URL}/v2/ExecutePayment`, payload, {
            headers: {
                Authorization: `Bearer ${MF_API_KEY}`,
                "Content-Type": "application/json",
            },
        });

        const data = response.data;
        if (data.IsSuccess) {
            payment.invoiceId = data.Data.InvoiceId;
            payment.paymentId = data.Data.PaymentId;
            payment.status = "PAID";
            await payment.save();
            return { payment, invoiceURL: data.Data.InvoiceURL };
        }
    }

    // New payment with option to save card
    const mfPayload = {
        CustomerName: user.name || "Customer",
        DisplayCurrencyIso: currency,
        CustomerEmail: user.email,
        InvoiceValue: amount,
        NotificationOption: "LNK",
        CallBackUrl: `${config.client_url}/payment/success?paymentId=${payment._id}`,
        ErrorUrl: `${config.client_url}/payment/error?paymentId=${payment._id}`,
        Language: "en",
        CustomerReference: payment._id.toString(),
        UserDefinedField: saveCard ? `CK-${userId}` : "", // For saving card
        MobileCountryCode: "+965",
        CustomerMobile: user.phone || "12345678",
    };

    const response = await axios.post(`${MF_BASE_URL}/v2/SendPayment`, mfPayload, {
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
        return {
            paymentId: payment._id,
            invoiceId: data.Data.InvoiceId,
            paymentUrl: data.Data.InvoiceURL,
        };
    }

    throw new ApiError(httpStatus.BAD_REQUEST, "Failed to initiate payment");
};

const saveCardFromPayment = async (userId: string, paymentId: string) => {
    const payment = await PaymentModel.findOne({ _id: paymentId, user: userId });
    if (!payment) throw new ApiError(httpStatus.NOT_FOUND, "Payment not found");

    // Get payment status from MyFatoorah
    const response = await axios.post(
        `${MF_BASE_URL}/v2/GetPaymentStatus`,
        {
            KeyType: "PaymentId",
            Key: payment.paymentId,
        },
        {
            headers: {
                Authorization: `Bearer ${MF_API_KEY}`,
                "Content-Type": "application/json",
            },
        },
    );

    const data = response.data.Data;

    // Check if card token exists
    if (data.CardDetails?.Token) {
        // Check if card already exists
        const existingCard = await CardModel.findOne({
            user: userId,
            myfatoorahToken: data.CardDetails.Token,
        });

        if (!existingCard) {
            const card = await CardModel.create({
                user: userId,
                myfatoorahToken: data.CardDetails.Token,
                cardLastFour: data.CardDetails.CardNumber?.slice(-4),
                cardBrand: data.CardDetails.CardBrand,
                cardExpiryMonth: data.CardDetails.ExpiryMonth,
                cardExpiryYear: data.CardDetails.ExpiryYear,
                cardHolderName: data.CardDetails.CardHolderName,
                isDefault: (await CardModel.countDocuments({ user: userId })) === 0,
            });

            return card;
        }

        return existingCard;
    }

    return null;
};

const getUserCards = async (userId: string): Promise<ICard[]> => {
    return await CardModel.find({ user: userId, isActive: true }).sort({ isDefault: -1, createdAt: -1 });
};

const deleteCard = async (userId: string, cardId: string) => {
    const card = await CardModel.findOne({ _id: cardId, user: userId });
    if (!card) throw new ApiError(httpStatus.NOT_FOUND, "Card not found");

    if (card.isDefault) {
        // Set another card as default
        const anotherCard = await CardModel.findOne({ user: userId, _id: { $ne: cardId } });
        if (anotherCard) {
            anotherCard.isDefault = true;
            await anotherCard.save();
        }
    }

    card.isActive = false;
    await card.save();

    return { success: true };
};

const setDefaultCard = async (userId: string, cardId: string) => {
    const card = await CardModel.findOne({ _id: cardId, user: userId, isActive: true });
    if (!card) throw new ApiError(httpStatus.NOT_FOUND, "Card not found");

    card.isDefault = true;
    await card.save();

    return card;
};

export const cardServices = {
    initiateCardPayment,
    saveCardFromPayment,
    getUserCards,
    deleteCard,
    setDefaultCard,
};
