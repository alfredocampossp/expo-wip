import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Layout } from '../src/components/Layout';
import { auth, db } from '../src/services/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import i18n from '../src/i18n';
import type { User, Event, ContractorProfile } from '../src/types';

export default function HomeContractorScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ContractorProfile | null>(null);
  const [recentEvents, setRecentEvents] = useState<Event[]>([]);
  const [pendingCandidacies, setPendingCandidacies] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (!auth.currentUser) {
      router.replace('/login');
      return;
    }

    try {
      // Carregar dados do usuário
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (!userDoc.exists()) {
        Alert.alert('Erro', 'Usuário não encontrado');
        return;
      }
      const userData = userDoc.data() as User;
      setUser(userData);

      // Carregar perfil do contratante
      const profileDoc = await getDoc(doc(db, 'contractorProfiles', auth.currentUser.uid));
      if (profileDoc.exists()) {
        setProfile(profileDoc.data() as ContractorProfile);
      }

      // Carregar eventos recentes
      const eventsQuery = query(
        collection(db, 'events'),
        where('creatorId', '==', auth.currentUser.uid),
        where('status', '==', 'ABERTO')
      );
      const eventsSnapshot = await getDocs(eventsQuery);
      const eventsList = eventsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Event[];
      setRecentEvents(eventsList);

      // Contar candidaturas pendentes
      let totalPending = 0;
      for (const event of eventsList) {
        const candidaciesQuery = query(
          collection(db, 'candidacies'),
          where('eventId', '==', event.id),
          where('status', '==', 'PENDENTE')
        );
        const candidaciesSnapshot = await getDocs(candidaciesQuery);
        totalPending += candidaciesSnapshot.size;
      }
      setPendingCandidacies(totalPending);

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      Alert.alert('Erro', 'Não foi possível carregar os dados');
    } finally {
      setLoading(false);
    }
  };

  const navigateToCreateEvent = () => {
    if (user?.planId === 'free' && (user?.credits || 0) < 1) {
      Alert.alert('Limite Atingido', 'Você precisa de créditos para criar novos eventos');
      return;
    }
    router.push('/events/create');
  };

  const navigateToProfile = () => {
    router.push('/edit-contractor-profile');
  };

  if (!profile) {
    return (
      <Layout>
        <View style={styles.container}>
          <View style={styles.welcomeCard}>
            <Ionicons name="business" size={48} color="#007AFF" />
            <Text style={styles.welcomeTitle}>Bem-vindo ao WIP!</Text>
            <Text style={styles.welcomeText}>
              Para começar, complete seu perfil de contratante
            </Text>
            <TouchableOpacity
              style={styles.completeProfileButton}
              onPress={navigateToProfile}
            >
              <Text style={styles.completeProfileText}>Completar Perfil</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Layout>
    );
  }

  return (
    <Layout>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Ionicons name="business" size={32} color="#007AFF" />
            <Text style={styles.headerTitle}>Olá, {user?.email}</Text>
            {user?.planId === 'free' && (
              <Text style={styles.creditsText}>
                Créditos disponíveis: {user?.credits || 0}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={navigateToCreateEvent}
          >
            <Ionicons name="add-circle" size={24} color="#007AFF" />
            <Text style={styles.actionText}>Criar Evento</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/artists-advanced-search')}
          >
            <Ionicons name="search" size={24} color="#007AFF" />
            <Text style={styles.actionText}>Buscar Artistas</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/contractor-dashboard')}
          >
            <Ionicons name="stats-chart" size={24} color="#007AFF" />
            <Text style={styles.actionText}>Dashboard</Text>
          </TouchableOpacity>
        </View>

        {pendingCandidacies > 0 && (
          <TouchableOpacity
            style={styles.notificationCard}
            onPress={() => router.push('/events')}
          >
            <Ionicons name="notifications" size={24} color="#FF9800" />
            <Text style={styles.notificationText}>
              Você tem {pendingCandidacies} candidatura{pendingCandidacies > 1 ? 's' : ''} pendente{pendingCandidacies > 1 ? 's' : ''}
            </Text>
            <Ionicons name="chevron-forward" size={24} color="#FF9800" />
          </TouchableOpacity>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Eventos Recentes</Text>
            <TouchableOpacity onPress={() => router.push('/events')}>
              <Text style={styles.seeAllText}>Ver Todos</Text>
            </TouchableOpacity>
          </View>

          {recentEvents.length > 0 ? (
            recentEvents.map(event => (
              <TouchableOpacity
                key={event.id}
                style={styles.eventCard}
                onPress={() => router.push(`/events/${event.id}`)}
              >
                <Text style={styles.eventTitle}>{event.title}</Text>
                <View style={styles.eventDetails}>
                  <Text style={styles.eventDate}>
                    <Ionicons name="calendar" size={16} /> {new Date(event.startDate).toLocaleDateString()}
                  </Text>
                  <Text style={styles.eventLocation}>
                    <Ionicons name="location" size={16} /> {event.location}
                  </Text>
                </View>
                <View style={styles.eventFooter}>
                  <Text style={styles.eventType}>{event.eventType}</Text>
                  <Text style={styles.eventCache}>
                    R$ {event.minCache}
                    {event.maxCache > event.minCache && ` - R$ ${event.maxCache}`}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Nenhum evento ativo</Text>
              <TouchableOpacity
                style={styles.createButton}
                onPress={navigateToCreateEvent}
              >
                <Text style={styles.createButtonText}>Criar Primeiro Evento</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 10,
    color: '#333',
  },
  creditsText: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  actionButton: {
    alignItems: 'center',
    padding: 10,
  },
  actionText: {
    marginTop: 5,
    fontSize: 12,
    color: '#007AFF',
    textAlign: 'center',
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    margin: 10,
    padding: 15,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  notificationText: {
    flex: 1,
    marginHorizontal: 10,
    fontSize: 14,
    color: '#F57C00',
  },
  section: {
    backgroundColor: '#fff',
    margin: 10,
    padding: 15,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  seeAllText: {
    fontSize: 14,
    color: '#007AFF',
  },
  eventCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  eventDetails: {
    marginBottom: 10,
  },
  eventDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  eventLocation: {
    fontSize: 14,
    color: '#666',
  },
  eventFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventType: {
    fontSize: 12,
    color: '#007AFF',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  eventCache: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  emptyState: {
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  createButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  welcomeCard: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 10,
    color: '#333',
  },
  welcomeText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  completeProfileButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  completeProfileText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});