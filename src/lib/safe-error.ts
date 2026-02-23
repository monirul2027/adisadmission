/**
 * Maps raw error messages to safe user-facing messages.
 * Prevents leaking internal database schema or implementation details.
 */
export function getSafeErrorMessage(error: any): string {
  const msg = error?.message || "";

  // Auth errors - safe to show
  if (msg.includes("Invalid login credentials")) return "Invalid email or password.";
  if (msg.includes("Email not confirmed")) return "Please verify your email before signing in.";
  if (msg.includes("User already registered")) return "An account with this email already exists.";
  if (msg.includes("Password should be")) return msg; // Password requirements are safe

  // Duplicate entry
  if (msg.includes("duplicate key") || error?.code === "23505") return "This record already exists.";

  // Storage errors
  if (msg.includes("storage") || msg.includes("bucket")) return "File upload failed. Please try again.";

  // RLS / permission
  if (msg.includes("row-level security") || msg.includes("policy")) return "You do not have permission to perform this action.";

  // Generic fallback
  return "An error occurred. Please try again or contact support.";
}
