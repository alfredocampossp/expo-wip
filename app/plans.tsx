import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, Platform } from 'react-native';
import { Layout } from '../src/components/Layout';
import { Button } from '../src/components/Button';
import { auth, db } from '../src/services/firebase';
import { collection, doc, getDoc, updateDoc, addDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import i18n from '../src/i18n';
import type { Plan, User } from '../src/types';

const MOCK_STRIPE_CHECKOUT = 'https://stripe.com/checkout';

const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    features: [
      '100MB Storage',
      '10 Credits/month',
      '20 Messages/day',
      '3 Genres max',
      'Basic Events only'
    ],
    limits: {
      storage: 100,
      credits: 10,
      messages: 20,
      genres: 3,
      events: 1
    }
  },
  {
    id: 'paid',
    name: 'Premium',
    price: 29.99,
    features: [
      '2GB Storage',
      'Unlimited Credits',
      'Unlimited Messages',
      'Unlimited Genres',
      'All Event Types',
      'Priority Support'
    ],
    limits: {
      storage: 2048,
      credits: -1,
      messages: -1,
      genres: -1,
      events: -1
    }
  }
];

export default function PlansScreen() {
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserPlan();
  }, []);

  const loadUserPlan = async () => {
    if (!auth.currentUser) return;

    try {
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data() as User;
        setUser(userData);
        setCurrentPlan(PLANS.find(p => p.id === userData.planId) || null);
      }
    } catch (error) {
      console.error('Error loading user plan:', error);
      Alert.alert(i18n.t('common.error.unknown'));
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (plan: Plan) => {
    if (!auth.currentUser) return;

    try {
      // In a real app, this would redirect to Stripe Checkout
      if (Platform.OS === 'web') {
        // Simulate payment success
        await handlePaymentSuccess(plan);
      } else {
        Alert.alert(
          i18n.t('plans.alert.webOnly'),
          i18n.t('plans.alert.webOnlyMessage')
        );
      }
    } catch (error) {
      console.error('Error upgrading plan:', error);
      Alert.alert(i18n.t('common.error.unknown'));
    }
  };

  const handlePaymentSuccess = async (plan: Plan) => {
    if (!auth.currentUser) return;

    try {
      // Create transaction record
      await addDoc(collection(db, 'transactions'), {
        userId: auth.currentUser.uid,
        planId: plan.id,
        status: 'completed',
        amount: plan.price,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Update user's plan
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        planId: plan.id,
        subscriptionStatus: 'active',
        subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      });

      Alert.alert(
        i18n.t('plans.success.title'),
        i18n.t('plans.success.message')
      );

      loadUserPlan();
    } catch (error) {
      console.error('Error processing payment:', error);
      Alert.alert(i18n.t('common.error.unknown'));
    }
  };

  const handleCancel = async () => {
    if (!auth.currentUser) return;

    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        planId: 'free',
        subscriptionStatus: 'canceled',
      });

      Alert.alert(
        i18n.t('plans.cancel.title'),
        i18n.t('plans.cancel.message')
      );

      loadUserPlan();
    } catch (error) {
      console.error('Error canceling subscription:', error);
      Alert.alert(i18n.t('common.error.unknown'));
    }
  };

  return (
    <Layout>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="card" size={32} color="#007AFF" />
          <Text style={styles.title}>{i18n.t('plans.title')}</Text>
        </View>

        {currentPlan && (
          <View style={styles.currentPlan}>
            <Text style={styles.currentPlanText}>
              {i18n.t('plans.current', { plan: currentPlan.name })}
            </Text>
            {user?.planId === 'paid' && (
              <Button
                title={i18n.t('plans.cancel.button')}
                onPress={handleCancel}
                variant="secondary"
              />
            )}
          </View>
        )}

        <View style={styles.plansContainer}>
          {PLANS.map((plan) => (
            <View
              key={plan.id}
              style={[
                styles.planCard,
                plan.id === currentPlan?.id && styles.currentPlanCard
              ]}
            >
              <View style={styles.planHeader}>
                <Text style={styles.planName}>{plan.name}</Text>
                <Text style={styles.planPrice}>
                  ${plan.price.toFixed(2)}/month
                </Text>
              </View>

              <View style={styles.featuresContainer}>
                {plan.features.map((feature, index) => (
                  <View key={index} style={styles.featureItem}>
                    <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>

              {plan.id !== currentPlan?.id && (
                <Button
                  title={i18n.t('plans.upgrade.button')}
                  onPress={() => handleUpgrade(plan)}
                />
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
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 10,
  },
  currentPlan: {
    backgroundColor: '#E3F2FD',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  currentPlanText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
  },
  plansContainer: {
    gap: 20,
  },
  planCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  currentPlanCard: {
    borderColor: '#007AFF',
    borderWidth: 2,
  },
  planHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  planName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  planPrice: {
    fontSize: 18,
    color: '#666',
  },
  featuresContainer: {
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  featureText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
  },
});