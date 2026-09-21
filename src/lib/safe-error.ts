/**
 * Maps raw error messages to safe user-facing messages.
 * Prevents leaking internal database schema or implementation details,
 * while still surfacing actionable configuration/permission problems.
 */
export function getSafeErrorMessage(error: any): string {
  const msg = error?.message || "";
  const code = error?.code || "";

  // Auth errors - safe to show
  if (msg.includes("Invalid login credentials")) return "Invalid email or password.";
  if (msg.includes("Email not confirmed")) return "Please verify your email before signing in.";
  if (msg.includes("User already registered")) return "An account with this email already exists.";
  if (msg.includes("Password should be")) return msg; // Password requirements are safe

  // Network / wrong backend address
  if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
    return "Could not reach the server. Check your internet connection and try again.";
  }

  // Missing table privileges (database not fully configured)
  if (code === "42501" || msg.includes("permission denied for table")) {
    return "The database is not granting access to this form yet (permission denied). Please contact the administrator - the database access grants need to be applied.";
  }

  // Missing table
  if (code === "42P01" || msg.includes("does not exist")) {
    return "This form's database table is missing. Please contact the administrator.";
  }

  // Duplicate entry
  if (msg.includes("duplicate key") || code === "23505") return "This record already exists.";

  // Required field missing
  if (code === "23502") return "A required field is missing. Please review the form and try again.";

  // Storage errors
  if (msg.includes("storage") || msg.includes("bucket")) return "File upload failed. Please try again.";

  // RLS / permission
  if (code === "42501" || msg.includes("row-level security") || msg.includes("policy")) {
    return "You do not have permission to perform this action. Please make sure you are signed in.";
  }

  // Generic fallback
  return "An error occurred. Please try again or contact support.";
}
