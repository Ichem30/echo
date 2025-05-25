import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import { useColorScheme as useDeviceColorScheme } from 'react-native';
import { ThemeContext, ThemeName, themes } from '../utils/theme';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeName, setThemeName] = useState<ThemeName>('default');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const deviceColorScheme = useDeviceColorScheme();

  const setTheme = async (name: ThemeName) => {
    setThemeName(name);
    await AsyncStorage.setItem('theme', name);
  };

  const toggleDarkMode = async (value: boolean) => {
    setIsDarkMode(value);
    await AsyncStorage.setItem('darkMode', value ? 'true' : 'false');
  };

  useEffect(() => {
    // Charger le thème et le mode sombre sauvegardés au démarrage
    Promise.all([
      AsyncStorage.getItem('theme'),
      AsyncStorage.getItem('darkMode')
    ]).then(([savedTheme, savedDarkMode]) => {
      if (savedTheme && savedTheme in themes) {
        setThemeName(savedTheme as ThemeName);
      }
      if (savedDarkMode !== null) {
        setIsDarkMode(savedDarkMode === 'true');
      } else {
        setIsDarkMode(deviceColorScheme === 'dark');
      }
    });
  }, [deviceColorScheme]);

  const currentTheme = {
    ...themes[themeName],
    background: isDarkMode ? '#151718' : themes[themeName].background,
    text: isDarkMode ? '#ECEDEE' : themes[themeName].text,
    inputBackground: isDarkMode ? '#2D2F30' : themes[themeName].inputBackground,
  };

  return (
    <ThemeContext.Provider
      value={{
        theme: currentTheme,
        themeName,
        setTheme,
        isDarkMode,
        toggleDarkMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}; 