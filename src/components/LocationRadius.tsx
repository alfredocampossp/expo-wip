import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Slider from '@react-native-community/slider';
import i18n from '../i18n';

interface LocationRadiusProps {
  radius: number;
  onRadiusChange: (radius: number) => void;
  maxRadius?: number;
  minRadius?: number;
  step?: number;
  disabled?: boolean;
}

export function LocationRadius({
  radius,
  onRadiusChange,
  maxRadius = 200,
  minRadius = 0,
  step = 5,
  disabled = false
}: LocationRadiusProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>{i18n.t('profile.artist.coverageRadius')}</Text>
        <Text style={[styles.value, disabled && styles.valueDisabled]}>
          {radius} km
        </Text>
      </View>
      
      <View style={styles.sliderContainer}>
        <Slider
          style={styles.slider}
          minimumValue={minRadius}
          maximumValue={maxRadius}
          step={step}
          value={radius}
          onValueChange={onRadiusChange}
          minimumTrackTintColor={disabled ? '#ccc' : '#007AFF'}
          maximumTrackTintColor="#ddd"
          thumbTintColor={disabled ? '#ccc' : '#007AFF'}
          enabled={!disabled}
        />
      </View>
      
      <View style={styles.rangeLabels}>
        <Text style={[styles.rangeText, disabled && styles.rangeTextDisabled]}>
          {minRadius} km
        </Text>
        <Text style={[styles.rangeText, disabled && styles.rangeTextDisabled]}>
          {maxRadius} km
        </Text>
      </View>

      {disabled && (
        <Text style={styles.disabledMessage}>
          {i18n.t('profile.artist.coverageRadiusDisabled')}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  value: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  valueDisabled: {
    color: '#999',
  },
  sliderContainer: {
    width: '100%',
    height: 40,
    justifyContent: 'center',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  rangeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  rangeText: {
    fontSize: 12,
    color: '#666',
  },
  rangeTextDisabled: {
    color: '#999',
  },
  disabledMessage: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
});