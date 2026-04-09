import { google } from "googleapis";
import axios from "axios";
import config from "../../config";
import path from "path";
import fs from "fs";
import { finished } from "stream/promises";

// Ensure local temp directory exists
const tempDir = path.join(process.cwd(), "uploads", "zoom-temp");
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

// You need to create a service account and download the JSON file
const auth = new google.auth.GoogleAuth({
    keyFile: path.join(__dirname, "../../../../config/educate-492716-62d5a7fd4aa5.json"),
    scopes: ["https://www.googleapis.com/auth/drive"],
});

const drive = google.drive({ version: "v3", auth });

export const uploadToGoogleDrive = async (downloadUrl: string, fileName: string, downloadToken?: string, retryCount = 0): Promise<any> => {
    const localFilePath = path.join(tempDir, fileName);
    try {
        console.log(`📥 Starting local download: ${fileName}`);

        // 1. Download from Zoom to local disk
        const zoomResponse = await axios({
            method: "GET",
            url: downloadUrl,
            params: downloadToken ? { access_token: downloadToken } : {},
            responseType: "stream",
            headers: { "User-Agent": "Mozilla/5.0" },
            timeout: 300000, // 5 minutes
        });

        const writer = fs.createWriteStream(localFilePath);
        zoomResponse.data.pipe(writer);
        await finished(writer);

        console.log(`✅ Local download complete: ${localFilePath}`);

        // 2. Check folder access
        if (!config.drive.folder_id) {
            throw new Error("Google Drive Folder ID is not defined");
        }

        try {
            await drive.files.get({
                fileId: config.drive.folder_id,
                fields: "id, name",
                supportsAllDrives: true,
            });
        } catch (error: any) {
            console.error(`❌ FOLDER ACCESS ERROR: The service account cannot see the folder ID ${config.drive.folder_id}`);
            console.error("Please share the folder with: zoom-drive-uploader@educate-492716.iam.gserviceaccount.com");
            throw error;
        }

        // 3. Upload from local disk to Google Drive
        console.log(`📤 Uploading to Google Drive: ${fileName}`);
        const fileMetadata = {
            name: fileName,
            parents: [config.drive.folder_id],
        };

        const media = {
            mimeType: "video/mp4",
            body: fs.createReadStream(localFilePath),
        };

        const driveResponse = await drive.files.create({
            requestBody: fileMetadata,
            media: media,
            fields: "id, webViewLink",
            supportsAllDrives: true,
        });

        // 4. Make file public
        await drive.permissions.create({
            fileId: driveResponse.data.id!,
            requestBody: { role: "reader", type: "anyone" },
            supportsAllDrives: true,
        });

        console.log(`✅ Drive upload successful: ${driveResponse.data.id}`);

        // Cleanup local file
        if (fs.existsSync(localFilePath)) fs.unlinkSync(localFilePath);

        return {
            fileId: driveResponse.data.id,
            webLink: driveResponse.data.webViewLink,
        };
    } catch (error: any) {
        console.error(`❌ Upload error (Attempt ${retryCount + 1}):`, error.message);

        // Cleanup local file on error
        if (fs.existsSync(localFilePath)) fs.unlinkSync(localFilePath);

        if (retryCount < 3 && (error.code === "ENOTFOUND" || error.code === "ETIMEDOUT" || error.code === "ECONNRESET")) {
            const delay = Math.pow(2, retryCount) * 2000;
            console.log(`🔄 Retrying in ${delay / 1000}s...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
            return uploadToGoogleDrive(downloadUrl, fileName, downloadToken, retryCount + 1);
        }

        throw error;
    }
};
