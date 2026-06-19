import { supabase } from "../lib/supabase";

export async function uploadImage(file: File) {
  const fileName = `${Date.now()}-${file.name}`;
  try {
    const { error } = await supabase.storage
      .from("products")
      .upload(fileName, file);

    if (error) {
      console.warn("Storage upload failed, falling back to base64:", error.message);
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => resolve("https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80");
        reader.readAsDataURL(file);
      });
    }

    const { data } = supabase.storage
      .from("products")
      .getPublicUrl(fileName);

    return data?.publicUrl || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80";
  } catch (err: any) {
    console.warn("Storage exception, falling back to base64:", err?.message || String(err));
    return new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve("https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80");
      reader.readAsDataURL(file);
    });
  }
}
