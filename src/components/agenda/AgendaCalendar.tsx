import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, Platform, TouchableOpacity } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { format, isSameDay, isWithinInterval, parseISO } from 'date-fns';
import { auth, db } from '../../services/firebase';
import { collection, query, where, getDocs, addDoc, doc, deleteDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import i18n from '../../i18n';
import type { AvailabilityBlock, User } from '../../types';
import { BlockModal } from '../BlockModal';
import { DayBlocks } from '../DayBlocks';

const MAX_FREE_BLOCKS = 10;

interface AgendaCalendarProps {
  user: User | null;
}

export function AgendaCalendar({ user }: AgendaCalendarProps) {
  const [blocks, setBlocks] = useState<AvailabilityBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<AvailabilityBlock | null>(null);

  useEffect(() => {
    loadBlocks();
  }, []);

  const loadBlocks = async () => {
    if (!auth.currentUser) return;

    try {
      const blocksSnapshot = await getDocs(query(
        collection(db, 'artistAgenda'),
        where('artistId', '==', auth.currentUser.uid)
      ));

      const blocksList = blocksSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        startDate: doc.data().startDate.toDate(),
        endDate: doc.data().endDate.toDate(),
      })) as AvailabilityBlock[];

      setBlocks(blocksList.sort((a, b) => a.startDate.getTime() - b.startDate.getTime()));
    } catch (error) {
      console.error('Error loading blocks:', error);
      Alert.alert(i18n.t('common.error.unknown'));
    } finally {
      setLoading(false);
    }
  };

  const handleDayPress = (day: DateData) => {
    setSelectedDate(parseISO(day.dateString));
  };

  const handleAddBlock = () => {
    if (user?.planId === 'free' && blocks.filter(b => b.status === 'BUSY').length >= MAX_FREE_BLOCKS) {
      Alert.alert(i18n.t('agenda.error.maxBlocks'));
      return;
    }
    setSelectedBlock(null);
    setShowBlockModal(true);
  };

  const handleEditBlock = (block: AvailabilityBlock) => {
    if (block.status === 'BUSY' && block.eventId) {
      Alert.alert(i18n.t('agenda.error.editBusy'));
      return;
    }
    setSelectedBlock(block);
    setShowBlockModal(true);
  };

  const handleDeleteBlock = async (block: AvailabilityBlock) => {
    if (block.status === 'BUSY' && block.eventId) {
      Alert.alert(i18n.t('agenda.error.deleteBusy'));
      return;
    }

    try {
      await deleteDoc(doc(db, 'artistAgenda', block.id));
      loadBlocks();
    } catch (error) {
      console.error('Error deleting block:', error);
      Alert.alert(i18n.t('common.error.unknown'));
    }
  };

  const getMarkedDates = () => {
    const marked: any = {};
    blocks.forEach(block => {
      const date = format(block.startDate, 'yyyy-MM-dd');
      const existingDots = marked[date]?.dots || [];
      const newDot = {
        key: block.id,
        color: block.status === 'BUSY' ? '#F44336' : '#4CAF50'
      };
      
      marked[date] = {
        dots: [...existingDots, newDot],
        marked: true
      };
    });
    return marked;
  };

  const getDayBlocks = (date: Date) => {
    return blocks.filter(block => 
      isSameDay(block.startDate, date) || 
      isSameDay(block.endDate, date) ||
      isWithinInterval(date, { start: block.startDate, end: block.endDate })
    );
  };

  return (
    <View style={styles.container}>
      {user?.planId === 'free' && (
        <View style={styles.limitCard}>
          <Text style={styles.limitText}>
            {i18n.t('agenda.blocksLimit', { 
              current: blocks.filter(b => b.status === 'BUSY').length, 
              max: MAX_FREE_BLOCKS 
            })}
          </Text>
        </View>
      )}

      <View style={styles.calendarContainer}>
        <Calendar
          markingType="multi-dot"
          markedDates={getMarkedDates()}
          onDayPress={handleDayPress}
          theme={{
            todayTextColor: '#007AFF',
            selectedDayBackgroundColor: '#007AFF',
            dotColor: '#007AFF',
            textDayFontSize: 14,
            textMonthFontSize: 16,
            textDayHeaderFontSize: 14,
            'stylesheet.calendar.main': {
              container: {
                padding: 0,
              },
              week: {
                marginTop: 2,
                marginBottom: 2,
                flexDirection: 'row',
                justifyContent: 'space-around',
              },
            },
          }}
        />
      </View>

      <TouchableOpacity 
        style={styles.addButton}
        onPress={handleAddBlock}
      >
        <Ionicons name="add" size={20} color="#FFF" />
        <Text style={styles.addButtonText}>{i18n.t('agenda.addUnavailability')}</Text>
      </TouchableOpacity>

      {selectedDate && (
        <DayBlocks
          date={selectedDate}
          blocks={getDayBlocks(selectedDate)}
          onEdit={handleEditBlock}
          onDelete={handleDeleteBlock}
        />
      )}

      <BlockModal
        visible={showBlockModal}
        block={selectedBlock}
        onClose={() => setShowBlockModal(false)}
        onSave={loadBlocks}
        selectedDate={selectedDate}
        existingBlocks={blocks}
        isPaidPlan={user?.planId === 'paid'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%',
  },
  limitCard: {
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    ...Platform.select({
      web: {
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
      },
    }),
  },
  limitText: {
    textAlign: 'center',
    color: '#F57C00',
    fontSize: 13,
  },
  calendarContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 8,
    marginBottom: 16,
    ...Platform.select({
      web: {
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
      },
    }),
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F44336',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 300,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
});