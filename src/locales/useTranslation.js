// src/hooks/useTranslation.js
import { useState, useEffect, useCallback } from "react";
import { translations } from "../locales/translations";

export function useTranslation() {
  const [language, setLanguage] = useState(() => {
    // Lire la préférence sauvegardée
    const saved = localStorage.getItem("language");
    if (saved && (saved === "fr" || saved === "en")) {
      return saved;
    }
    // Sinon utiliser la préférence du navigateur ou FR par défaut
    const browserLang = navigator.language.split("-")[0];
    return browserLang === "en" ? "en" : "fr";
  });

  // Sauvegarder la langue
  useEffect(() => {
    localStorage.setItem("language", language);
  }, [language]);

  // Fonction pour obtenir une traduction
  const t = useCallback(
    (key) => {
      // Exemple: "nav.dashboard" → translations[language].nav.dashboard
      const keys = key.split(".");
      let value = translations[language];

      for (const k of keys) {
        if (value && typeof value === "object") {
          value = value[k];
        } else {
          console.warn(`Translation key not found: ${key}`);
          return key; // Retourner la clé si pas trouvée
        }
      }

      return value || key;
    },
    [language],
  );

  // Fonction pour changer la langue
  const changeLanguage = useCallback((lang) => {
    if (lang === "fr" || lang === "en") {
      setLanguage(lang);
    }
  }, []);

  // Fonction pour toggle FR ↔ EN
  const toggleLanguage = useCallback(() => {
    setLanguage((prev) => (prev === "fr" ? "en" : "fr"));
  }, []);

  return {
    t,
    language,
    changeLanguage,
    toggleLanguage,
    isEnglish: language === "en",
    isFrench: language === "fr",
  };
}
