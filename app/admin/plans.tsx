import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Alert, TouchableOpacity } from 'react-native';
import { Layout } from '../../src/components/Layout';
import { Button } from '../../src/components/Button';
import { db } from '../../src/services/firebase';
import { collection, query, where, orderBy, getDocs, doc, setDoc, updateDoc } from 'firebase/firestore';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import i18n from '../../src/i18n';

// Interface do objeto Plan gravado no Firestore
interface Plan {
  id: string;
  name: string;
  credits: number;
  storageLimitMB: number;
  typeEventAllowed: string[];
  price: number;
  stripeProductId?: string;
  stripePriceId?: string;
  profileType: 'artist' | 'contractor';
  isDefault: boolean;
  features: string[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Tipo para controlar abas: "artist" ou "contractor"
type TabType = 'artist' | 'contractor';

// Interface para o form de criação de novo plano
interface NewPlanForm {
  name: string;
  credits: number;
  storageLimitMB: number;
  typeEventAllowed: string[];
  price: number;
  stripeProductId: string;
  stripePriceId: string;
  isDefault: boolean;
  features: string[];
}

export default function AdminPlansScreen() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  // Aba ativa: "artist" ou "contractor"
  const [activeTab, setActiveTab] = useState<TabType>('artist');

  // Form para criar novo plano (sem profileType, pois vamos usar activeTab)
  const [newPlan, setNewPlan] = useState<NewPlanForm>({
    name: '',
    credits: 0,
    storageLimitMB: 100,
    typeEventAllowed: ['Show'],
    price: 0,
    stripeProductId: '',
    stripePriceId: '',
    isDefault: false,
    features: []
  });

  // Controla a edição de um plano existente
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [featuresInput, setFeaturesInput] = useState('');

  useEffect(() => {
    loadPlans();
  }, []);

  // Carrega todos os planos do Firestore
  const loadPlans = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(
        query(collection(db, 'plans'), orderBy('name', 'asc'))
      );

      const list: Plan[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          name: data.name || '',
          credits: data.credits ?? 0,
          storageLimitMB: data.storageLimitMB ?? 100,
          typeEventAllowed: Array.isArray(data.typeEventAllowed)
            ? data.typeEventAllowed
            : [],
          price: data.price ?? 0,
          stripeProductId: data.stripeProductId || '',
          stripePriceId: data.stripePriceId || '',
          profileType: data.profileType || 'artist', // fallback
          isDefault: !!data.isDefault,
          features: Array.isArray(data.features) ? data.features : [],
          active: data.active ?? false,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        };
      });

      setPlans(list);
    } catch (error) {
      console.error('Error loading plans:', error);
      Alert.alert(i18n.t('common.error.unknown'));
    } finally {
      setLoading(false);
    }
  };

  // Cria um novo plano, usando o activeTab como profileType
  const handleCreate = async () => {
    if (!newPlan.name.trim()) {
      Alert.alert(i18n.t('common.error.requiredFields'));
      return;
    }

    try {
      // Se este plano for default, removemos a flag "isDefault" de outros do mesmo profileType
      if (newPlan.isDefault) {
        const defaultPlanDocs = await getDocs(
          query(
            collection(db, 'plans'),
            where('profileType', '==', activeTab),
            where('isDefault', '==', true)
          )
        );

        const updates = defaultPlanDocs.docs.map((docRef) =>
          updateDoc(docRef.ref, { isDefault: false })
        );
        await Promise.all(updates);
      }

      const planRef = doc(collection(db, 'plans'));
      const now = new Date();

      // Gravamos o profileType de acordo com a aba (activeTab)
      await setDoc(planRef, {
        name: newPlan.name.trim(),
        credits: Number(newPlan.credits),
        storageLimitMB: Number(newPlan.storageLimitMB),
        typeEventAllowed: newPlan.typeEventAllowed,
        price: Number(newPlan.price),
        stripeProductId: newPlan.stripeProductId.trim(),
        stripePriceId: newPlan.stripePriceId.trim(),
        profileType: activeTab,
        isDefault: newPlan.isDefault,
        features: featuresInput.split('\n').filter(Boolean),
        active: true,
        createdAt: now,
        updatedAt: now
      });

      // Resetar o form
      setNewPlan({
        name: '',
        credits: 0,
        storageLimitMB: 100,
        typeEventAllowed: ['Show'],
        price: 0,
        stripeProductId: '',
        stripePriceId: '',
        isDefault: false,
        features: []
      });
      setFeaturesInput('');

      Alert.alert(i18n.t('admin.plans.success.created'));
      loadPlans();
    } catch (error) {
      console.error('Error creating plan:', error);
      Alert.alert(i18n.t('common.error.unknown'));
    }
  };

  // Atualiza um plano existente (mantendo plan.profileType do próprio "plan")
  const handleUpdate = async (plan: Plan) => {
    if (!plan.name.trim()) {
      Alert.alert(i18n.t('common.error.requiredFields'));
      return;
    }

    try {
      // Se for default agora e não era antes, remover "default" de outros
      if (plan.isDefault && editingPlan && !editingPlan.isDefault) {
        const defaultPlanDocs = await getDocs(
          query(
            collection(db, 'plans'),
            where('profileType', '==', plan.profileType),
            where('isDefault', '==', true)
          )
        );

        const updatePromises = defaultPlanDocs.docs.map((docRef) =>
          updateDoc(docRef.ref, { isDefault: false })
        );
        await Promise.all(updatePromises);
      }

      await updateDoc(doc(db, 'plans', plan.id), {
        name: plan.name.trim(),
        credits: Number(plan.credits),
        storageLimitMB: Number(plan.storageLimitMB),
        typeEventAllowed: plan.typeEventAllowed,
        price: Number(plan.price),
        stripeProductId: plan.stripeProductId?.trim(),
        stripePriceId: plan.stripePriceId?.trim(),
        profileType: plan.profileType, // Mantém o profileType original do plano
        isDefault: plan.isDefault,
        features: plan.features,
        updatedAt: new Date()
      });

      setEditingPlan(null);
      Alert.alert(i18n.t('admin.plans.success.updated'));
      loadPlans();
    } catch (error) {
      console.error('Error updating plan:', error);
      Alert.alert(i18n.t('common.error.unknown'));
    }
  };

  // Ativa/Inativa um plano
  const handleToggleActive = async (plan: Plan) => {
    try {
      await updateDoc(doc(db, 'plans', plan.id), {
        active: !plan.active,
        updatedAt: new Date()
      });

      const msg = plan.active
        ? i18n.t('admin.plans.success.deactivated')
        : i18n.t('admin.plans.success.activated');

      Alert.alert(msg);
      loadPlans();
    } catch (error) {
      console.error('Error toggling plan:', error);
      Alert.alert(i18n.t('common.error.unknown'));
    }
  };

  // Filtra os planos pela aba selecionada
  const filteredPlans = plans.filter((p) => p.profileType === activeTab);

  return (
    <Layout>
      <ScrollView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#007AFF" />
            </TouchableOpacity>
            <View style={styles.headerContent}>
              <Ionicons name="card" size={32} color="#007AFF" />
              <Text style={styles.title}>{i18n.t('admin.plans.title')}</Text>
            </View>
          </View>

          {/* Abas para Artist / Contractor */}
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
                {i18n.t('admin.plans.profileType.artist')}
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
                {i18n.t('admin.plans.profileType.contractor')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form para criar um novo plano */}
          <View style={styles.createForm}>
            <Text style={styles.label}>{i18n.t('admin.plans.form.name')}</Text>
            <TextInput
              style={styles.input}
              value={newPlan.name}
              onChangeText={(text) => setNewPlan({ ...newPlan, name: text })}
              placeholder={i18n.t('admin.plans.form.namePlaceholder')}
            />

            <View style={styles.row}>
              <View style={styles.column}>
                <Text style={styles.label}>{i18n.t('admin.plans.form.credits')}</Text>
                <TextInput
                  style={styles.input}
                  value={String(newPlan.credits)}
                  onChangeText={(text) => setNewPlan({ ...newPlan, credits: Number(text) || 0 })}
                  keyboardType="numeric"
                  placeholder="0"
                />
              </View>

              <View style={styles.column}>
                <Text style={styles.label}>{i18n.t('admin.plans.form.storageLimit')}</Text>
                <TextInput
                  style={styles.input}
                  value={String(newPlan.storageLimitMB)}
                  onChangeText={(text) =>
                    setNewPlan({ ...newPlan, storageLimitMB: Number(text) || 0 })
                  }
                  keyboardType="numeric"
                  placeholder="100"
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.column}>
                <Text style={styles.label}>{i18n.t('admin.plans.form.price')}</Text>
                <TextInput
                  style={styles.input}
                  value={String(newPlan.price)}
                  onChangeText={(text) => setNewPlan({ ...newPlan, price: Number(text) || 0 })}
                  keyboardType="numeric"
                  placeholder="0"
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.column}>
                <Text style={styles.label}>{i18n.t('admin.plans.form.stripeProduct')}</Text>
                <TextInput
                  style={styles.input}
                  value={newPlan.stripeProductId}
                  onChangeText={(text) => setNewPlan({ ...newPlan, stripeProductId: text })}
                  placeholder="prod_..."
                />
              </View>

              <View style={styles.column}>
                <Text style={styles.label}>{i18n.t('admin.plans.form.stripePrice')}</Text>
                <TextInput
                  style={styles.input}
                  value={newPlan.stripePriceId}
                  onChangeText={(text) => setNewPlan({ ...newPlan, stripePriceId: text })}
                  placeholder="price_..."
                />
              </View>
            </View>

            <Text style={styles.label}>{i18n.t('admin.plans.form.eventTypes')}</Text>
            <View style={styles.eventTypesContainer}>
              <Button
                title="Show"
                onPress={() => {
                  const hasShow = newPlan.typeEventAllowed.includes('Show');
                  const types = hasShow
                    ? newPlan.typeEventAllowed.filter((t) => t !== 'Show')
                    : [...newPlan.typeEventAllowed, 'Show'];
                  setNewPlan({ ...newPlan, typeEventAllowed: types });
                }}
                variant={newPlan.typeEventAllowed.includes('Show') ? 'primary' : 'secondary'}
              />
              <Button
                title="Festival"
                onPress={() => {
                  const hasFestival = newPlan.typeEventAllowed.includes('Festival');
                  const types = hasFestival
                    ? newPlan.typeEventAllowed.filter((t) => t !== 'Festival')
                    : [...newPlan.typeEventAllowed, 'Festival'];
                  setNewPlan({ ...newPlan, typeEventAllowed: types });
                }}
                variant={newPlan.typeEventAllowed.includes('Festival') ? 'primary' : 'secondary'}
              />
            </View>

            <Text style={styles.label}>{i18n.t('admin.plans.form.features')}</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={featuresInput}
              onChangeText={setFeaturesInput}
              placeholder={i18n.t('admin.plans.form.featuresPlaceholder')}
              multiline
              numberOfLines={4}
            />

            <View style={styles.defaultContainer}>
              <Text style={styles.label}>{i18n.t('admin.plans.form.isDefault')}</Text>
              <Button
                title={newPlan.isDefault ? i18n.t('common.button.enabled') : i18n.t('common.button.disabled')}
                onPress={() => setNewPlan({ ...newPlan, isDefault: !newPlan.isDefault })}
                variant={newPlan.isDefault ? 'primary' : 'secondary'}
              />
            </View>

            <Button
              title={i18n.t('common.button.create')}
              onPress={handleCreate}
              disabled={!newPlan.name.trim()}
            />
          </View>

          {/* Lista de Planos Filtrados pela aba */}
          {filteredPlans.map((plan) => (
            <View key={plan.id} style={styles.planItem}>
              {editingPlan?.id === plan.id ? (
                <View style={styles.editForm}>
                  <Text style={styles.label}>{i18n.t('admin.plans.form.name')}</Text>
                  <TextInput
                    style={styles.input}
                    value={editingPlan.name}
                    onChangeText={(text) => setEditingPlan({ ...editingPlan, name: text })}
                  />

                  <View style={styles.row}>
                    <View style={styles.column}>
                      <Text style={styles.label}>{i18n.t('admin.plans.form.credits')}</Text>
                      <TextInput
                        style={styles.input}
                        value={String(editingPlan.credits)}
                        onChangeText={(text) =>
                          setEditingPlan({ ...editingPlan, credits: Number(text) || 0 })
                        }
                        keyboardType="numeric"
                      />
                    </View>

                    <View style={styles.column}>
                      <Text style={styles.label}>{i18n.t('admin.plans.form.storageLimit')}</Text>
                      <TextInput
                        style={styles.input}
                        value={String(editingPlan.storageLimitMB)}
                        onChangeText={(text) =>
                          setEditingPlan({ ...editingPlan, storageLimitMB: Number(text) || 0 })
                        }
                        keyboardType="numeric"
                      />
                    </View>
                  </View>

                  <View style={styles.row}>
                    <View style={styles.column}>
                      <Text style={styles.label}>{i18n.t('admin.plans.form.price')}</Text>
                      <TextInput
                        style={styles.input}
                        value={String(editingPlan.price)}
                        onChangeText={(text) =>
                          setEditingPlan({ ...editingPlan, price: Number(text) || 0 })
                        }
                        keyboardType="numeric"
                      />
                    </View>
                  </View>

                  <View style={styles.row}>
                    <View style={styles.column}>
                      <Text style={styles.label}>{i18n.t('admin.plans.form.stripeProduct')}</Text>
                      <TextInput
                        style={styles.input}
                        value={editingPlan.stripeProductId}
                        onChangeText={(text) =>
                          setEditingPlan({ ...editingPlan, stripeProductId: text })
                        }
                      />
                    </View>

                    <View style={styles.column}>
                      <Text style={styles.label}>{i18n.t('admin.plans.form.stripePrice')}</Text>
                      <TextInput
                        style={styles.input}
                        value={editingPlan.stripePriceId}
                        onChangeText={(text) =>
                          setEditingPlan({ ...editingPlan, stripePriceId: text })
                        }
                      />
                    </View>
                  </View>

                  <Text style={styles.label}>{i18n.t('admin.plans.form.eventTypes')}</Text>
                  <View style={styles.eventTypesContainer}>
                    <Button
                      title="Show"
                      onPress={() => {
                        const hasShow = editingPlan.typeEventAllowed.includes('Show');
                        const updated = hasShow
                          ? editingPlan.typeEventAllowed.filter((t) => t !== 'Show')
                          : [...editingPlan.typeEventAllowed, 'Show'];
                        setEditingPlan({ ...editingPlan, typeEventAllowed: updated });
                      }}
                      variant={editingPlan.typeEventAllowed.includes('Show') ? 'primary' : 'secondary'}
                    />
                    <Button
                      title="Festival"
                      onPress={() => {
                        const hasFestival = editingPlan.typeEventAllowed.includes('Festival');
                        const updated = hasFestival
                          ? editingPlan.typeEventAllowed.filter((t) => t !== 'Festival')
                          : [...editingPlan.typeEventAllowed, 'Festival'];
                        setEditingPlan({ ...editingPlan, typeEventAllowed: updated });
                      }}
                      variant={editingPlan.typeEventAllowed.includes('Festival') ? 'primary' : 'secondary'}
                    />
                  </View>

                  <Text style={styles.label}>{i18n.t('admin.plans.form.features')}</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={editingPlan.features.join('\n')}
                    onChangeText={(text) =>
                      setEditingPlan({
                        ...editingPlan,
                        features: text.split('\n').filter(Boolean)
                      })
                    }
                    multiline
                    numberOfLines={4}
                  />

                  <View style={styles.defaultContainer}>
                    <Text style={styles.label}>{i18n.t('admin.plans.form.isDefault')}</Text>
                    <Button
                      title={
                        editingPlan.isDefault ? i18n.t('common.button.enabled') : i18n.t('common.button.disabled')
                      }
                      onPress={() =>
                        setEditingPlan({ ...editingPlan, isDefault: !editingPlan.isDefault })
                      }
                      variant={editingPlan.isDefault ? 'primary' : 'secondary'}
                    />
                  </View>

                  <View style={styles.editButtons}>
                    <Button title={i18n.t('common.button.save')} onPress={() => handleUpdate(editingPlan)} />
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
                    <View style={styles.planTitleContainer}>
                      <Text style={styles.planName}>{plan.name}</Text>
                      <View style={styles.badgeContainer}>
                        {plan.isDefault && (
                          <View style={[styles.badge, styles.defaultBadge]}>
                            <Text style={styles.badgeText}>
                              {i18n.t('admin.plans.status.default')}
                            </Text>
                          </View>
                        )}
                        <View style={[styles.badge, plan.active ? styles.activeBadge : styles.inactiveBadge]}>
                          <Text style={[styles.badgeText, plan.active ? styles.activeText : styles.inactiveText]}>
                            {plan.active
                              ? i18n.t('admin.plans.status.active')
                              : i18n.t('admin.plans.status.inactive')}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  <View style={styles.planDetails}>
                    <View style={styles.detailRow}>
                      <Ionicons name="star" size={20} color="#666" />
                      <Text style={styles.detailText}>
                        {i18n.t('admin.plans.credits')}: {plan.credits}
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Ionicons name="server" size={20} color="#666" />
                      <Text style={styles.detailText}>
                        {i18n.t('admin.plans.storage')}: {plan.storageLimitMB}MB
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Ionicons name="cash" size={20} color="#666" />
                      <Text style={styles.detailText}>
                        {i18n.t('admin.plans.price')}: ${plan.price}
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Ionicons name="calendar" size={20} color="#666" />
                      <Text style={styles.detailText}>
                        {i18n.t('admin.plans.eventTypes')}: {plan.typeEventAllowed.join(', ')}
                      </Text>
                    </View>
                  </View>

                  {plan.features.length > 0 && (
                    <View style={styles.featuresContainer}>
                      <Text style={styles.featuresTitle}>{i18n.t('admin.plans.form.features')}</Text>
                      {plan.features.map((feature, index) => (
                        <View key={index} style={styles.featureItem}>
                          <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                          <Text style={styles.featureText}>{feature}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  <View style={styles.planActions}>
                    <TouchableOpacity style={styles.actionButton} onPress={() => setEditingPlan(plan)}>
                      <Ionicons name="create-outline" size={24} color="#007AFF" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionButton} onPress={() => handleToggleActive(plan)}>
                      <Ionicons
                        name={plan.active ? 'eye-off-outline' : 'eye-outline'}
                        size={24}
                        color={plan.active ? '#F44336' : '#4CAF50'}
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

// Estilos
const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  content: {
    flex: 1,
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
    padding: 16
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20
  },
  backButton: {
    padding: 10
  },
  headerContent: {
    flex: 1,
    alignItems: 'center'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 10
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
    elevation: 3
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    gap: 8,
    borderRadius: 6
  },
  activeTab: {
    backgroundColor: '#F0F7FF'
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500'
  },
  activeTabText: {
    color: '#007AFF'
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
    elevation: 3
  },
  label: {
    fontSize: 14,
    marginBottom: 5,
    color: '#333'
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    marginBottom: 12,
    borderRadius: 8,
    fontSize: 14
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top'
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12
  },
  column: {
    flex: 1
  },
  eventTypesContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12
  },
  defaultContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  planItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  planHeader: {
    marginBottom: 12
  },
  planTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  planName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: 8
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  defaultBadge: {
    backgroundColor: '#FFF3E0'
  },
  activeBadge: {
    backgroundColor: '#E8F5E9'
  },
  inactiveBadge: {
    backgroundColor: '#FFEBEE'
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500'
  },
  activeText: {
    color: '#4CAF50'
  },
  inactiveText: {
    color: '#F44336'
  },
  planDetails: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    gap: 8
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  detailText: {
    fontSize: 14,
    color: '#666'
  },
  featuresContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4
  },
  featureText: {
    fontSize: 14,
    color: '#666'
  },
  planActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12
  },
  actionButton: {
    padding: 4
  },
  editForm: {
    gap: 8
  },
  editButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 4
  }
});
