import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Layout } from '../../src/components/Layout';
import { Calendar } from 'react-native-calendars';
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../src/services/firebase';
import { format, isSameDay } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import i18n from '../../src/i18n';
import type { Event, User, Plan, Candidacy } from '../../src/types';
import { EventModal } from '../../src/components/EventModal';

type TabType = 'calendar' | 'confirmed' | 'pending';

interface ExtendedEvent extends Event {
  candidacies: Candidacy[];
}

export default function ContractorMyEventsScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('calendar');
  const [events, setEvents] = useState<ExtendedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);

  // Data selecionada no calendário
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Modal de criação/edição de evento
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | undefined>(undefined);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    if (!auth.currentUser) {
      setLoading(false);
      return;
    }

    try {
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (!userDoc.exists()) {
        setLoading(false);
        return;
      }
      const userData = userDoc.data() as User;
      setUser(userData);

      // Verifica se planId == "free"
      if (userData.planId === 'free') {
        // Aqui você cria manualmente um objeto de plano "free"
        setPlan({
          price: 0,
          credits: 20,
          // Ajuste a estrutura ao que seu código espera
        } as Plan);
      } else {
        // Caso contrário, busca o doc do Firestore
        const planDoc = await getDoc(doc(db, 'plans', userData.planId));
        if (planDoc.exists()) {
          setPlan(planDoc.data() as Plan);
        }
      }

      // Carrega eventos do contratante
      const eventsSnapshot = await getDocs(
        query(collection(db, 'events'), where('creatorId', '==', auth.currentUser.uid))
      );
      const tempEvents: ExtendedEvent[] = [];

      for (const evtDoc of eventsSnapshot.docs) {
        const evtData = evtDoc.data() as Event;
        const candsSnap = await getDocs(
          query(collection(db, 'candidacies'), where('eventId', '==', evtDoc.id))
        );
        const cands: Candidacy[] = candsSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as Candidacy[];

        tempEvents.push({
          ...evtData,
          id: evtDoc.id,
          candidacies: cands,
        });
      }

      setEvents(tempEvents);
    } catch {
      Alert.alert('Erro', i18n.t('common.error.unknown'));
    } finally {
      setLoading(false);
    }
  }

  async function refreshData() {
    await loadData();
  }

  function handleOpenCreateModal() {
    setEditingEvent(undefined);
    setSelectedDate(null);
    setModalVisible(true);
  }

  function handleDayPress(dayString: string) {
    setSelectedDate(dayString);
    setEditingEvent(undefined);
    setModalVisible(true);
  }

  async function handleApproveCandidacy(event: Event, candidacyId: string) {
    try {
      await updateDoc(doc(db, 'candidacies', candidacyId), {
        status: 'APROVADA',
        updatedAt: new Date(),
      });

      if (event.eventType === 'SHOW') {
        await updateDoc(doc(db, 'events', event.id), {
          status: 'ENCERRADO',
          updatedAt: new Date(),
        });
      }
      Alert.alert('Sucesso', 'Candidatura aprovada com sucesso');
      loadData();
    } catch {
      Alert.alert('Erro', i18n.t('common.error.unknown'));
    }
  }

  async function handleRejectCandidacy(candidacyId: string) {
    try {
      await updateDoc(doc(db, 'candidacies', candidacyId), {
        status: 'REJEITADA',
        updatedAt: new Date(),
      });
      Alert.alert('Sucesso', 'Candidatura rejeitada com sucesso');
      loadData();
    } catch {
      Alert.alert('Erro', i18n.t('common.error.unknown'));
    }
  }

  function renderCalendarView() {
    const markedDates = events.reduce((acc, event) => {
      const dateStr = format(new Date(event.startDate), 'yyyy-MM-dd');
      acc[dateStr] = {
        marked: true,
        dotColor: event.status === 'ABERTO' ? '#4CAF50' : '#F44336',
      };
      return acc;
    }, {} as Record<string, any>);

    return (
      <View>
        <Calendar
          markedDates={markedDates}
          onDayPress={(day) => handleDayPress(day.dateString)}
          theme={{
            todayTextColor: '#007AFF',
            selectedDayBackgroundColor: '#007AFF',
            dotColor: '#007AFF',
          }}
        />
        {selectedDate && (
          <View style={styles.selectedDateEvents}>
            <Text style={styles.dateTitle}>{format(new Date(selectedDate), 'dd/MM/yyyy')}</Text>
            {events
              .filter((e) => isSameDay(new Date(e.startDate), new Date(selectedDate)))
              .map((event) => (
                <View key={event.id} style={styles.eventCard}>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  <View style={styles.eventDetails}>
                    <Text style={styles.detailText}>
                      <Ionicons name="time" size={16} />{' '}
                      {format(new Date(event.startDate), 'HH:mm')}
                    </Text>
                    <Text style={styles.detailText}>
                      <Ionicons name="location" size={16} /> {event.location}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, styles[`status${event.status}`]]}>
                    <Text style={styles.statusText}>
                      {i18n.t(`events.status.${event.status.toLowerCase()}`)}
                    </Text>
                  </View>
                </View>
              ))}
          </View>
        )}
      </View>
    );
  }

  function renderConfirmedEvents() {
    const confirmed = events.filter(
      (e) => e.status === 'ENCERRADO' || e.status === 'CONCLUIDO'
    );
    return (
      <View>
        {confirmed.map((event) => (
          <View key={event.id} style={styles.eventCard}>
            <Text style={styles.eventTitle}>{event.title}</Text>
            <View style={styles.eventDetails}>
              <Text style={styles.detailText}>
                <Ionicons name="calendar" size={16} />{' '}
                {format(new Date(event.startDate), 'dd/MM/yyyy')}
              </Text>
              <Text style={styles.detailText}>
                <Ionicons name="location" size={16} /> {event.location}
              </Text>
              <Text style={styles.detailText}>
                <Ionicons name="people" size={16} />{' '}
                {event.candidacies.filter((c) => c.status === 'APROVADA').length} artistas
              </Text>
            </View>
            <View style={[styles.statusBadge, styles[`status${event.status}`]]}>
              <Text style={styles.statusText}>
                {i18n.t(`events.status.${event.status.toLowerCase()}`)}
              </Text>
            </View>
          </View>
        ))}
      </View>
    );
  }

  function renderPendingEvents() {
    const pending = events.filter(
      (e) => e.status === 'ABERTO' && e.candidacies.some((c) => c.status === 'PENDENTE')
    );
    return (
      <View>
        {pending.map((event) => (
          <View key={event.id} style={styles.eventCard}>
            <Text style={styles.eventTitle}>{event.title}</Text>
            <View style={styles.eventDetails}>
              <Text style={styles.detailText}>
                <Ionicons name="calendar" size={16} />{' '}
                {format(new Date(event.startDate), 'dd/MM/yyyy')}
              </Text>
              <Text style={styles.detailText}>
                <Ionicons name="location" size={16} /> {event.location}
              </Text>
            </View>
            <View style={styles.candidaciesList}>
              {event.candidacies
                .filter((c) => c.status === 'PENDENTE')
                .map((cand) => (
                  <View key={cand.id} style={styles.candidacyItem}>
                    <Text style={styles.candidacyText}>
                      {cand.artistName || `(Artista #${cand.artistId.slice(-4)})`}
                    </Text>
                    <View style={styles.candidacyActions}>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.approveButton]}
                        onPress={() => handleApproveCandidacy(event, cand.id)}
                      >
                        <Ionicons name="checkmark" size={20} color="#4CAF50" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.rejectButton]}
                        onPress={() => handleRejectCandidacy(cand.id)}
                      >
                        <Ionicons name="close" size={20} color="#F44336" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
            </View>
          </View>
        ))}
      </View>
    );
  }

  if (loading) {
    return (
      <Layout>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </Layout>
    );
  }

  return (
    <Layout>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="calendar" size={32} color="#007AFF" />
          <Text style={styles.title}>{i18n.t('events.myEvents.title')}</Text>
        </View>

        {/* Botão "Novo Evento" (opcional) */}
        <View style={styles.newEventWrapper}>
          <TouchableOpacity style={styles.newEventButton} onPress={handleOpenCreateModal}>
            <Ionicons name="add" size={20} color="#FFF" />
            <Text style={styles.newEventButtonText}>Novo Evento</Text>
          </TouchableOpacity>
        </View>

        {/* Abas */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'calendar' && styles.activeTab]}
            onPress={() => setActiveTab('calendar')}
          >
            <Ionicons
              name="calendar"
              size={20}
              color={activeTab === 'calendar' ? '#007AFF' : '#666'}
            />
            <Text style={[styles.tabText, activeTab === 'calendar' && styles.activeTabText]}>
              {i18n.t('events.tabs.calendar')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'confirmed' && styles.activeTab]}
            onPress={() => setActiveTab('confirmed')}
          >
            <Ionicons
              name="checkmark-circle"
              size={20}
              color={activeTab === 'confirmed' ? '#007AFF' : '#666'}
            />
            <Text style={[styles.tabText, activeTab === 'confirmed' && styles.activeTabText]}>
              {i18n.t('events.tabs.confirmed')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'pending' && styles.activeTab]}
            onPress={() => setActiveTab('pending')}
          >
            <Ionicons
              name="time"
              size={20}
              color={activeTab === 'pending' ? '#007AFF' : '#666'}
            />
            <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>
              {i18n.t('events.tabs.pending')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Se for plano grátis, e credits != -1, mostra info de créditos */}
        {plan && plan.price === 0 && plan.credits !== -1 && user && (
          <View style={styles.planInfo}>
            <Ionicons name="information-circle" size={20} color="#666" />
            <Text style={styles.planInfoText}>
              {`Créditos usados: ${user.usedCredits || 0} / ${plan.credits}`}
            </Text>
          </View>
        )}

        {activeTab === 'calendar' && renderCalendarView()}
        {activeTab === 'confirmed' && renderConfirmedEvents()}
        {activeTab === 'pending' && renderPendingEvents()}
      </ScrollView>

      {/* Modal de criação/edição */}
      {user && plan && (
        <EventModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          user={user}
          plan={plan}
          editingEvent={editingEvent}
          defaultDate={selectedDate || undefined}
          refreshData={refreshData}
        />
      )}
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 10,
  },
  newEventWrapper: {
    marginBottom: 16,
    alignItems: 'flex-end',
    marginRight: 10,
  },
  newEventButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  newEventButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 6,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginHorizontal: 10,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    gap: 8,
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: '#F0F7FF',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#007AFF',
  },
  planInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    marginBottom: 16,
    marginHorizontal: 10,
  },
  planInfoText: {
    flex: 1,
    fontSize: 14,
    color: '#F57C00',
  },
  selectedDateEvents: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginHorizontal: 10,
  },
  dateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  eventCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  eventDetails: {
    marginBottom: 12,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusABERTO: {
    backgroundColor: '#E8F5E9',
  },
  statusENCERRADO: {
    backgroundColor: '#FFF3E0',
  },
  statusCANCELADO: {
    backgroundColor: '#FFEBEE',
  },
  statusCONCLUIDO: {
    backgroundColor: '#E3F2FD',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  candidaciesList: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 12,
  },
  candidacyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  candidacyText: {
    fontSize: 14,
    color: '#333',
  },
  candidacyActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 20,
  },
  approveButton: {
    backgroundColor: '#E8F5E9',
  },
  rejectButton: {
    backgroundColor: '#FFEBEE',
  },
});
