import { supabase } from "./supabase";

export const uploadPdfToSupabase = async (file) => {
  const fileName = `${Date.now()}-${file.name}`;

  const { error } = await supabase.storage
    .from("pdfs")
    .upload(fileName, file, {
      contentType: "application/pdf",
    });

  if (error) {
    console.error("Supabase upload error:", error);
    throw error;
  }

  const { data } = supabase.storage
    .from("pdfs")
    .getPublicUrl(fileName);

  return data.publicUrl;
};
