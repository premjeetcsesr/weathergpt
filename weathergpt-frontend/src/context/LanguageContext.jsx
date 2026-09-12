import React, { createContext, useContext, useState, useEffect } from 'react';
import { languages, translations } from '../data/translations';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [currentLanguage, setCurrentLanguage] = useState(() => {
    return localStorage.getItem('weathergpt_lang') || 'en';
  });

  useEffect(() => {
    localStorage.setItem('weathergpt_lang', currentLanguage);
  }, [currentLanguage]);

  /**
   * Translate helper
   * @param {string} key - Translation key
   * @returns {string} - Translated string or fallback English string
   */
  const t = (key) => {
    const langDict = translations[currentLanguage] || translations.en;
    if (langDict && langDict[key]) {
      return langDict[key];
    }
    // Fallback to English if translation is missing in the chosen language
    if (translations.en && translations.en[key]) {
      return translations.en[key];
    }
    return key;
  };

  return (
    <LanguageContext.Provider
      value={{
        currentLanguage,
        setLanguage: setCurrentLanguage,
        languages,
        t,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
