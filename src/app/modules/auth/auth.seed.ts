import bcrypt from "bcrypt";
import { UserModel } from "./auth.model";
import config from "../../config";

export const seedManager = async () => {
    try {
        const managerExists = await UserModel.findOne({ role: "MANAGER" });

        if (!managerExists) {
            const hashedPassword = await bcrypt.hash(config.superAdminPassword as string, Number(config.bcrypt_salt_rounds));

            const manager = {
                firstName: "Super",
                lastName: "Admin",
                email: config.superAdminEmail,
                password: hashedPassword,
                role: "MANAGER",
                phone: "0000000000",
                location: "Headquarters",
                isActive: true,
                isEmailVerified: true,
            };

            await UserModel.create(manager);
            console.log("✅ Manager created:", config.superAdminEmail);
        }
    } catch (error) {
        console.error("Error seeding manager:", error);
    }
};
