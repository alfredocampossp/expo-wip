import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import i18n from '../i18n';
import type { Event } from '../types';

interface EventListProps {
  events: Event[];
  onUpdate: () => void;
  isPaidPlan: boolean;
}

export function EventList({ events, onUpdate, isPaidPlan }: EventListProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ABERTO':
        return '#4CAF50';
      case 'ENCERRADO':
        return '#FFC107';
      case 'CANCELADO':
        return '#F44336';
      case 'CONCLUIDO':
        return '#2196F3';
      default:
        return '#666';
    }
  };

  const handleEdit = (eventId: string) => {
    router.push(`/events/${eventId}/edit`);
  };

  const handleViewCandidacies = (eventId: string) => {
    router.push(`/events/${eventId}/candidacies`);
  };

  return (
    <View style={styles.container}>
      {events.map((event) => (
        <View key={event.id} style={styles.eventItem}>
          <View style={styles.eventHeader}>
            <Text style={styles.eventTitle}>{event.title}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(event.status) }]}>
              <Text style={styles.statusText}>{i18n.t(`events.status.${event.status.toLowerCase()}`)}</Text>
            </View>
          </View>

          <View style={styles.eventDetails}>
            <Text style={styles.detailText}>
              <Ionicons name="calendar" size={16} /> {new Date(event.startDate).toLocaleDateString()}
            </Text>
            <Text style={styles.detailText}>
              <Ionicons name="location" size={16} /> {event.location}
            </Text>
            <Text style={styles.detailText}>
              <Ionicons name="musical-notes" size={16} /> {event.styles.join(', ')}
            </Text>
          </View>

          <View style={styles.cacheInfo}>
            <Text style={styles.cacheText}>
              {i18n.t('events.cache')}: {event.minCache}
              {isPaidPlan && ` - ${event.maxCache}`}
            </Text>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleEdit(event.id)}
            >
              <Ionicons name="create-outline" size={24} color="#007AFF" />
              <Text style={styles.actionText}>{i18n.t('common.button.edit')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleViewCandidacies(event.id)}
            >
              <Ionicons name="people-outline" size={24} color="#007AFF" />
              <Text style={styles.actionText}>{i18n.t('events.viewCandidacies')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
  },
  eventItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginLeft: 10,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  eventDetails: {
    marginBottom: 10,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  cacheInfo: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 10,
    marginTop: 10,
  },
  cacheText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginHorizontal: 5,
  },
  actionText: {
    marginLeft: 5,
    color: '#007AFF',
    fontSize: 16,
  },
});