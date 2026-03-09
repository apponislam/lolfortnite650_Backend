import multer, { FileFilterCallback } from "multer";
import path from "path";
import fs from "fs";
import { Request, Response, NextFunction } from "express";
import sharp from "sharp";

// Ensure upload directory exists
const profileImageDir = path.join(process.cwd(), "uploads", "profile-images");
if (!fs.existsSync(profileImageDir)) fs.mkdirSync(profileImageDir, { recursive: true });

// Multer memory storage
const storage = multer.memoryStorage();

// File filter (only allow images)
const fileFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (allowedTypes.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Profile image must be JPG, PNG, or WEBP"));
};

// Multer setup
const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// Helper to generate unique filename
const generateFileName = (originalName: string) => {
    const timestamp = Date.now().toString().slice(-6);
    const randomNum = Math.floor(Math.random() * 10000);
    return `profile-${timestamp}-${randomNum}.webp`;
};

// Middleware for single profile image upload
export const uploadProfileImage = (req: Request, res: Response, next: NextFunction) => {
    const singleUpload = upload.single("profileImage");

    singleUpload(req, res, async (err) => {
        if (err) return next(err);

        if (!req.file) return next(); // No file uploaded

        try {
            const file = req.file;
            const newName = generateFileName(file.originalname);
            const outputPath = path.join(profileImageDir, newName);

            // Convert to webp
            await sharp(file.buffer).webp({ quality: 80 }).toFile(outputPath);

            // Update req.file so controller can save it to DB
            file.filename = newName;
            file.path = outputPath;
            file.mimetype = "image/webp";

            next();
        } catch (error) {
            next(error);
        }
    });
};
