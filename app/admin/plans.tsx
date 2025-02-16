import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Alert, TouchableOpacity } from 'react-native';
import { Layout } from '../../src/components/Layout';
import { Button } from '../../src/components/Button';
import { auth, db } from '../../src/services/firebase';
import { collection, query, orderBy, getDocs, doc, setDoc, updateDoc } from 'firebase/firestore';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import i18n from '../../src/i18n';

interface Plan {
  id: string;
  name: string;
  storageLimitMB: number;
  credits: number;
  typeEventAllowed: string[];
  price: number;
  active: boolean;
  features: string[];
  createdAt: Date;
  updatedAt: Date;
}

export default function AdminPlansScreen() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPlan, setNewPlan] = useState({
    name: '',
    storageLimitMB: 100,
    credits: 10,
    typeEventAllowed: ['SHOW'],
    price: 0,
    features: [],
  });
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [featuresInput, setFeaturesInput] = useState('');
  const [eventTypesInput, setEventTypesInput] = useState('');

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      const plansSnapshot = await getDocs(query(
        collection(db, 'plans'),
        orderBy('price', 'asc')
      ));

      const plansList = plansSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(),
        updatedAt: doc.data().updatedAt.toDate(),
      })) as Plan[];

      setPlans(plansList);
    } catch (error) {
      console.error('Error loading plans:', error);
      Alert.alert(i18n.t('common.error.unknown'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newPlan.name.trim()) return;

    try {
      const planDoc = doc(collection(db, 'plans'));
      await setDoc(planDoc, {
        ...newPlan,
        features: featuresInput.split('\n').filter(Boolean),
        typeEventAllowed: eventTypesInput.split(',').map(t => t.trim()).filter(Boolean),
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      setNewPlan({
        name: '',
        storageLimitMB: 100,
        credits: 10,
        typeEventAllowed: ['SHOW'],
        price: 0,
        features: [],
      });
      setFeaturesInput('');
      setEventTypesInput('');
      Alert.alert(i18n.t('admin.plans.success.created'));
      loadPlans();
    } catch (error) {
      console.error('Error creating plan:', error);
      Alert.alert(i18n.t('common.error.unknown'));
    }
  };

  const handleUpdate = async (plan: Plan) => {
    try {
      await updateDoc(doc(db, 'plans', plan.id), {
        name: plan.name,
        storageLimitMB: Number(plan.storageLimitMB),
        credits: Number(plan.credits),
        typeEventAllowed: plan.typeEventAllowed,
        price: Number(plan.price),
        features: plan.features,
        updatedAt: new Date(),
      });

      setEditingPlan(null);
      Alert.alert(i18n.t('admin.plans.success.updated'));
      loadPlans();
    } catch (error) {
      console.error('Error updating plan:', error);
      Alert.alert(i18n.t('common.error.unknown'));
    }
  };

  const handleToggleActive = async (plan: Plan) => {
    try {
      await updateDoc(doc(db, 'plans', plan.id), {
        active: !plan.active,
        updatedAt: new Date(),
      });

      Alert.alert(
        plan.active
          ? i18n.t('admin.plans.success.deactivated')
          : i18n.t('admin.plans.success.activated')
      );
      loadPlans();
    } catch (error) {
      console.error('Error toggling plan:', error);
      Alert.alert(i18n.t('common.error.unknown'));
    }
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
            <Ionicons name="card" size={32} color="#007AFF" />
            <Text style={styles.title}>{i18n.t('admin.plans.title')}</Text>
          </View>
        </View>

        <View style={styles.createForm}>
          <Text style={styles.label}>{i18n.t('admin.plans.form.name')}</Text>
          <TextInput
            style={styles.input}
            value={newPlan.name}
            onChangeText={(text) => setNewPlan({ ...newPlan, name: text })}
            placeholder={i18n.t('admin.plans.form.namePlaceholder')}
          />

          <Text style={styles.label}>{i18n.t('admin.plans.form.storageLimit')}</Text>
          <TextInput
            style={styles.input}
            value={String(newPlan.storageLimitMB)}
            onChangeText={(text) => setNewPlan({ ...newPlan, storageLimitMB: Number(text) || 0 })}
            keyboardType="numeric"
            placeholder="MB"
          />

          <Text style={styles.label}>{i18n.t('admin.plans.form.credits')}</Text>
          <TextInput
            style={styles.input}
            value={String(newPlan.credits)}
            onChangeText={(text) => setNewPlan({ ...newPlan, credits: Number(text) || 0 })}
            keyboardType="numeric"
          />

          <Text style={styles.label}>{i18n.t('admin.plans.form.price')}</Text>
          <TextInput
            style={styles.input}
            value={String(newPlan.price)}
            onChangeText={(text) => setNewPlan({ ...newPlan, price: Number(text) || 0 })}
            keyboardType="numeric"
          />

          <Text style={styles.label}>{i18n.t('admin.plans.form.eventTypes')}</Text>
          <TextInput
            style={styles.input}
            value={eventTypesInput}
            onChangeText={setEventTypesInput}
            placeholder="SHOW, FESTIVAL"
          />

          <Text style={styles.label}>{i18n.t('admin.plans.form.features')}</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={featuresInput}
            onChangeText={setFeaturesInput}
            multiline
            numberOfLines={4}
            placeholder={i18n.t('admin.plans.form.featuresPlaceholder')}
          />

          <Button
            title={i18n.t('common.button.create')}
            onPress={handleCreate}
            disabled={!newPlan.name.trim()}
          />
        </View>

        {plans.map((plan) => (
          <View key={plan.id} style={styles.planItem}>
            {editingPlan?.id === plan.id ? (
              <View style={styles.editForm}>
                <TextInput
                  style={styles.input}
                  value={editingPlan.name}
                  onChangeText={(text) => setEditingPlan({ ...editingPlan, name: text })}
                />

                <TextInput
                  style={styles.input}
                  value={String(editingPlan.storageLimitMB)}
                  onChangeText={(text) => setEditingPlan({ ...editingPlan, storageLimitMB: Number(text) || 0 })}
                  keyboardType="numeric"
                />

                <TextInput
                  style={styles.input}
                  value={String(editingPlan.credits)}
                  onChangeText={(text) => setEditingPlan({ ...editingPlan, credits: Number(text) || 0 })}
                  keyboardType="numeric"
                />

                <TextInput
                  style={styles.input}
                  value={String(editingPlan.price)}
                  onChangeText={(text) => setEditingPlan({ ...editingPlan, price: Number(text) || 0 })}
                  keyboardType="numeric"
                />

                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={editingPlan.features.join('\n')}
                  onChangeText={(text) => setEditingPlan({ ...editingPlan, features: text.split('\n').filter(Boolean) })}
                  multiline
                  numberOfLines={4}
                />

                <View style={styles.editButtons}>
                  <Button
                    title={i18n.t('common.button.save')}
                    onPress={() => handleUpdate(editingPlan)}
                  />
                  <Button
                    title={i18n.t('common.button.cancel')}
                    onPress={() => setEditingPlan(null)}
                    variant="secondary"
                  />
                </View>
              </View>
            ) : (
              <>
                <View style={styles.planHeader}>
                  <Text style={styles.planName}>{plan.name}</Text>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>
                      {plan.active
                        ? i18n.t('admin.plans.status.active')
                        : i18n.t('admin.plans.status.inactive')}
                    </Text>
                  </View>
                </View>

                <View style={styles.planDetails}>
                  <Text style={styles.detailText}>
                    {i18n.t('admin.plans.storage')}: {plan.storageLimitMB}MB
                  </Text>
                  <Text style={styles.detailText}>
                    {i18n.t('admin.plans.credits')}: {plan.credits}
                  </Text>
                  <Text style={styles.detailText}>
                    {i18n.t('admin.plans.price')}: ${plan.price}
                  </Text>
                  <Text style={styles.detailText}>
                    {i18n.t('admin.plans.eventTypes')}: {plan.typeEventAllowed.join(', ')}
                  </Text>
                </View>

                <View style={styles.featuresList}>
                  {plan.features.map((feature, index) => (
                    <View key={index} style={styles.featureItem}>
                      <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                      <Text style={styles.featureText}>{feature}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.planActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => setEditingPlan(plan)}
                  >
                    <Ionicons name="create-outline" size={24} color="#007AFF" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleToggleActive(plan)}
                  >
                    <Ionicons
                      name={plan.active ? "eye-off-outline" : "eye-outline"}
                      size={24}
                      color={plan.active ? "#F44336" : "#4CAF50"}
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
  planItem: {
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
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  planName: {
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
  planDetails: {
    marginBottom: 15,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  featuresList: {
    marginBottom: 15,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  featureText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#333',
  },
  planActions: {
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