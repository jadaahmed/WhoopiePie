export const roomTypes = ["classroom", "lab"] as const;

export type RoomType = (typeof roomTypes)[number];

export const roomTypeLabels: Record<RoomType, string> = {
  classroom: "Classroom",
  lab: "Lab",
};

export const studentRecordStatuses = ["active", "inactive", "graduated"] as const;

export type StudentRecordStatus = (typeof studentRecordStatuses)[number];

export const studentRecordStatusLabels: Record<StudentRecordStatus, string> = {
  active: "Active",
  inactive: "Inactive",
  graduated: "Graduated",
};

export const reservationStatuses = ["scheduled", "cancelled"] as const;

export type ReservationStatus = (typeof reservationStatuses)[number];

export const reservationStatusLabels: Record<ReservationStatus, string> = {
  scheduled: "Scheduled",
  cancelled: "Cancelled",
};
