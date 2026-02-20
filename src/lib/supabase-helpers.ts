import { supabase } from "@/integrations/supabase/client";

export const generateApplicationId = () => {
  const year = new Date().getFullYear();
  const random = Math.floor(100000 + Math.random() * 900000);
  return `ADIS-${year}-${random}`;
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

  const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
  return data.publicUrl;
};
