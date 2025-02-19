import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, Platform, Alert, TextInput } from 'react-native';
import { Button } from './Button';
import { auth, db } from '../services/firebase';
import { collection, addDoc } from 'firebase/firestore';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, isAfter, isBefore, isWithinInterval } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import i18n from '../i18n';
import type { AvailabilityBlock } from '../types';

interface BlockModalProps {
  visible: boolean;
  block: AvailabilityBlock | null;
  onClose: () => void;
  onSave: () => void;
  selectedDate: Date | null;
  existingBlocks: AvailabilityBlock[];
  isPaidPlan: boolean;
}

export function BlockModal({
  visible,
  block,
  onClose,
  onSave,
  selectedDate,
  existingBlocks,
  isPaidPlan,
}: BlockModalProps) {
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      if (block) {
        setStartDate(block.startDate);
        setEndDate(block.endDate);
        setNotes(block.notes || '');
      } else if (selectedDate) {
        const start = new Date(selectedDate);
        start.setHours(9, 0, 0, 0);
        const end = new Date(selectedDate);
        end.setHours(18, 0, 0, 0);
        setStartDate(start);
        setEndDate(end);
        setNotes('');
      }
    }
  }, [visible, block, selectedDate]);

  const validateDates = () => {
    if (isAfter(startDate, endDate) || startDate.getTime() === endDate.getTime()) {
      Alert.alert(i18n.t('agenda.error.endBeforeStart'));
      return false;
    }

    const hasConflict = existingBlocks.some(existingBlock => {
      if (block && existingBlock.id === block.id) return false;
      return (
        isWithinInterval(startDate, {
          start: existingBlock.startDate,
          end: existingBlock.endDate,
        }) ||
        isWithinInterval(endDate, {
          start: existingBlock.startDate,
          end: existingBlock.endDate,
        }) ||
        (isBefore(startDate, existingBlock.startDate) &&
          isAfter(endDate, existingBlock.endDate))
      );
    });

    if (hasConflict) {
      Alert.alert(i18n.t('agenda.error.dateConflict'));
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!auth.currentUser || !validateDates()) return;

    setSaving(true);
    try {
      await addDoc(collection(db, 'artistAgenda'), {
        artistId: auth.currentUser.uid,
        startDate,
        endDate,
        status: 'BUSY',
        notes: notes.trim(),
        createdAt: new Date(),
      });

      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving block:', error);
      Alert.alert(i18n.t('common.error.unknown'));
    } finally {
      setSaving(false);
    }
  };

  if (Platform.OS === 'web') {
    return (
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onClose}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="calendar" size={24} color="#F44336" />
              <Text style={styles.modalTitle}>
                {i18n.t('agenda.addUnavailability')}
              </Text>
            </View>

            <View style={styles.dateTimeContainer}>
              <View style={styles.dateTimeField}>
                <View style={styles.labelContainer}>
                  <Ionicons name="time-outline" size={20} color="#666" />
                  <Text style={styles.label}>{i18n.t('agenda.startDate')}</Text>
                </View>
                <input
                  type="datetime-local"
                  value={format(startDate, "yyyy-MM-dd'T'HH:mm")}
                  onChange={(e) => setStartDate(new Date(e.target.value))}
                  style={styles.webDateInput as any}
                />
              </View>

              <View style={styles.dateTimeField}>
                <View style={styles.labelContainer}>
                  <Ionicons name="time-outline" size={20} color="#666" />
                  <Text style={styles.label}>{i18n.t('agenda.endDate')}</Text>
                </View>
                <input
                  type="datetime-local"
                  value={format(endDate, "yyyy-MM-dd'T'HH:mm")}
                  onChange={(e) => setEndDate(new Date(e.target.value))}
                  style={styles.webDateInput as any}
                />
              </View>

              <View style={styles.dateTimeField}>
                <View style={styles.labelContainer}>
                  <Ionicons name="document-text-outline" size={20} color="#666" />
                  <Text style={styles.label}>{i18n.t('agenda.notes')}</Text>
                </View>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder={i18n.t('agenda.notesPlaceholder')}
                  multiline
                  numberOfLines={4}
                />
              </View>
            </View>

            <View style={styles.buttonContainer}>
              <Button
                title={i18n.t('common.button.cancel')}
                onPress={onClose}
                variant="secondary"
                icon={<Ionicons name="close" size={20} color="#666" />}
              />
              <Button
                title={i18n.t('common.button.save')}
                onPress={handleSave}
                disabled={saving}
                icon={<Ionicons name="save" size={20} color="#FFF" />}
              />
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  // Mobile version
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Ionicons name="calendar" size={24} color="#F44336" />
            <Text style={styles.modalTitle}>
              {i18n.t('agenda.addUnavailability')}
            </Text>
          </View>

          <View style={styles.dateTimeContainer}>
            <View style={styles.dateTimeField}>
              <View style={styles.labelContainer}>
                <Ionicons name="time-outline" size={20} color="#666" />
                <Text style={styles.label}>{i18n.t('agenda.startDate')}</Text>
              </View>
              <DateTimePicker
                value={startDate}
                mode="datetime"
                onChange={(_, date) => date && setStartDate(date)}
              />
            </View>

            <View style={styles.dateTimeField}>
              <View style={styles.labelContainer}>
                <Ionicons name="time-outline" size={20} color="#666" />
                <Text style={styles.label}>{i18n.t('agenda.endDate')}</Text>
              </View>
              <DateTimePicker
                value={endDate}
                mode="datetime"
                onChange={(_, date) => date && setEndDate(date)}
              />
            </View>

            <View style={styles.dateTimeField}>
              <View style={styles.labelContainer}>
                <Ionicons name="document-text-outline" size={20} color="#666" />
                <Text style={styles.label}>{i18n.t('agenda.notes')}</Text>
              </View>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={notes}
                onChangeText={setNotes}
                placeholder={i18n.t('agenda.notesPlaceholder')}
                multiline
                numberOfLines={4}
              />
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <Button
              title={i18n.t('common.button.cancel')}
              onPress={onClose}
              variant="secondary"
              icon={<Ionicons name="close" size={20} color="#666" />}
            />
            <Button
              title={i18n.t('common.button.save')}
              onPress={handleSave}
              disabled={saving}
              icon={<Ionicons name="save" size={20} color="#FFF" />}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F44336',
  },
  dateTimeContainer: {
    marginBottom: 20,
  },
  dateTimeField: {
    marginBottom: 15,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
    gap: 5,
  },
  label: {
    fontSize: 16,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  webDateInput: {
    width: '100%',
    padding: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    fontSize: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
});