export type SiteValue = Record<string, unknown>;

export interface BaseContentCard {
  id: string;
  title: string;
  description?: string;
  items?: string[];
  image_url?: string;
  document_url?: string;
  document_label?: string;
}
export type ContentCard = BaseContentCard;

export interface SiteSettings {
  hero_content: { badge_text: string; title: string; subtitle: string; address: string; journey_steps: string[]; primary_btn_text: string; secondary_btn_text: string };
  contact_settings: { phone_numbers: string[]; whatsapp_number: string; whatsapp_message: string; is_floating_whatsapp: boolean; helpline_title: string; helpline_subtitle: string };
  quick_tracker_settings: { is_enabled: boolean; search_placeholder: string; helper_text: string };
  footer_content: { school_name: string; address: string; copyright_text: string; extra_links: { label: string; url: string }[] };
  admission_info_content: { eyebrow: string; title: string; subtitle: string; cards: ContentCard[] };
  features_content: { eyebrow: string; title: string; cards: ContentCard[] };
}

export const siteDefaults: SiteSettings = {
  hero_content: { badge_text: "Admissions open for the new session", title: "A confident start for every child.", subtitle: "Begin your child’s admission journey with a simple, guided online application. Save your progress, upload documents securely, and track every step from one place.", address: "Dakshin Krishnanagar, Malancha-Antardwipa Road, Dhuliyan, Murshidabad, 742202", journey_steps: ["Create your student account", "Complete the application form", "Upload supporting documents", "Submit and keep your application ID"], primary_btn_text: "Apply for admission", secondary_btn_text: "Check application status" },
  contact_settings: { phone_numbers: [], whatsapp_number: "", whatsapp_message: "Assalamu Alaikum, I have an inquiry regarding ADIS school admission.", is_floating_whatsapp: false, helpline_title: "Need help with your application?", helpline_subtitle: "We’re here to help every step of the way." },
  quick_tracker_settings: { is_enabled: true, search_placeholder: "Enter Application ID", helper_text: "Enter your application ID and registered mobile number to check your status." },
  footer_content: { school_name: "Alor Disha Islamic School", address: "Dakshin Krishnanagar, Malancha-Antardwipa Road, Dhuliyan, Murshidabad, 742202", copyright_text: "© Alor Disha Islamic School. All rights reserved.", extra_links: [] },
  admission_info_content: { eyebrow: "Admission information", title: "Everything parents need before applying.", subtitle: "Please keep the following items ready. You can submit your application online and return to your dashboard to view its progress.", cards: [{ id: "important-dates", title: "Important dates", items: ["Applications are currently being accepted", "Submit early to avoid last-minute delays", "Admission test details will appear in your dashboard"] }, { id: "documents", title: "Documents to prepare", items: ["Passport-size student photograph", "Aadhaar card (if available)", "Birth certificate and guardian signature"] }, { id: "next-steps", title: "What happens next", items: ["Receive your application ID on submission", "The school reviews your details", "Check status and test updates online"] }] },
  features_content: { eyebrow: "Why families choose us", title: "Learning, character and care.", cards: [{ id: "community", title: "Supportive community", description: "A welcoming environment for students and families." }, { id: "transparent", title: "Transparent process", description: "Clear steps and application updates in your own dashboard." }, { id: "values", title: "Values-led learning", description: "A strong foundation for growth in and beyond the classroom." }] },
};

const normalizeCards = (value: unknown, prefix: string): ContentCard[] => Array.isArray(value) ? value.filter((card): card is Record<string, unknown> => Boolean(card) && typeof card === "object").map((card, index) => ({ id: typeof card.id === "string" && card.id ? card.id : `${prefix}-${index + 1}`, title: typeof card.title === "string" ? card.title : "Information", description: typeof card.description === "string" ? card.description : undefined, items: Array.isArray(card.items) ? card.items.filter((item): item is string => typeof item === "string") : undefined, image_url: typeof card.image_url === "string" ? card.image_url : undefined, document_url: typeof card.document_url === "string" ? card.document_url : undefined, document_label: typeof card.document_label === "string" ? card.document_label : undefined })) : [];

export function mergeSiteSettings(rows: { key: string; value: unknown }[] | null | undefined): SiteSettings {
  const lookup = Object.fromEntries((rows || []).filter((row) => row.value && typeof row.value === "object").map((row) => [row.key, row.value as Record<string, unknown>]));
  const admission = { ...siteDefaults.admission_info_content, ...(lookup.admission_info_content || {}) };
  const features = { ...siteDefaults.features_content, ...(lookup.features_content || {}) };
  return { hero_content: { ...siteDefaults.hero_content, ...(lookup.hero_content || {}) }, contact_settings: { ...siteDefaults.contact_settings, ...(lookup.contact_settings || {}) }, quick_tracker_settings: { ...siteDefaults.quick_tracker_settings, ...(lookup.quick_tracker_settings || {}) }, footer_content: { ...siteDefaults.footer_content, ...(lookup.footer_content || {}) }, admission_info_content: { ...admission, cards: normalizeCards(admission.cards, "admission-card") }, features_content: { ...features, cards: normalizeCards(features.cards, "feature-card") } };
}

export const defaultSectionContent: Record<string, object> = {
  announcement: { tag: "Important update", date: "", message: "Add your important admission announcement here." },
  age_criteria: { rows: [{ class_name: "Nursery", minimum_age: "3 years", maximum_age: "4 years" }] },
  school_features: { items: [{ title: "Feature title", subtitle: "", description: "Describe this school feature." }] },
  faq: { items: [{ question: "When can I apply?", answer: "Applications are currently open." }] },
  custom_cards: { items: [{ title: "Information card", description: "Add helpful information for families.", bullets: [] }] },
};
