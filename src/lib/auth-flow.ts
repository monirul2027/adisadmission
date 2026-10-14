export type AdmissionDestination = "new-admission" | "admission-test";

export const AUTH_KNOWN_USER_KEY = "adis_auth_known_user";
export const AUTH_DESTINATION_KEY = "adis_post_auth_destination";

export const admissionPath = (destination: AdmissionDestination) =>
  destination === "new-admission" ? "/student/new-admission" : "/student/admission-test";

export const rememberAdmissionDestination = (destination: AdmissionDestination) => {
  try { window.localStorage.setItem(AUTH_DESTINATION_KEY, destination); } catch { /* UI convenience only */ }
};

export const consumeAdmissionDestination = (): AdmissionDestination | null => {
  try {
    const destination = window.localStorage.getItem(AUTH_DESTINATION_KEY);
    window.localStorage.removeItem(AUTH_DESTINATION_KEY);
    return destination === "new-admission" || destination === "admission-test" ? destination : null;
  } catch { return null; }
};

export const markKnownAuthUser = () => {
  try { window.localStorage.setItem(AUTH_KNOWN_USER_KEY, "true"); } catch { /* UI convenience only */ }
};

export const getAccountFullName = (user: { user_metadata?: Record<string, unknown> } | null | undefined) => {
  const metadata = user?.user_metadata;
  if (!metadata) return "";
  for (const key of ["full_name", "name"]) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  const firstName = metadata.first_name;
  const lastName = metadata.last_name;
  return [firstName, lastName].filter((part): part is string => typeof part === "string" && Boolean(part.trim())).join(" ").trim();
};
