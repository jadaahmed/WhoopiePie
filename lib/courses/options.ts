export const courseTypes = ["core", "elective", "lab", "seminar"] as const;

export type CourseType = (typeof courseTypes)[number];

export const courseTypeLabels: Record<CourseType, string> = {
  core: "Core",
  elective: "Elective",
  lab: "Lab",
  seminar: "Seminar",
};

export function isCourseType(value: unknown): value is CourseType {
  return typeof value === "string" && courseTypes.includes(value as CourseType);
}
