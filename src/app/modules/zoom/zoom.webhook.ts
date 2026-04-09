import { Request, Response } from "express";
import crypto from "crypto";
import httpStatus from "http-status";
import config from "../../config";
import { ZoomModel } from "./zoom.model";
import sendResponse from "../../../utils/sendResponse";
import { uploadToGoogleDrive } from "./googleDrive.service";

export const ZoomWebhook = async (req: Request, res: Response) => {
    try {
        const rawBody = req.body.toString("utf-8");
        const body = JSON.parse(rawBody);
        const event = body.event;

        // URL Validation (for Zoom setup)
        if (event === "endpoint.url_validation") {
            const plainToken = body.payload.plainToken;
            const hash = crypto.createHmac("sha256", config.zoom.webhook_secret!).update(plainToken).digest("hex");

            return res.status(httpStatus.OK).json({
                plainToken,
                encryptedToken: hash,
            });
        }

        // Signature Verification
        const signature = req.headers["x-zm-signature"] as string;
        const timestamp = req.headers["x-zm-request-timestamp"] as string;

        if (!signature || !timestamp) {
            return sendResponse(res, {
                statusCode: httpStatus.UNAUTHORIZED,
                success: false,
                message: "Missing webhook signature",
                data: null,
            });
        }

        const message = `v0:${timestamp}:${rawBody}`;
        const hash = crypto.createHmac("sha256", config.zoom.webhook_secret!).update(message).digest("hex");
        const expectedSignature = `v0=${hash}`;

        if (signature !== expectedSignature) {
            return sendResponse(res, {
                statusCode: httpStatus.UNAUTHORIZED,
                success: false,
                message: "Invalid signature",
                data: null,
            });
        }

        // 🔴 HANDLE RECORDING COMPLETED EVENT (AUTOMATIC UPLOAD) 🔴
        if (event === "recording.completed") {
            const recordingData = body.payload.object;
            const downloadToken = body.payload.download_token;

            console.log(`📹 Recording completed for meeting ${recordingData.id}`);

            // 🔴 FILTER ONLY MP4 FILES 🔴
            const mp4Files = recordingData.recording_files?.filter((file: any) => file.file_type === "MP4") || [];
            console.log(`Found ${recordingData.recording_files?.length || 0} total files, keeping ${mp4Files.length} MP4 files`);

            // Save recording info to database
            await ZoomModel.findOneAndUpdate(
                { meetingId: recordingData.id },
                {
                    $set: {
                        total_size: recordingData.total_size,
                        recording_count: mp4Files.length,
                        recording_files: mp4Files,
                        download_token: downloadToken,
                        drive_upload_status: "pending",
                    },
                },
            );

            // 🔴 AUTOMATICALLY UPLOAD TO GOOGLE DRIVE 🔴
            // Don't await - let it run in background
            (async () => {
                try {
                    const meeting = await ZoomModel.findOne({ meetingId: recordingData.id });

                    if (!meeting || !meeting.recording_files) {
                        console.log("No recording files found");
                        return;
                    }

                    console.log(`Starting upload for ${meeting.recording_files.length} files...`);

                    // Upload each recording file
                    for (const file of meeting.recording_files) {
                        if (!file.uploaded_to_drive && file.download_url) {
                            console.log(`Uploading: ${file.recording_type} - ${file.file_type}`);

                            // Generate filename
                            const fileName = `meeting_${meeting.meetingId}_${file.recording_type}_${Date.now()}.mp4`;

                            // Upload to Google Drive
                            const driveResult = await uploadToGoogleDrive(file.download_url, fileName, meeting.download_token);

                            // Update database with Drive links
                            file.drive_file_id = driveResult.fileId || undefined;
                            file.drive_web_link = driveResult.webLink || undefined;
                            file.uploaded_to_drive = true;

                            console.log(`✅ Uploaded: ${driveResult.webLink}`);
                        }
                    }

                    // Mark all as completed
                    await ZoomModel.findOneAndUpdate(
                        { meetingId: recordingData.id },
                        {
                            $set: {
                                recording_files: meeting.recording_files,
                                drive_upload_status: "completed",
                            },
                        },
                    );

                    console.log(`🎉 All files uploaded for meeting ${recordingData.id}`);
                } catch (error) {
                    console.error("Drive upload failed:", error);
                    await ZoomModel.findOneAndUpdate({ meetingId: recordingData.id }, { $set: { drive_upload_status: "failed" } });
                }
            })(); // 🔴 THIS RUNS AUTOMATICALLY 🔴

            // Return response immediately (don't wait for upload)
            return sendResponse(res, {
                statusCode: httpStatus.OK,
                success: true,
                message: "Webhook received, uploading to Drive in background",
                data: null,
            });
        }

        return sendResponse(res, {
            statusCode: httpStatus.OK,
            success: true,
            message: "Webhook processed",
            data: null,
        });
    } catch (error) {
        console.error("Zoom Webhook Error:", error);
        return sendResponse(res, {
            statusCode: httpStatus.INTERNAL_SERVER_ERROR,
            success: false,
            message: "Webhook processing failed",
            data: null,
        });
    }
};
