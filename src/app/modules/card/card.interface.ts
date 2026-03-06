import { Types } from "mongoose";

export interface ICard {
    _id?: Types.ObjectId;
    user: Types.ObjectId;
    myfatoorahToken: string;
    cardLastFour: string;
    cardBrand: string;
    cardType: "Credit" | "Debit" | "Prepaid";
    cardExpiryMonth: string;
    cardExpiryYear: string;
    cardHolderName: string;
    isDefault: boolean;
    isActive: boolean;
    metadata?: Record<string, any>;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IInitiateCardPayment {
    amount: number;
    currency?: string;
    cardId?: string;
    saveCard?: boolean;
    metadata?: Record<string, any>;
}

export interface IMakeCardPayment {
    paymentId: string;
    cardId: string;
    cvv: string;
}

export interface ICardResponse {
    _id: string;
    lastFour: string;
    brand: string;
    expiryMonth: string;
    expiryYear: string;
    holderName: string;
    isDefault: boolean;
}
