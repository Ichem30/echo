import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState } from 'react';
import { ThemeContext, ThemeName, themes } from '../utils/theme';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeName, setThemeName] = useState<ThemeName>('default');

  const setTheme = async (name: ThemeName) => {
    setThemeName(name);
    await AsyncStorage.setItem('theme', name);
  };

  React.useEffect(() => {
    // Charger le thème sauvegardé au démarrage
    AsyncStorage.getItem('theme').then((savedTheme) => {
      if (savedTheme && savedTheme in themes) {
        setThemeName(savedTheme as ThemeName);
      }
    });
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        theme: themes[themeName],
        themeName,
        setTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}; 