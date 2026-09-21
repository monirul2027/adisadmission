import { supabase } from "@/integrations/supabase/client";

export const generateApplicationId = () => {
  const year = new Date().getFullYear();
  const random = Math.floor(100000 + Math.random() * 900000);
  return `ADIS-${year}-${random}`;
};

export const MAX_PHOTO_SIZE = 30 * 1024; // 30 KB
export const MAX_DOC_SIZE = 50 * 1024; // 50 KB

export const validateFileSize = (file: File, maxSize: number, label: string): string | null => {
  if (file.size > maxSize) {
    const maxKB = Math.round(maxSize / 1024);
    return `${label} must be under ${maxKB} KB. Current: ${Math.round(file.size / 1024)} KB.`;
  }
  return null;
};

export const uploadFile = async (
  bucket: string,
  file: File,
  folder: string
): Promise<string | null> => {
  const fileExt = file.name.split(".").pop();
  const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

  const { error } = await supabase.storage.from(bucket).upload(fileName, file);
  if (error) {
    console.error("Upload error:", error);
    return null;
  }

  // Both buckets are now private - store the path for signed URL retrieval
  return fileName;
};

/**
 * Remove files that were uploaded during a submission that ultimately failed,
 * so no orphaned files are left behind in storage.
 */
export const cleanupUploads = async (items: { bucket: string; path: string | null }[]) => {
  const byBucket: Record<string, string[]> = {};
  for (const it of items) {
    if (!it.path || it.path.startsWith("http")) continue;
    (byBucket[it.bucket] ||= []).push(it.path);
  }
  await Promise.all(
    Object.entries(byBucket).map(([bucket, paths]) =>
      supabase.storage.from(bucket).remove(paths).catch(() => undefined)
    )
  );
};

/**
 * Get a signed URL for a file stored in a private bucket.
 * Returns a time-limited URL (1 hour by default).
 */
export const getSignedUrl = async (
  bucket: string,
  path: string,
  expiresIn = 3600
): Promise<string | null> => {
  if (!path) return null;
  // If it's already a full URL (legacy data), return as-is
  if (path.startsWith("http")) return path;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error) {
    console.error("Signed URL error:", error);
    return null;
  }
  return data.signedUrl;
};

export const SESSION_OPTIONS = ["2025", "2026", "2027", "2028", "2029", "2030"];
export const CLASS_OPTIONS = ["LKG", "UKG", "Class I", "Class II", "Class III", "Class IV", "Class V", "Class VI", "Class VII", "Class VIII", "Class IX", "Class X"];
export const SEX_OPTIONS = ["Male", "Female", "Other"];
export const RELIGION_OPTIONS = ["Islam", "Hinduism", "Christianity", "Sikhism", "Buddhism", "Jainism", "Other"];

export const generateIdViaEdge = async (type: string, session: string, className?: string) => {
  const { data: { session: authSession } } = await supabase.auth.getSession();
  const res = await supabase.functions.invoke("generate-id", {
    body: { type, session, class_name: className },
  });
  if (res.error) throw new Error(res.error.message);
  return res.data.id as string;
};

export const checkUserRole = async (userId: string): Promise<"admin" | "student" | null> => {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId).single();
  return data?.role as "admin" | "student" | null;
};
