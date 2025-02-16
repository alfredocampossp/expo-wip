import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Alert, TouchableOpacity } from 'react-native';
import { Layout } from '../../src/components/Layout';
import { Button } from '../../src/components/Button';
import { auth, db } from '../../src/services/firebase';
import { collection, query, orderBy, getDocs, doc, setDoc, updateDoc } from 'firebase/firestore';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import i18n from '../../src/i18n';

interface EventType {
  id: string;
  name: string;
  description: string;
  planAllowed: string[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export default function AdminEventTypesScreen() {
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(true);
  const [newType, setNewType] = useState({
    name: '',
    description: '',
    planAllowed: ['free', 'paid'],
  });
  const [editingType, setEditingType] = useState<EventType | null>(null);

  useEffect(() => {
    loadEventTypes();
  }, []);

  const loadEventTypes = async () => {
    try {
      const typesSnapshot = await getDocs(query(
        collection(db, 'eventTypes'),
        orderBy('name', 'asc')
      ));

      const typesList = typesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(),
        updatedAt: doc.data().updatedAt.toDate(),
      })) as EventType[];

      setEventTypes(typesList);
    } catch (error) {
      console.error('Error loading event types:', error);
      Alert.alert(i18n.t('common.error.unknown'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newType.name.trim() || !newType.description.trim()) return;

    try {
      const typeDoc = doc(collection(db, 'eventTypes'));
      await setDoc(typeDoc, {
        name: newType.name.trim(),
        description: newType.description.trim(),
        planAllowed: newType.planAllowed,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      setNewType({
        name: '',
        description: '',
        planAllowed: ['free', 'paid'],
      });
      Alert.alert(i18n.t('admin.eventTypes.success.created'));
      loadEventTypes();
    } catch (error) {
      console.error('Error creating event type:', error);
      Alert.alert(i18n.t('common.error.unknown'));
    }
  };

  const handleUpdate = async (type: EventType) => {
    try {
      await updateDoc(doc(db, 'eventTypes', type.id), {
        name: type.name,
        description: type.description,
        planAllowed: type.planAllowed,
        updatedAt: new Date(),
      });

      setEditingType(null);
      Alert.alert(i18n.t('admin.eventTypes.success.updated'));
      loadEventTypes();
    } catch (error) {
      console.error('Error updating event type:', error);
      Alert.alert(i18n.t('common.error.unknown'));
    }
  };

  const handleToggleActive = async (type: EventType) => {
    try {
      await updateDoc(doc(db, 'eventTypes', type.id), {
        active: !type.active,
        updatedAt: new Date(),
      });

      Alert.alert(
        type.active
          ? i18n.t('admin.eventTypes.success.deactivated')
          : i18n.t('admin.eventTypes.success.activated')
      );
      loadEventTypes();
    } catch (error) {
      console.error('Error toggling event type:', error);
      Alert.alert(i18n.t('common.error.unknown'));
    }
  };

  const handleTogglePlan = (type: EventType, plan: string) => {
    const planAllowed = type.planAllowed.includes(plan)
      ? type.planAllowed.filter(p => p !== plan)
      : [...type.planAllowed, plan];

    setEditingType({
      ...type,
      planAllowed,
    });
  };

  return (
    <Layout>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Ionicons name="calendar" size={32} color="#007AFF" />
            <Text style={styles.title}>{i18n.t('admin.eventTypes.title')}</Text>
          </View>
        </View>

        <View style={styles.createForm}>
          <Text style={styles.label}>{i18n.t('admin.eventTypes.form.name')}</Text>
          <TextInput
            style={styles.input}
            value={newType.name}
            onChangeText={(text) => setNewType({ ...newType, name: text })}
            placeholder={i18n.t('admin.eventTypes.form.namePlaceholder')}
          />

          <Text style={styles.label}>{i18n.t('admin.eventTypes.form.description')}</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={newType.description}
            onChangeText={(text) => setNewType({ ...newType, description: text })}
            placeholder={i18n.t('admin.eventTypes.form.descriptionPlaceholder')}
            multiline
            numberOfLines={4}
          />

          <Text style={styles.label}>{i18n.t('admin.eventTypes.form.plans')}</Text>
          <View style={styles.plansContainer}>
            <Button
              title="Free"
              onPress={() => setNewType({
                ...newType,
                planAllowed: newType.planAllowed.includes('free')
                  ? newType.planAllowed.filter(p => p !== 'free')
                  : [...newType.planAllowed, 'free']
              })}
              variant={newType.planAllowed.includes('free') ? 'primary' : 'secondary'}
            />
            <Button
              title="Paid"
              onPress={() => setNewType({
                ...newType,
                planAllowed: newType.planAllowed.includes('paid')
                  ? newType.planAllowed.filter(p => p !== 'paid')
                  : [...newType.planAllowed, 'paid']
              })}
              variant={newType.planAllowed.includes('paid') ? 'primary' : 'secondary'}
            />
          </View>

          <Button
            title={i18n.t('common.button.create')}
            onPress={handleCreate}
            disabled={!newType.name.trim() || !newType.description.trim()}
          />
        </View>

        {eventTypes.map((type) => (
          <View key={type.id} style={styles.typeItem}>
            {editingType?.id === type.id ? (
              <View style={styles.editForm}>
                <TextInput
                  style={styles.input}
                  value={editingType.name}
                  onChangeText={(text) => setEditingType({ ...editingType, name: text })}
                />

                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={editingType.description}
                  onChangeText={(text) => setEditingType({ ...editingType, description: text })}
                  multiline
                  numberOfLines={4}
                />

                <View style={styles.plansContainer}>
                  <Button
                    title="Free"
                    onPress={() => handleTogglePlan(editingType, 'free')}
                    variant={editingType.planAllowed.includes('free') ? 'primary' : 'secondary'}
                  />
                  <Button
                    title="Paid"
                    onPress={() => handleTogglePlan(editingType, 'paid')}
                    variant={editingType.planAllowed.includes('paid') ? 'primary' : 'secondary'}
                  />
                </View>

                <View style={styles.editButtons}>
                  <Button
                    title={i18n.t('common.button.save')}
                    onPress={() => handleUpdate(editingType)}
                  />
                  <Button
                    title={i18n.t('common.button.cancel')}
                    onPress={() => setEditingType(null)}
                    variant="secondary"
                  />
                </View>
              </View>
            ) : (
              <>
                <View style={styles.typeHeader}>
                  <Text style={styles.typeName}>{type.name}</Text>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>
                      {type.active
                        ? i18n.t('admin.eventTypes.status.active')
                        : i18n.t('admin.eventTypes.status.inactive')}
                    </Text>
                  </View>
                </View>

                <Text style={styles.typeDescription}>{type.description}</Text>

                <View style={styles.plansInfo}>
                  <Text style={styles.plansLabel}>{i18n.t('admin.eventTypes.allowedPlans')}:</Text>
                  <View style={styles.planBadges}>
                    {type.planAllowed.map((plan) => (
                      <View key={plan} style={styles.planBadge}>
                        <Text style={styles.planText}>{plan}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                <View style={styles.typeActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => setEditingType(type)}
                  >
                    <Ionicons name="create-outline" size={24} color="#007AFF" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleToggleActive(type)}
                  >
                    <Ionicons
                      name={type.active ? "eye-off-outline" : "eye-outline"}
                      size={24}
                      color={type.active ? "#F44336" : "#4CAF50"}
                    />
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        ))}
      </ScrollView>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  backButton: {
    padding: 10,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 10,
  },
  createForm: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    marginBottom: 15,
    borderRadius: 8,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  plansContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
  },
  typeItem: {
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
  typeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  typeName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
  },
  statusText: {
    fontSize: 12,
    color: '#666',
  },
  typeDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  plansInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  plansLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 10,
  },
  planBadges: {
    flexDirection: 'row',
    gap: 5,
  },
  planBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  planText: {
    fontSize: 12,
    color: '#007AFF',
  },
  typeActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  actionButton: {
    padding: 5,
  },
  editForm: {
    gap: 10,
  },
  editButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
});