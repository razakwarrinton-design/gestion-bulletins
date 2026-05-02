import React from 'react';
import { Sun, Moon } from 'lucide-react';

export default function DarkModeToggle({ isDark, toggle }) {
  return (
    <button
      onClick={toggle}
      title={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
      className="relative w-10 h-10 rounded-xl flex items-center justify-center transition-all
        bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
    >
      {isDark
        ? <Sun  className="w-5 h-5 text-yellow-400" />
        : <Moon className="w-5 h-5 text-gray-600"   />}
    </button>
  );
}