import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LOCATION_CONFIG } from '../config/locationConfig';

interface RadiusSliderProps {
  value: number;
  onValueChange: (value: number) => void;
  minValue?: number;
  maxValue?: number;
  style?: any;
}

export const RadiusSlider: React.FC<RadiusSliderProps> = ({
  value,
  onValueChange,
  minValue = LOCATION_CONFIG.minRadius,
  maxValue = LOCATION_CONFIG.maxRadius,
  style,
}) => {
  const steps = [5, 10, 15, 20, 25, 30, 40, 50];
  
  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <Text style={styles.label}>Radio de búsqueda</Text>
        <Text style={styles.value}>{value} km</Text>
      </View>
      
      <View style={styles.buttonContainer}>
        {steps.map((step) => (
          <TouchableOpacity
            key={step}
            style={[
              styles.stepButton,
              value === step && styles.stepButtonActive,
            ]}
            onPress={() => onValueChange(step)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.stepButtonText,
                value === step && styles.stepButtonTextActive,
              ]}
            >
              {step}km
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
  },
  buttonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginVertical: 8,
  },
  stepButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    minWidth: 55,
    alignItems: 'center',
    marginHorizontal: 4,
    marginVertical: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  stepButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  stepButtonText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  stepButtonTextActive: {
    color: '#FFFFFF',
  },
});