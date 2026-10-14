import React, { createContext, useContext, useState, useEffect } from 'react';
import { ThemePreset } from '../types.js';

interface ThemeStyles {
  bgPrimary: string;
  bgSecondary: string;
  bgCard: string;
  textPrimary: string;
  textSecondary: string;
  accent: string;
  accentHover: string;
  accentLight: string;
  borderAccent: string;
  badgeBg: string;
  badgeText: string;
}

const THEME_MAP: Record<ThemePreset, ThemeStyles> = {
  natural: {
    bgPrimary: '#FDFCF9',
    bgSecondary: '#F7F5F0',
    bgCard: '#FFFFFF',
    textPrimary: '#4A4A40',
    textSecondary: '#78786A',
    accent: '#5A5A40',
    accentHover: '#484833',
    accentLight: '#F0EEE6',
    borderAccent: '#E9E4D9',
    badgeBg: '#E9E4D9',
    badgeText: '#4A4A40',
  },
  rose: {
    bgPrimary: '#FAF7F5',
    bgSecondary: '#F3EBE6',
    bgCard: '#FFFFFF',
    textPrimary: '#3A2B28',
    textSecondary: '#7A645F',
    accent: '#C48B7F',
    accentHover: '#B07569',
    accentLight: '#FDF2F0',
    borderAccent: '#E8D4CE',
    badgeBg: '#F7E6E2',
    badgeText: '#995B50',
  },
  sage: {
    bgPrimary: '#F6F8F5',
    bgSecondary: '#EBEFE9',
    bgCard: '#FFFFFF',
    textPrimary: '#283328',
    textSecondary: '#5C6D5C',
    accent: '#7D967B',
    accentHover: '#688266',
    accentLight: '#F0F5EF',
    borderAccent: '#D2DDD0',
    badgeBg: '#E3EDE1',
    badgeText: '#4E6A4B',
  },
  gold: {
    bgPrimary: '#FBF9F4',
    bgSecondary: '#F4EFE3',
    bgCard: '#FFFFFF',
    textPrimary: '#383020',
    textSecondary: '#786C52',
    accent: '#C29F52',
    accentHover: '#AD8B3E',
    accentLight: '#FCF7EC',
    borderAccent: '#E7D9B8',
    badgeBg: '#F6ECD4',
    badgeText: '#8F6E25',
  },
  ivory: {
    bgPrimary: '#FDFDFB',
    bgSecondary: '#F5F5F0',
    bgCard: '#FFFFFF',
    textPrimary: '#2B2B28',
    textSecondary: '#6B6B64',
    accent: '#8E8271',
    accentHover: '#786C5B',
    accentLight: '#F7F5F0',
    borderAccent: '#DDD7CC',
    badgeBg: '#EEEAE1',
    badgeText: '#5E5445',
  },
};

interface ThemeContextType {
  theme: ThemePreset;
  setTheme: (theme: ThemePreset) => void;
  styles: ThemeStyles;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ initialTheme?: ThemePreset; children: React.ReactNode }> = ({
  initialTheme = 'natural',
  children,
}) => {
  const [theme, setTheme] = useState<ThemePreset>(initialTheme);

  useEffect(() => {
    if (initialTheme) {
      setTheme(initialTheme);
    }
  }, [initialTheme]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        styles: THEME_MAP[theme] || THEME_MAP.natural,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
