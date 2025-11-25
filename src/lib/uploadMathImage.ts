import { supabase } from "@/integrations/supabase/client";

export async function uploadMathImage(imageData: string, userId: string): Promise<string | null> {
  try {
    // Convert base64 to blob
    const base64Data = imageData.split(',')[1];
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'image/jpeg' });

    // Generate unique filename
    const filename = `${userId}/${Date.now()}.jpg`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('project_proofs')
      .upload(filename, blob, {
        contentType: 'image/jpeg',
        upsert: false
      });

    if (error) {
      console.error('Upload error:', error);
      return null;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('project_proofs')
      .getPublicUrl(filename);

    return publicUrl;
  } catch (error) {
    console.error('Failed to upload image:', error);
    return null;
  }
}
