// src/components/LanguageToggle.jsx
import React from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { Globe } from 'lucide-react';

export default function LanguageToggle() {
    const { language, toggleLanguage } = useTranslation();

    return (
        <button
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors"
            style={{
                background: '#E0E7FF',
                color: '#4C1D95',
                border: '1px solid #C4B5FD',
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.background = '#C4B5FD';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.background = '#E0E7FF';
            }}
            title={`Langue actuelle: ${language === 'fr' ? 'Français' : 'English'}`}
        >
            <Globe className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{language.toUpperCase()}</span>
        </button>
    );
}