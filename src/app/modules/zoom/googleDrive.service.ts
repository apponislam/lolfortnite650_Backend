import { google } from "googleapis";
import axios from "axios";
import config from "../../config";
import path from "path";

// You need to create a service account and download the JSON file
// Save it as 'service-account-key.json' in your config folder
const auth = new google.auth.GoogleAuth({
    keyFile: path.join(__dirname, "../../../../config/educate-492716-62d5a7fd4aa5.json"),
    scopes: ["https://www.googleapis.com/auth/drive.file"],
});

const drive = google.drive({ version: "v3", auth });

// Create a folder in Google Drive and put its ID here
// const DRIVE_FOLDER_ID = "YOUR_GOOGLE_DRIVE_FOLDER_ID_HERE";

export const uploadToGoogleDrive = async (downloadUrl: string, fileName: string) => {
    try {
        // Download file from Zoom
        const response = await axios({
            method: "GET",
            url: downloadUrl,
            responseType: "stream",
        });

        // Upload to Google Drive
        const fileMetadata = {
            name: fileName,
            parents: [config.drive.folder_id!],
        };

        const media = {
            mimeType: "video/mp4",
            body: response.data,
        };

        const file = await drive.files.create({
            requestBody: fileMetadata,
            media: media,
            fields: "id, webViewLink",
        });

        // Make file public
        await drive.permissions.create({
            fileId: file.data.id!,
            requestBody: {
                role: "reader",
                type: "anyone",
            },
        });

        return {
            fileId: file.data.id,
            webLink: file.data.webViewLink,
        };
    } catch (error) {
        console.error("Google Drive upload error:", error);
        throw error;
    }
};
