// import { Types } from "mongoose";

// // Weekday
// export type WeekDay = "Sunday" | "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday";

// // Slot status enum
// export enum SlotStatus {
//     AVAILABLE = "available",
//     LOCKED = "locked",
//     BOOKED = "booked",
// }

// // Booking status enum
// export enum BookingStatus {
//     PENDING = "pending",
//     BOOKED = "booked",
//     CANCELLED = "cancelled",
//     COMPLETED = "completed",
//     EXPIRED = "expired",
// }

// // Availability
// export interface IAvailabilitySlot {
//     startTime: string;
//     endTime: string;
// }

// export interface IDayAvailability {
//     day: WeekDay;
//     slots: IAvailabilitySlot[];
// }

// export interface ITeacherAvailability {
//     teacher: Types.ObjectId;
//     availability: IDayAvailability[];
// }

// // Slot
// export interface ISlot {
//     teacher: Types.ObjectId;
//     date: Date;
//     startTime: string;
//     endTime: string;
//     status: SlotStatus;
//     lockedBy?: Types.ObjectId | null;
//     lockedUntil?: Date | null;
//     booking?: Types.ObjectId | null;
//     version: number;
// }

// // Booking
// export interface IBooking {
//     student: Types.ObjectId;
//     teacher: Types.ObjectId;
//     slot: Types.ObjectId;
//     date: Date;
//     startTime: string;
//     endTime: string;
//     status: BookingStatus;
//     expiresAt?: Date;
//     paymentIntentId?: string;
//     metadata?: Map<string, any>;
// }
