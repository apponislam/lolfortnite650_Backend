export interface IBooking {
    student: string;
    teacher: string;

    slot: string;

    date: Date;

    startTime: string;
    endTime: string;

    status: "booked" | "cancelled" | "completed";
}
