import React, { createContext, useContext, useState, useEffect } from 'react';
import { type Language, t } from '../lib/translations';

interface LanguageState {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const OpsLanguageContext = createContext<LanguageState | null>(null);

export function OpsLanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLang] = useState<Language>(() => {
    return (localStorage.getItem('ops_language') as Language) || 'en';
  });

  const setLanguage = (lang: Language) => {
    setLang(lang);
    localStorage.setItem('ops_language', lang);
  };

  useEffect(() => {
    localStorage.setItem('ops_language', language);
  }, [language]);

  const translate = (key: string) => t(key, language);

  return (
    <OpsLanguageContext.Provider value={{ language, setLanguage, t: translate }}>
      {children}
    </OpsLanguageContext.Provider>
  );
}

export function useOpsLanguage() {
  const ctx = useContext(OpsLanguageContext);
  if (!ctx) throw new Error('useOpsLanguage must be used within OpsLanguageProvider');
  return ctx;
}
