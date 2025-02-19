import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Alert, TouchableOpacity } from 'react-native';
import { Layout } from '../../src/components/Layout';
import { Button } from '../../src/components/Button';
import { auth, db } from '../../src/services/firebase';
import { collection, query, orderBy, getDocs, doc, setDoc, updateDoc } from 'firebase/firestore';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import i18n from '../../src/i18n';

interface FeedbackCriterion {
  id: string;
  name: string;
  weight: number;
  appliesTo: 'artist' | 'contractor' | 'both';
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

type TabType = 'artist' | 'contractor';

export default function AdminFeedbackCriteriaScreen() {
  const [criteria, setCriteria] = useState<FeedbackCriterion[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('artist');
  const [newCriterion, setNewCriterion] = useState({
    name: '',
    weight: 1,
    appliesTo: 'both' as const,
  });
  const [editingCriterion, setEditingCriterion] = useState<FeedbackCriterion | null>(null);

  useEffect(() => {
    loadCriteria();
  }, []);

  const loadCriteria = async () => {
    try {
      const criteriaSnapshot = await getDocs(query(
        collection(db, 'feedbackCriteria'),
        orderBy('name', 'asc')
      ));

      const criteriaList = criteriaSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(),
        updatedAt: doc.data().updatedAt.toDate(),
      })) as FeedbackCriterion[];

      setCriteria(criteriaList);
    } catch (error) {
      console.error('Error loading criteria:', error);
      Alert.alert(i18n.t('common.error.unknown'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newCriterion.name.trim()) {
      Alert.alert(i18n.t('common.error.requiredFields'));
      return;
    }

    try {
      const criterionDoc = doc(collection(db, 'feedbackCriteria'));
      await setDoc(criterionDoc, {
        name: newCriterion.name.trim(),
        weight: Number(newCriterion.weight) || 1,
        appliesTo: newCriterion.appliesTo,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      setNewCriterion({
        name: '',
        weight: 1,
        appliesTo: 'both',
      });
      Alert.alert(i18n.t('admin.feedbackCriteria.success.created'));
      loadCriteria();
    } catch (error) {
      console.error('Error creating criterion:', error);
      Alert.alert(i18n.t('common.error.unknown'));
    }
  };

  const handleUpdate = async (criterion: FeedbackCriterion) => {
    if (!criterion.name.trim()) {
      Alert.alert(i18n.t('common.error.requiredFields'));
      return;
    }

    try {
      await updateDoc(doc(db, 'feedbackCriteria', criterion.id), {
        name: criterion.name,
        weight: Number(criterion.weight) || 1,
        appliesTo: criterion.appliesTo,
        updatedAt: new Date(),
      });

      setEditingCriterion(null);
      Alert.alert(i18n.t('admin.feedbackCriteria.success.updated'));
      loadCriteria();
    } catch (error) {
      console.error('Error updating criterion:', error);
      Alert.alert(i18n.t('common.error.unknown'));
    }
  };

  const handleToggleActive = async (criterion: FeedbackCriterion) => {
    try {
      await updateDoc(doc(db, 'feedbackCriteria', criterion.id), {
        active: !criterion.active,
        updatedAt: new Date(),
      });

      Alert.alert(
        criterion.active
          ? i18n.t('admin.feedbackCriteria.success.deactivated')
          : i18n.t('admin.feedbackCriteria.success.activated')
      );
      loadCriteria();
    } catch (error) {
      console.error('Error toggling criterion:', error);
      Alert.alert(i18n.t('common.error.unknown'));
    }
  };

  const filteredCriteria = criteria.filter(criterion => 
    criterion.appliesTo === 'both' || criterion.appliesTo === activeTab
  );

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
              <Ionicons name="star" size={32} color="#007AFF" />
              <Text style={styles.title}>{i18n.t('admin.feedbackCriteria.title')}</Text>
            </View>
          </View>

          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'artist' && styles.activeTab]}
              onPress={() => setActiveTab('artist')}
            >
              <Ionicons
                name="person"
                size={20}
                color={activeTab === 'artist' ? '#007AFF' : '#666'}
              />
              <Text style={[styles.tabText, activeTab === 'artist' && styles.activeTabText]}>
                {i18n.t('admin.feedbackCriteria.appliesTo.artist')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === 'contractor' && styles.activeTab]}
              onPress={() => setActiveTab('contractor')}
            >
              <Ionicons
                name="business"
                size={20}
                color={activeTab === 'contractor' ? '#007AFF' : '#666'}
              />
              <Text style={[styles.tabText, activeTab === 'contractor' && styles.activeTabText]}>
                {i18n.t('admin.feedbackCriteria.appliesTo.contractor')}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.createForm}>
            <Text style={styles.label}>{i18n.t('admin.feedbackCriteria.form.name')}</Text>
            <TextInput
              style={styles.input}
              value={newCriterion.name}
              onChangeText={(text) => setNewCriterion({ ...newCriterion, name: text })}
              placeholder={i18n.t('admin.feedbackCriteria.form.namePlaceholder')}
            />

            <Text style={styles.label}>{i18n.t('admin.feedbackCriteria.form.weight')}</Text>
            <TextInput
              style={styles.input}
              value={String(newCriterion.weight)}
              onChangeText={(text) => setNewCriterion({ ...newCriterion, weight: Number(text) || 1 })}
              keyboardType="numeric"
              placeholder="1-5"
            />

            <Text style={styles.label}>{i18n.t('admin.feedbackCriteria.form.appliesTo')}</Text>
            <View style={styles.appliesToContainer}>
              <Button
                title={i18n.t('admin.feedbackCriteria.appliesTo.artist')}
                onPress={() => setNewCriterion({ ...newCriterion, appliesTo: 'artist' })}
                variant={newCriterion.appliesTo === 'artist' ? 'primary' : 'secondary'}
              />
              <Button
                title={i18n.t('admin.feedbackCriteria.appliesTo.contractor')}
                onPress={() => setNewCriterion({ ...newCriterion, appliesTo: 'contractor' })}
                variant={newCriterion.appliesTo === 'contractor' ? 'primary' : 'secondary'}
              />
              <Button
                title={i18n.t('admin.feedbackCriteria.appliesTo.both')}
                onPress={() => setNewCriterion({ ...newCriterion, appliesTo: 'both' })}
                variant={newCriterion.appliesTo === 'both' ? 'primary' : 'secondary'}
              />
            </View>

            <Button
              title={i18n.t('common.button.create')}
              onPress={handleCreate}
              disabled={!newCriterion.name.trim()}
            />
          </View>

          {filteredCriteria.map((criterion) => (
            <View key={criterion.id} style={styles.criterionItem}>
              {editingCriterion?.id === criterion.id ? (
                <View style={styles.editForm}>
                  <TextInput
                    style={styles.input}
                    value={editingCriterion.name}
                    onChangeText={(text) => setEditingCriterion({ ...editingCriterion, name: text })}
                  />

                  <TextInput
                    style={styles.input}
                    value={String(editingCriterion.weight)}
                    onChangeText={(text) => setEditingCriterion({ ...editingCriterion, weight: Number(text) || 1 })}
                    keyboardType="numeric"
                  />

                  <View style={styles.appliesToContainer}>
                    <Button
                      title={i18n.t('admin.feedbackCriteria.appliesTo.artist')}
                      onPress={() => setEditingCriterion({ ...editingCriterion, appliesTo: 'artist' })}
                      variant={editingCriterion.appliesTo === 'artist' ? 'primary' : 'secondary'}
                    />
                    <Button
                      title={i18n.t('admin.feedbackCriteria.appliesTo.contractor')}
                      onPress={() => setEditingCriterion({ ...editingCriterion, appliesTo: 'contractor' })}
                      variant={editingCriterion.appliesTo === 'contractor' ? 'primary' : 'secondary'}
                    />
                    <Button
                      title={i18n.t('admin.feedbackCriteria.appliesTo.both')}
                      onPress={() => setEditingCriterion({ ...editingCriterion, appliesTo: 'both' })}
                      variant={editingCriterion.appliesTo === 'both' ? 'primary' : 'secondary'}
                    />
                  </View>

                  <View style={styles.editButtons}>
                    <Button
                      title={i18n.t('common.button.save')}
                      onPress={() => handleUpdate(editingCriterion)}
                    />
                    <Button
                      title={i18n.t('common.button.cancel')}
                      onPress={() => setEditingCriterion(null)}
                      variant="secondary"
                    />
                  </View>
                </View>
              ) : (
                <>
                  <View style={styles.criterionHeader}>
                    <Text style={styles.criterionName}>{criterion.name}</Text>
                    <View style={styles.statusBadge}>
                      <Text style={styles.statusText}>
                        {criterion.active
                          ? i18n.t('admin.feedbackCriteria.status.active')
                          : i18n.t('admin.feedbackCriteria.status.inactive')}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.criterionDetails}>
                    <View style={styles.weightContainer}>
                      <Ionicons name="star" size={20} color="#666" />
                      <Text style={styles.weightText}>
                        {i18n.t('admin.feedbackCriteria.weight')}: {criterion.weight}
                      </Text>
                    </View>

                    <View style={styles.appliesToInfo}>
                      <Ionicons name="people" size={20} color="#666" />
                      <Text style={styles.appliesToText}>
                        {i18n.t(`admin.feedbackCriteria.appliesTo.${criterion.appliesTo}`)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.criterionActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => setEditingCriterion(criterion)}
                    >
                      <Ionicons name="create-outline" size={24} color="#007AFF" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleToggleActive(criterion)}
                    >
                      <Ionicons
                        name={criterion.active ? "eye-off-outline" : "eye-outline"}
                        size={24}
                        color={criterion.active ? "#F44336" : "#4CAF50"}
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
  appliesToContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 12,
  },
  criterionItem: {
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
  criterionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  criterionName: {
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
  criterionDetails: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 8,
    gap: 8,
  },
  weightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  weightText: {
    fontSize: 14,
    color: '#666',
  },
  appliesToInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  appliesToText: {
    fontSize: 14,
    color: '#666',
  },
  criterionActions: {
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