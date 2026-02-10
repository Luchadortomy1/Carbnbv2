import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';

interface GooglePayButtonProps {
  onPress: () => void;
  disabled?: boolean;
  amount?: number;
}

export const GooglePayButton: React.FC<GooglePayButtonProps> = ({ 
  onPress, 
  disabled = false, 
  amount 
}) => {
  const getButtonText = () => {
    if (amount) {
      return `Pagar $${amount.toFixed(2)}`;
    }
    return 'Pagar con';
  };

  return (
    <TouchableOpacity
      style={[styles.container, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <View style={styles.content}>
        <Text style={styles.payText}>{getButtonText()}</Text>
        <View style={styles.googlePayLogo}>
          <Text style={styles.googleG}>G</Text>
          <View style={styles.payContainer}>
            <Text style={styles.payTextScaled}>Pay</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000000',
    borderRadius: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  disabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.6,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  payText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    marginRight: 8,
    fontFamily: 'Roboto, Arial, sans-serif',
  },
  googlePayLogo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  googleG: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Roboto, Arial, sans-serif',
  },
  payContainer: {
    marginLeft: 1,
  },
  payTextScaled: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'normal',
    fontFamily: 'Roboto, Arial, sans-serif',
    letterSpacing: -0.5,
  },
});