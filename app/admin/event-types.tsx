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
  maxArtists: number;
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
    maxArtists: 1,
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
    if (!newType.name.trim() || newType.maxArtists < 1) {
      Alert.alert(i18n.t('common.error.requiredFields'));
      return;
    }

    try {
      const typeDoc = doc(collection(db, 'eventTypes'));
      await setDoc(typeDoc, {
        name: newType.name.trim(),
        description: newType.description.trim(),
        maxArtists: Number(newType.maxArtists) || 1,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      setNewType({
        name: '',
        description: '',
        maxArtists: 1,
      });
      Alert.alert(i18n.t('admin.eventTypes.success.created'));
      loadEventTypes();
    } catch (error) {
      console.error('Error creating event type:', error);
      Alert.alert(i18n.t('common.error.unknown'));
    }
  };

  const handleUpdate = async (type: EventType) => {
    if (!type.name.trim() || type.maxArtists < 1) {
      Alert.alert(i18n.t('common.error.requiredFields'));
      return;
    }

    try {
      await updateDoc(doc(db, 'eventTypes', type.id), {
        name: type.name,
        description: type.description,
        maxArtists: Number(type.maxArtists) || 1,
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

  return (
    <Layout>
      <ScrollView style={styles.container}>
        <View style={styles.content}>
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

            <Text style={styles.label}>{i18n.t('admin.eventTypes.form.maxArtists')}</Text>
            <TextInput
              style={styles.input}
              value={String(newType.maxArtists)}
              onChangeText={(text) => setNewType({ ...newType, maxArtists: Number(text) || 1 })}
              keyboardType="numeric"
              placeholder="1"
            />

            <Text style={styles.label}>{i18n.t('admin.eventTypes.form.description')}</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={newType.description}
              onChangeText={(text) => setNewType({ ...newType, description: text })}
              placeholder={i18n.t('admin.eventTypes.form.descriptionPlaceholder')}
              multiline
              numberOfLines={2}
            />

            <Button
              title={i18n.t('common.button.create')}
              onPress={handleCreate}
              disabled={!newType.name.trim() || newType.maxArtists < 1}
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
                    style={styles.input}
                    value={String(editingType.maxArtists)}
                    onChangeText={(text) => setEditingType({ ...editingType, maxArtists: Number(text) || 1 })}
                    keyboardType="numeric"
                  />

                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={editingType.description}
                    onChangeText={(text) => setEditingType({ ...editingType, description: text })}
                    multiline
                    numberOfLines={2}
                  />

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

                  <View style={styles.maxArtistsContainer}>
                    <Ionicons name="people" size={20} color="#666" />
                    <Text style={styles.maxArtistsText}>
                      {i18n.t('admin.eventTypes.maxArtists', { count: type.maxArtists })}
                    </Text>
                  </View>

                  {type.description && (
                    <Text style={styles.typeDescription}>{type.description}</Text>
                  )}

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
        </View>
      </ScrollView>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
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
    fontSize: 14,
    marginBottom: 5,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    marginBottom: 12,
    borderRadius: 8,
    fontSize: 14,
  },
  textArea: {
    height: 60,
    textAlignVertical: 'top',
  },
  typeItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
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
    marginBottom: 8,
  },
  typeName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
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
    marginTop: 8,
  },
  maxArtistsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  maxArtistsText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  typeActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 12,
  },
  actionButton: {
    padding: 4,
  },
  editForm: {
    gap: 8,
  },
  editButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 4,
  },
});