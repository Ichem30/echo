import React, { useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ThemeContext } from '../../utils/theme';

interface CheckIn {
  date: string;
  color: string;
  label: string;
}

interface MoodTimelineProps {
  checkins: CheckIn[];
}

export default function MoodTimeline({ checkins }: MoodTimelineProps) {
  const { theme } = React.useContext(ThemeContext);
  const [selected, setSelected] = useState<number | null>(null);
  const [fadeAnim] = useState(new Animated.Value(0));

  const handlePress = (i: number) => {
    setSelected(i);
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
    setTimeout(() => setSelected(null), 2000);
  };

  const getDayLabel = (date: string) => {
    if (!date) return '';
    const d = new Date(date);
    return ['D', 'L', 'M', 'M', 'J', 'V', 'S'][d.getDay()];
  };

  // On affiche les 7 derniers check-ins (du plus ancien au plus récent)
  const last7 = checkins.slice(-7);
  while (last7.length < 7) last7.unshift({ date: '', color: '#eee', label: '' });

  return (
    <View style={styles.container}>
      <View style={styles.timeline}>
        {last7.map((c, i) => {
          const isToday = i === 6;
          return (
            <View key={c?.date || i} style={styles.segmentContainer}>
              <TouchableOpacity
                style={[
                  styles.segment,
                  { backgroundColor: c?.color || '#eee', borderColor: isToday ? theme.primary : 'transparent' },
                  isToday && styles.segmentToday,
                ]}
                activeOpacity={0.8}
                onPress={() => c && handlePress(i)}
              />
              <Text style={styles.dayLabel}>{getDayLabel(c.date)}</Text>
            </View>
          );
        })}
      </View>
      {selected !== null && last7[selected] && (
        <Animated.View
          style={[
            styles.labelBubble,
            { opacity: fadeAnim },
            // Centrer la bulle sous la case sélectionnée
            selected === 0 || selected === 1
              ? { left: selected * 36 } // 36 = (24 largeur + 2*6 gap) * index
              : selected === 5 || selected === 6
              ? { left: selected * 36 - 90 + 24, alignItems: 'flex-end' } // 90 = minWidth bulle, 24 = largeur case
              : { left: selected * 36 - 45, alignItems: 'center' } // 45 = moitié de minWidth
          ]}
        >
          <Text style={[styles.labelText, { color: theme.text }]}>{last7[selected].date}</Text>
          {last7[selected].label ? (
            <Text style={[styles.labelMood, { color: theme.primary }]}>{last7[selected].label}</Text>
          ) : (
            <Text style={[styles.labelMood, { color: theme.secondary }]}>Pas de check-in</Text>
          )}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 10,
    marginBottom: 30,
    alignItems: 'center',
    minHeight: 48,
  },
  timeline: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: 210,
    height: 18,
    marginBottom: 0,
    position: 'relative',
  },
  segment: {
    width: 24,
    height: 14,
    borderRadius: 8,
    marginHorizontal: 6,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: '#eee',
    shadowColor: 'transparent',
  },
  segmentToday: {
    width: 32,
    height: 18,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  labelBubble: {
    position: 'absolute',
    top: 32,
    minWidth: 90,
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
    shadowColor: '#000',
    shadowOpacity: 0.10,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    zIndex: 10,
  },
  labelText: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  segmentContainer: { alignItems: 'center', width: 24, marginHorizontal: 6 },
  dayLabel: { fontSize: 11, color: '#888', marginTop: 2, fontWeight: '500', textAlign: 'center' },
  labelMood: { fontSize: 15, fontWeight: 'bold', marginTop: 2, textAlign: 'center' },
}); 