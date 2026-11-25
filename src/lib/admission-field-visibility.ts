export const ADMISSION_FIELD_LABELS = {
  name_bengali: "Name in Bengali",
  aadhar_no: "Aadhar Card No",
  health_issue: "Health Issue",
  guardian_name: "Guardian Name",
  guardian_relation: "Guardian Relation",
  last_attended_class: "Last Attended Class",
  last_institution: "Last Institution",
  father_occupation: "Father's Occupation",
  father_qualification: "Father's Qualification",
  mother_occupation: "Mother's Occupation",
  mother_qualification: "Mother's Qualification",
} as const;

export function readAdmissionVisibility(value: unknown): Record<string, boolean> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result: Record<string, boolean> = {};
  for (const key of Object.keys(ADMISSION_FIELD_LABELS)) {
    result[key] = (value as Record<string, unknown>)[key] !== false;
  }
  return result;
}

export function isAdmissionFieldVisible(visibility: Record<string, boolean>, key: string): boolean {
  return visibility[key] !== false;
}