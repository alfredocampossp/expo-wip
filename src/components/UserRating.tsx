import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface UserRatingProps {
  rating: number;
  reviewCount: number;
  showCount?: boolean;
}

export function UserRating({ rating, reviewCount, showCount = true }: UserRatingProps) {
  const roundedRating = Math.round(rating * 2) / 2;
  const fullStars = Math.floor(roundedRating);
  const hasHalfStar = roundedRating % 1 !== 0;

  return (
    <View style={styles.container}>
      <View style={styles.starsContainer}>
        {[...Array(5)].map((_, index) => {
          if (index < fullStars) {
            return <Ionicons key={index} name="star" size={16} color="#FFD700" />;
          } else if (index === fullStars && hasHalfStar) {
            return <Ionicons key={index} name="star-half" size={16} color="#FFD700" />;
          } else {
            return <Ionicons key={index} name="star-outline" size={16} color="#FFD700" />;
          }
        })}
      </View>
      <Text style={styles.ratingText}>
        {rating.toFixed(1)}
        {showCount && ` (${reviewCount})`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    marginRight: 5,
  },
  ratingText: {
    fontSize: 14,
    color: '#666',
  },
});