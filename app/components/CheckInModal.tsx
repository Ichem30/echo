import React, { useState } from 'react';
import {
    KeyboardAvoidingView,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { ThemeContext } from '../../utils/theme';

const COLORS = [
  { color: '#B0B0B0', label: 'Discret', secondary: 'Réservé' },
  { color: '#355C7D', label: 'Fatigué', secondary: 'Besoin de réconfort' },
  { color: '#6CACE4', label: 'Serein', secondary: 'Posé' },
  { color: '#88B04B', label: 'Équilibré', secondary: 'Stable' },
  { color: '#FFD700', label: 'Optimiste', secondary: 'Énergique' },
  { color: '#FFB347', label: 'Dynamique', secondary: 'Motivé' },
  { color: '#FF6F91', label: 'Joyeux', secondary: 'Léger' },
  { color: '#A084CA', label: 'Inspiré', secondary: 'Créatif' },
];

interface CheckInColor {
  color: string;
  label: string;
  secondary: string;
}

interface CheckInModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (color: CheckInColor) => void;
}

export default function CheckInModal({ visible, onClose, onSelect }: CheckInModalProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const { theme } = React.useContext(ThemeContext);

  const selectedColor = selected !== null ? COLORS[selected] : null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.centeredView}
      >
        <View style={[styles.modalView, { backgroundColor: theme.background }]}>  
          <Text style={[styles.title, { color: theme.primary }]}>Check-in mental du jour</Text>
          <Text style={[styles.subtitle, { color: theme.text }]}>Comment te sens-tu aujourd&apos;hui ?</Text>
          <View style={styles.palette}>
            {COLORS.map((c, i) => (
              <View key={c.color} style={styles.colorItem}>
                <TouchableOpacity
                  style={[
                    styles.colorCircle,
                    { backgroundColor: c.color, borderWidth: selected === i ? 4 : 1, borderColor: selected === i ? theme.primary : '#ccc' },
                  ]}
                  onPress={() => setSelected(i)}
                  activeOpacity={0.8}
                />
                <Text style={[styles.colorLabel, { color: theme.text }]} numberOfLines={1} ellipsizeMode="tail">{c.label}</Text>
              </View>
            ))}
          </View>
          {selectedColor && (
            <View style={[styles.descBubble, { backgroundColor: selectedColor.color + '22', borderColor: selectedColor.color }]}> 
              <Text style={[styles.descLabel, { color: theme.text }]}>{selectedColor.label}</Text>
              <Text style={[styles.descSecondary, { color: theme.secondary }]}>{selectedColor.secondary}</Text>
            </View>
          )}
          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.primary, opacity: selected === null ? 0.5 : 1 }]}
            onPress={() => {
              if (selected !== null) {
                onSelect(COLORS[selected]);
                setSelected(null);
              }
            }}
            disabled={selected === null}
          >
            <Text style={styles.buttonText}>Valider</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.buttonOutline} onPress={onClose}>
            <Text style={[styles.buttonOutlineText, { color: theme.secondary }]}>Je préfère ne pas répondre aujourd&apos;hui</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  modalView: {
    margin: 20,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    minWidth: 320,
    maxWidth: 400,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  palette: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 16,
  },
  colorItem: {
    alignItems: 'center',
    marginHorizontal: 8,
    marginVertical: 6,
    width: 60,
  },
  colorCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  colorLabel: {
    fontWeight: 'bold',
    fontSize: 12,
    textAlign: 'center',
    maxWidth: 56,
    overflow: 'hidden',
    paddingHorizontal: 2,
  },
  descBubble: {
    marginBottom: 18,
    marginTop: 6,
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    minWidth: 120,
  },
  descLabel: {
    fontWeight: 'bold',
    fontSize: 17,
    textAlign: 'center',
  },
  descSecondary: {
    fontSize: 13,
    marginTop: 2,
    textAlign: 'center',
  },
  button: {
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 20,
    alignSelf: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
  },
  buttonOutline: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ccc',
    alignSelf: 'center',
  },
  buttonOutlineText: {
    fontSize: 14,
    textAlign: 'center',
  },
}); 