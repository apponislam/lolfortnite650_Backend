import { Schema, model } from "mongoose";
import { ICard } from "./card.interface";

const cardSchema = new Schema<ICard>(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        myfatoorahToken: {
            type: String,
            required: true,
        },
        cardLastFour: {
            type: String,
            required: true,
        },
        cardBrand: {
            type: String,
            required: true,
        },
        cardType: {
            type: String,
            enum: ["Credit", "Debit", "Prepaid"],
            default: "Credit",
        },
        cardExpiryMonth: {
            type: String,
            required: true,
        },
        cardExpiryYear: {
            type: String,
            required: true,
        },
        cardHolderName: {
            type: String,
            required: true,
        },
        isDefault: {
            type: Boolean,
            default: false,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        metadata: {
            type: Schema.Types.Mixed,
            default: {},
        },
    },
    {
        timestamps: true,
    },
);

// Ensure one default card per user
cardSchema.pre("save", async function () {
    if (this.isDefault) {
        await model("Card").updateMany({ user: this.user, _id: { $ne: this._id } }, { isDefault: false });
    }
});

export const CardModel = model<ICard>("Card", cardSchema);
