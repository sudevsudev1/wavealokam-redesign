import { supabase } from '@/integrations/supabase/client';

export async function translateText(text: string, fromLang: string, toLang: string): Promise<string> {
  if (!text.trim() || fromLang === toLang) return text;
  
  try {
    const { data, error } = await supabase.functions.invoke('ops-translate', {
      body: { text, from_lang: fromLang, to_lang: toLang },
    });
    if (error) throw error;
    return data?.translated || text;
  } catch (e) {
    console.error('Translation failed:', e);
    return text;
  }
}

// Helper to get translated text for display based on current language
export function getTranslatedField(
  original: string | null,
  en: string | null,
  ml: string | null,
  originalLang: string,
  displayLang: string
): string {
  if (displayLang === 'en') return en || original || '';
  if (displayLang === 'ml') return ml || original || '';
  return original || '';
}
