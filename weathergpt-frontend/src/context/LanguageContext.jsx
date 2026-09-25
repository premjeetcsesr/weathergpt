import React, { createContext, useContext, useState, useEffect } from 'react';
import { languages, translations } from '../data/translations';
import { getLanguagePreference, updateLanguagePreference } from '../services/settingsApi';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [currentLanguage, setCurrentLanguage] = useState(() => {
    return localStorage.getItem('weathergpt_lang') || 'en';
  });

  // On mount, optionally sync with backend preference if available
  useEffect(() => {
    getLanguagePreference().then((res) => {
      if (res && res.language && res.language !== currentLanguage) {
        // Respect saved preference if backend has updated one
        if (!localStorage.getItem('weathergpt_lang')) {
          setCurrentLanguage(res.language);
          localStorage.setItem('weathergpt_lang', res.language);
        }
      }
    }).catch(() => {});
  }, []);

  const changeLanguage = async (newLang) => {
    setCurrentLanguage(newLang);
    localStorage.setItem('weathergpt_lang', newLang);
    try {
      await updateLanguagePreference(newLang);
    } catch (e) {
      console.warn('Could not sync language to backend:', e);
    }
  };

  const speechLocale = currentLanguage === 'hi' ? 'hi-IN' : 'en-IN';

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
        setLanguage: changeLanguage,
        speechLocale,
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
