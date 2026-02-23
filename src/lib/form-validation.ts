import { z } from "zod";

const nameField = z.string().trim().min(1, "Required").max(100, "Too long");
const optionalText = z.string().trim().max(200, "Too long").optional().or(z.literal(""));
const phoneField = z.string().regex(/^\d{10}$/, "Must be a 10-digit number");
const optionalPhone = z.string().regex(/^\d{10}$/, "Must be a 10-digit number").optional().or(z.literal(""));
const pinField = z.string().regex(/^\d{6}$/, "Must be a 6-digit PIN").optional().or(z.literal(""));
const aadharField = z.string().regex(/^\d{12}$/, "Must be a 12-digit Aadhar number").optional().or(z.literal(""));

export const admissionFormSchema = z.object({
  full_name: nameField,
  father_name: nameField,
  mother_name: nameField,
  mobile_no: phoneField,
  whatsapp_no: optionalPhone,
  present_pin: pinField,
  permanent_pin: pinField,
  aadhar_no: aadharField,
  present_vill: optionalText,
  present_po: optionalText,
  present_ps: optionalText,
  present_dist: optionalText,
  present_state: optionalText,
  permanent_vill: optionalText,
  permanent_po: optionalText,
  permanent_ps: optionalText,
  permanent_dist: optionalText,
  permanent_state: optionalText,
  health_issue: optionalText,
  name_bengali: optionalText,
  mother_occupation: optionalText,
  mother_qualification: optionalText,
  father_occupation: optionalText,
  father_qualification: optionalText,
  guardian_name: optionalText,
  guardian_relation: optionalText,
  last_attended_class: optionalText,
  last_institution: optionalText,
});

export const admissionTestSchema = z.object({
  student_name: nameField,
  father_name: nameField,
  mobile_no: phoneField,
  whatsapp_no: optionalPhone,
  occupation: optionalText,
  village: optionalText,
  po: optionalText,
  ps: optionalText,
  dist: optionalText,
  state: optionalText,
  landmark: optionalText,
  present_school: optionalText,
  present_class: optionalText,
});
