import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TextInput } from 'react-native';
import { Layout } from '../src/components/Layout';
import { Button } from '../src/components/Button';
import { auth, db } from '../src/services/firebase';
import { collection, query, where, getDocs, addDoc, doc, getDoc, updateDoc, runTransaction } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import i18n from '../src/i18n';
import type { Event, Review, User } from '../src/types';

interface PendingReview {
  event: Event;
  otherUser: User;
}

export default function ReviewsPendingScreen() {
  const [pendingReviews, setPendingReviews] = useState<PendingReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReview, setSelectedReview] = useState<PendingReview | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  useEffect(() => {
    loadPendingReviews();
  }, []);

  const loadPendingReviews = async () => {
    if (!auth.currentUser) return;

    try {
      // Get user's role
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      const userRole = userDoc.data()?.role;

      // Get completed events where user participated
      const eventsQuery = userRole === 'artist'
        ? query(
            collection(db, 'candidacies'),
            where('artistId', '==', auth.currentUser.uid),
            where('status', '==', 'APROVADA')
          )
        : query(
            collection(db, 'events'),
            where('creatorId', '==', auth.currentUser.uid),
            where('status', '==', 'CONCLUIDO')
          );

      const eventsSnapshot = await getDocs(eventsQuery);

      // Get events that haven't been reviewed
      const pending: PendingReview[] = [];
      
      for (const eventDoc of eventsSnapshot.docs) {
        const eventData = eventDoc.data();
        const eventId = eventRole === 'artist' ? eventData.eventId : eventDoc.id;

        // Check if already reviewed
        const reviewsQuery = query(
          collection(db, 'reviews'),
          where('eventId', '==', eventId),
          where('reviewerId', '==', auth.currentUser.uid)
        );
        const reviewsSnapshot = await getDocs(reviewsQuery);

        if (reviewsSnapshot.empty) {
          const event = (await getDoc(doc(db, 'events', eventId))).data() as Event;
          const otherUserId = userRole === 'artist' ? event.creatorId : eventData.artistId;
          const otherUser = (await getDoc(doc(db, 'users', otherUserId))).data() as User;

          pending.push({ event, otherUser });
        }
      }

      setPendingReviews(pending);
    } catch (error) {
      console.error('Error loading pending reviews:', error);
      Alert.alert(i18n.t('common.error.unknown'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!auth.currentUser || !selectedReview) return;

    try {
      await runTransaction(db, async (transaction) => {
        // Create review
        const reviewRef = doc(collection(db, 'reviews'));
        transaction.set(reviewRef, {
          reviewerId: auth.currentUser!.uid,
          reviewedId: selectedReview.otherUser.id,
          eventId: selectedReview.event.id,
          rating,
          comment,
          createdAt: new Date(),
        });

        // Update user's rating
        const userRef = doc(db, 'users', selectedReview.otherUser.id);
        const userDoc = await transaction.get(userRef);
        const userData = userDoc.data() as User;

        const newReviewCount = (userData.reviewCount || 0) + 1;
        const currentRating = userData.rating || 0;
        const newRating = ((currentRating * (newReviewCount - 1)) + rating) / newReviewCount;

        transaction.update(userRef, {
          rating: newRating,
          reviewCount: newReviewCount,
        });
      });

      Alert.alert(i18n.t('reviews.success.submitted'));
      setSelectedReview(null);
      setRating(5);
      setComment('');
      loadPendingReviews();
    } catch (error) {
      console.error('Error submitting review:', error);
      Alert.alert(i18n.t('common.error.unknown'));
    }
  };

  const renderStars = (count: number, onPress?: (value: number) => void) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((value) => (
          <Ionicons
            key={value}
            name={value <= count ? "star" : "star-outline"}
            size={24}
            color="#FFD700"
            onPress={() => onPress?.(value)}
          />
        ))}
      </View>
    );
  };

  return (
    <Layout>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="star" size={32} color="#007AFF" />
          <Text style={styles.title}>{i18n.t('reviews.pending.title')}</Text>
        </View>

        {selectedReview ? (
          <View style={styles.reviewForm}>
            <Text style={styles.subtitle}>
              {i18n.t('reviews.form.title', { name: selectedReview.otherUser.email })}
            </Text>

            <Text style={styles.label}>{i18n.t('reviews.form.rating')}</Text>
            {renderStars(rating, setRating)}

            <Text style={styles.label}>{i18n.t('reviews.form.comment')}</Text>
            <TextInput
              style={styles.input}
              value={comment}
              onChangeText={setComment}
              multiline
              numberOfLines={4}
              placeholder={i18n.t('reviews.form.commentPlaceholder')}
            />

            <View style={styles.formButtons}>
              <Button
                title={i18n.t('reviews.form.submit')}
                onPress={handleSubmitReview}
              />
              <Button
                title={i18n.t('common.button.cancel')}
                onPress={() => setSelectedReview(null)}
                variant="secondary"
              />
            </View>
          </View>
        ) : (
          pendingReviews.map((review) => (
            <View key={review.event.id} style={styles.reviewItem}>
              <View style={styles.eventInfo}>
                <Text style={styles.eventTitle}>{review.event.title}</Text>
                <Text style={styles.eventDate}>
                  {new Date(review.event.endDate).toLocaleDateString()}
                </Text>
              </View>

              <View style={styles.userInfo}>
                <Ionicons name="person" size={20} color="#666" />
                <Text style={styles.userName}>{review.otherUser.email}</Text>
              </View>

              <Button
                title={i18n.t('reviews.pending.writeReview')}
                onPress={() => setSelectedReview(review)}
              />
            </View>
          ))
        )}

        {!loading && pendingReviews.length === 0 && (
          <Text style={styles.emptyText}>
            {i18n.t('reviews.pending.empty')}
          </Text>
        )}
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
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  reviewItem: {
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
  eventInfo: {
    marginBottom: 10,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  eventDate: {
    fontSize: 14,
    color: '#666',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  userName: {
    fontSize: 16,
    marginLeft: 10,
  },
  reviewForm: {
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
  label: {
    fontSize: 16,
    marginBottom: 5,
    color: '#333',
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    marginBottom: 15,
    borderRadius: 8,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  formButtons: {
    gap: 10,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    marginTop: 20,
  },
});