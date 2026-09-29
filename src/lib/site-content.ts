export type SiteValue = Record<string, unknown>;

export const siteDefaults = {
  hero_content: {
    badge_text: "Admissions open for the new session",
    title: "A confident start for every child.",
    subtitle: "Begin your child’s admission journey with a simple, guided online application. Save your progress, upload documents securely, and track every step from one place.",
    address: "Dakshin Krishnanagar, Malancha-Antardwipa Road, Dhuliyan, Murshidabad, 742202",
    journey_steps: ["Create your student account", "Complete the application form", "Upload supporting documents", "Submit and keep your application ID"],
    primary_btn_text: "Apply for admission",
    secondary_btn_text: "Check application status",
  },
  contact_settings: {
    phone_numbers: [] as string[],
    whatsapp_number: "",
    whatsapp_message: "Assalamu Alaikum, I have an inquiry regarding ADIS school admission.",
    is_floating_whatsapp: false,
    helpline_title: "Need help with your application?",
    helpline_subtitle: "We’re here to help every step of the way.",
  },
  quick_tracker_settings: {
    is_enabled: true,
    search_placeholder: "Enter Application ID",
    helper_text: "Enter your application ID and registered mobile number to check your status.",
  },
  footer_content: {
    school_name: "Alor Disha Islamic School",
    address: "Dakshin Krishnanagar, Malancha-Antardwipa Road, Dhuliyan, Murshidabad, 742202",
    copyright_text: "© Alor Disha Islamic School. All rights reserved.",
    extra_links: [] as { label: string; url: string }[],
  },
  admission_info_content: {
    eyebrow: "Admission information",
    title: "Everything parents need before applying.",
    subtitle: "Please keep the following items ready. You can submit your application online and return to your dashboard to view its progress.",
    cards: [
      { title: "Important dates", items: ["Applications are currently being accepted", "Submit early to avoid last-minute delays", "Admission test details will appear in your dashboard"] },
      { title: "Documents to prepare", items: ["Passport-size student photograph", "Aadhaar card (if available)", "Birth certificate and guardian signature"] },
      { title: "What happens next", items: ["Receive your application ID on submission", "The school reviews your details", "Check status and test updates online"] },
    ],
  },
  features_content: {
    eyebrow: "Why families choose us",
    title: "Learning, character and care.",
    cards: [
      { title: "Supportive community", description: "A welcoming environment for students and families." },
      { title: "Transparent process", description: "Clear steps and application updates in your own dashboard." },
      { title: "Values-led learning", description: "A strong foundation for growth in and beyond the classroom." },
    ],
  },
};

export type SiteSettings = typeof siteDefaults;

export function mergeSiteSettings(rows: { key: string; value: unknown }[] | null | undefined): SiteSettings {
  const values = { ...siteDefaults } as SiteSettings;
  rows?.forEach((row) => {
    if (row.key in values && row.value && typeof row.value === "object") {
      const key = row.key as keyof SiteSettings;
      values[key] = { ...siteDefaults[key], ...(row.value as object) } as SiteSettings[typeof key];
    }
  });
  return values;
}

export const defaultSectionContent: Record<string, object> = {
  announcement: { tag: "Important update", date: "", message: "Add your important admission announcement here." },
  age_criteria: { rows: [{ class_name: "Nursery", minimum_age: "3 years", maximum_age: "4 years" }] },
  school_features: { items: [{ title: "Feature title", subtitle: "", description: "Describe this school feature." }] },
  faq: { items: [{ question: "When can I apply?", answer: "Applications are currently open." }] },
  custom_cards: { items: [{ title: "Information card", description: "Add helpful information for families.", bullets: [] }] },
};
