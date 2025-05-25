import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ThemeContext, themes } from '../utils/theme';

export const ThemeSelector = () => {
  const { themeName, setTheme, theme } = React.useContext(ThemeContext);

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.text }]}>Thèmes</Text>
      <View style={styles.themeGrid}>
        {Object.entries(themes).map(([name, colors]) => (
          <TouchableOpacity
            key={name}
            style={[
              styles.themeButton,
              { backgroundColor: colors.primary },
              name === themeName && styles.selectedTheme,
            ]}
            onPress={() => setTheme(name as keyof typeof themes)}
          >
            {name === themeName && (
              <Ionicons name="checkmark-circle" size={24} color="white" />
            )}
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.themeLabels}>
        {Object.keys(themes).map((name) => (
          <Text
            key={name}
            style={[
              styles.themeLabel,
              { color: theme.text },
              name === themeName && { color: theme.primary, fontWeight: 'bold' },
            ]}
          >
            {name.charAt(0).toUpperCase() + name.slice(1)}
          </Text>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  themeGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  themeButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedTheme: {
    borderWidth: 2,
    borderColor: 'white',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  themeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  themeLabel: {
    fontSize: 12,
  },
}); 