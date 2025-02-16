import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface LineChartProps {
  data: number[];
  labels: string[];
  color: string;
}

export function LineChart({ data, labels, color }: LineChartProps) {
  const maxValue = Math.max(...data, 1);
  const points = data.map((value, index) => ({
    x: (index / (data.length - 1)) * 100,
    y: ((maxValue - value) / maxValue) * 100,
  }));

  const path = points
    .map((point, index) => 
      `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
    )
    .join(' ');

  return (
    <View style={styles.container}>
      <View style={styles.chart}>
        <svg
          style={styles.svg}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <path
            d={path}
            stroke={color}
            strokeWidth="2"
            fill="none"
          />
        </svg>

        <View style={styles.gridLines}>
          {[0, 1, 2, 3].map(i => (
            <View
              key={i}
              style={[styles.gridLine, { top: `${(i / 3) * 100}%` }]}
            />
          ))}
        </View>
      </View>

      <View style={styles.labels}>
        {labels.filter((_, i) => i % 5 === 0).map((label, i) => (
          <Text key={i} style={styles.label}>
            {label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 200,
  },
  chart: {
    flex: 1,
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#ddd',
    marginBottom: 20,
  },
  svg: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  gridLines: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  gridLine: {
    position: 'absolute',
    width: '100%',
    height: 1,
    backgroundColor: '#f0f0f0',
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  label: {
    fontSize: 12,
    color: '#666',
  },
});