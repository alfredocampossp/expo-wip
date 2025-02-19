import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import type { AvailabilityBlock } from '../types';
import i18n from '../i18n';

interface DayBlocksProps {
  date: Date;
  blocks: AvailabilityBlock[];
  onEdit: (block: AvailabilityBlock) => void;
  onDelete: (block: AvailabilityBlock) => void;
}

export function DayBlocks({ date, blocks, onEdit, onDelete }: DayBlocksProps) {
  if (!blocks.length) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.dateTitle}>
        {format(date, 'dd/MM/yyyy')}
      </Text>

      {blocks.map((block) => (
        <View 
          key={block.id} 
          style={[
            styles.blockItem,
            block.status === 'FREE' ? styles.freeBlock : styles.busyBlock
          ]}
        >
          <View style={styles.blockInfo}>
            <View style={styles.timeContainer}>
              <Ionicons 
                name="time-outline" 
                size={16} 
                color={block.status === 'FREE' ? '#4CAF50' : '#F44336'} 
              />
              <Text style={styles.timeText}>
                {format(block.startDate, 'HH:mm')} - {format(block.endDate, 'HH:mm')}
              </Text>
            </View>

            <View style={styles.statusContainer}>
              <View style={[
                styles.statusBadge,
                block.status === 'FREE' ? styles.freeBadge : styles.busyBadge
              ]}>
                <Text style={styles.statusText}>
                  {i18n.t(`agenda.status.${block.status.toLowerCase()}`)}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.blockActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => onEdit(block)}
              disabled={block.status === 'BUSY'}
            >
              <Ionicons 
                name="create-outline" 
                size={20} 
                color={block.status === 'FREE' ? '#007AFF' : '#999'} 
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => onDelete(block)}
              disabled={block.status === 'BUSY'}
            >
              <Ionicons 
                name="trash-outline" 
                size={20} 
                color={block.status === 'FREE' ? '#F44336' : '#999'} 
              />
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
      },
    }),
  },
  dateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  blockItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  freeBlock: {
    backgroundColor: '#E8F5E9',
  },
  busyBlock: {
    backgroundColor: '#FFEBEE',
  },
  blockInfo: {
    flex: 1,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  timeText: {
    marginLeft: 4,
    fontSize: 16,
    color: '#333',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  freeBadge: {
    backgroundColor: '#4CAF50',
  },
  busyBadge: {
    backgroundColor: '#F44336',
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  blockActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
});