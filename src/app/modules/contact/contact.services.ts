import httpStatus from "http-status";
import ApiError from "../../../errors/ApiError";
import { ContactModel } from "./contact.model";

// Always upsert — only one contact document ever exists
const upsertContact = async (payload: any) => {
    const existing = await ContactModel.findOne();

    if (existing) {
        Object.assign(existing, payload);
        await existing.save();
        return existing;
    }

    const contact = await ContactModel.create(payload);
    return contact;
};

const getContact = async () => {
    const contact = await ContactModel.findOne();
    if (!contact) throw new ApiError(httpStatus.NOT_FOUND, "Contact information not found");
    return contact;
};

export const contactServices = {
    upsertContact,
    getContact,
};
