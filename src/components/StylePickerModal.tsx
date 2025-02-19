import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Button } from './Button';
import { Ionicons } from '@expo/vector-icons';

interface StylePickerModalProps {
  visible: boolean;
  currentSelection: string[];
  planId: string;
  onClose: () => void;
  onConfirm: (newGenres: string[]) => void;
}

export const StylePickerModal: React.FC<StylePickerModalProps> = ({
  visible,
  currentSelection,
  planId,
  onClose,
  onConfirm,
}) => {
  const [allStyles, setAllStyles] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>(currentSelection);
  const [loading, setLoading] = useState(true);

  const maxStyles = planId === 'free' ? 3 : 999;

  useEffect(() => {
    if (visible) {
      loadStyles();
      setSelected(currentSelection);
    }
  }, [visible]);

  const loadStyles = async () => {
    try {
      setLoading(true);
      const stylesQuery = query(
        collection(db, 'musicStyles'),
        where('isActive', '==', true)
      );
      const snapshot = await getDocs(stylesQuery);
      const stylesList = snapshot.docs
        .map(doc => doc.data().name)
        .filter(Boolean)
        .sort();
      setAllStyles(stylesList);
    } catch (error) {
      console.error('Erro ao carregar estilos:', error);
      Alert.alert('Erro', 'Não foi possível carregar os estilos musicais');
    } finally {
      setLoading(false);
    }
  };

  const toggleStyle = (style: string) => {
    if (selected.includes(style)) {
      setSelected(prev => prev.filter(s => s !== style));
    } else if (selected.length < maxStyles) {
      setSelected(prev => [...prev, style]);
    } else {
      Alert.alert('Limite Atingido', `Você só pode escolher até ${maxStyles} estilos.`);
    }
  };

  const handleConfirm = () => {
    onConfirm(selected);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
          <View style={styles.header}>
            <Text style={styles.title}>Escolher Estilos Musicais</Text>
            {planId === 'free' && (
              <Text style={styles.subtitle}>Máximo de {maxStyles} estilos</Text>
            )}
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Carregando estilos...</Text>
            </View>
          ) : (
            <FlatList
              data={allStyles}
              keyExtractor={item => item}
              style={styles.list}
              renderItem={({ item }) => {
                const isSelected = selected.includes(item);
                return (
                  <TouchableOpacity
                    style={styles.itemRow}
                    onPress={() => toggleStyle(item)}
                  >
                    <Ionicons
                      name={isSelected ? "checkbox" : "square-outline"}
                      size={24}
                      color={isSelected ? "#007AFF" : "#666"}
                    />
                    <Text style={[
                      styles.itemText,
                      isSelected && styles.itemTextSelected
                    ]}>{item}</Text>
                  </TouchableOpacity>
                );
              }}
            />
          )}

          <View style={styles.buttonContainer}>
            <Button
              title="Cancelar"
              onPress={onClose}
              variant="secondary"
              style={styles.button}
            />
            <Button
              title="Confirmar"
              onPress={handleConfirm}
              style={styles.button}
            />
          </View>
        </View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  list: {
    flexGrow: 0,
    marginBottom: 20,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  itemTextSelected: {
    color: '#007AFF',
    fontWeight: '500',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  button: {
    flex: 1,
  },
});