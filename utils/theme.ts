import { createContext } from 'react';

export type Theme = {
  primary: string;
  secondary: string;
  background: string;
  text: string;
  inputBackground: string;
  danger: string;
};

export const themes = {
  default: {
    primary: '#007AFF',
    secondary: '#666666',
    background: '#FFFFFF',
    text: '#333333',
    inputBackground: '#f5f5f5',
    danger: '#FF3B30',
  },
  ocean: {
    primary: '#00B4D8',
    secondary: '#90E0EF',
    background: '#FFFFFF',
    text: '#03045E',
    inputBackground: '#CAF0F8',
    danger: '#FF6B6B',
  },
  forest: {
    primary: '#2D6A4F',
    secondary: '#95D5B2',
    background: '#FFFFFF',
    text: '#081C15',
    inputBackground: '#D8F3DC',
    danger: '#D62828',
  },
  sunset: {
    primary: '#F72585',
    secondary: '#7209B7',
    background: '#FFFFFF',
    text: '#3A0CA3',
    inputBackground: '#F7F2FE',
    danger: '#FF4D6D',
  },
};

export type ThemeName = keyof typeof themes;

export const ThemeContext = createContext<{
  theme: Theme;
  themeName: ThemeName;
  setTheme: (name: ThemeName) => void;
  isDarkMode: boolean;
  toggleDarkMode: (value: boolean) => void;
}>({
  theme: themes.default,
  themeName: 'default',
  setTheme: () => {},
  isDarkMode: false,
  toggleDarkMode: () => {},
}); 