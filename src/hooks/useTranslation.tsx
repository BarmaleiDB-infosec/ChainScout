import { createContext, useContext, useState, ReactNode } from 'react';
import { translations, Language, TranslationKey } from '@/lib/translations';
import { getStoredLanguage, setStoredLanguage } from '@/lib/translation-utils';

interface TranslationContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

export const TranslationProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const stored = getStoredLanguage();
    if (stored && (stored === 'en' || stored === 'ru')) return stored as Language;
    return 'ru';
  });

  const setLanguage = (lang: Language) => {
    setStoredLanguage(lang);
    setLanguageState(lang);
  };

  const t = (key: TranslationKey): string => {
    return translations[language][key] || translations.en[key] || String(key);
  };

  return (
    <TranslationContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </TranslationContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error('useTranslation must be used within TranslationProvider');
  }
  return context;
};