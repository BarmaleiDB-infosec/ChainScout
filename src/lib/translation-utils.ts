export const getStoredLanguage = (): string | null => {
  try {
    return localStorage.getItem('chainscout_lang');
  } catch (e) {
    return null;
  }
};

export const setStoredLanguage = (lang: string) => {
  try {
    localStorage.setItem('chainscout_lang', lang);
  } catch (e) {
    // ignore
  }
};
