import React, { createContext, useContext } from 'react';
import { useDarkMode } from '../hooks/useDarkMode';

const DarkModeContext = createContext();

/**
 * Provider pour le dark mode
 * À envelopper autour de l'app dans main.jsx ou App.jsx
 */
export function DarkModeProvider({ children }) {
    const { isDark, toggle } = useDarkMode();

    return (
        <DarkModeContext.Provider value={{ isDark, toggle }}>
            <div className={isDark ? 'dark' : ''} style={{
                backgroundColor: isDark ? '#0f172a' : '#ffffff',
                color: isDark ? '#f1f5f9' : '#000000',
                transition: 'background-color 0.3s ease, color 0.3s ease'
            }}>
                {children}
            </div>
        </DarkModeContext.Provider>
    );
}

/**
 * Hook pour utiliser le dark mode dans les composants
 * Usage: const { isDark, toggle } = useDarkModeContext();
 */
export function useDarkModeContext() {
    const context = useContext(DarkModeContext);
    if (!context) {
        throw new Error('useDarkModeContext must be used within DarkModeProvider');
    }
    return context;
}