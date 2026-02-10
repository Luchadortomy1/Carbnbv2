import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, TouchableOpacityProps, StyleSheet, View } from 'react-native';

interface CustomButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
}

export const CustomButton: React.FC<CustomButtonProps> = ({
  title,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled,
  style,
  ...props
}) => {
  const buttonStyle = [
    styles.button,
    styles[`button_${size}`],
    styles[`button_${variant}`],
    (disabled || loading) && styles.buttonDisabled,
    style,
  ];

  const textStyle = [
    styles.text,
    styles[`text_${size}`],
    styles[`text_${variant}`],
  ];

  return (
    <TouchableOpacity
      style={buttonStyle}
      disabled={disabled || loading}
      {...props}
    >
      <View style={styles.content}>
        {loading && (
          <ActivityIndicator 
            size="small" 
            color={variant === 'primary' ? 'white' : '#3B82F6'} 
            style={styles.loader}
          />
        )}
        <Text style={textStyle}>{title}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loader: {
    marginRight: 8,
  },
  button: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button_small: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  button_medium: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  button_large: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  button_primary: {
    backgroundColor: '#3B82F6',
  },
  button_secondary: {
    backgroundColor: '#E5E7EB',
  },
  button_outline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  text: {
    fontWeight: '600',
  },
  text_small: {
    fontSize: 14,
  },
  text_medium: {
    fontSize: 16,
  },
  text_large: {
    fontSize: 18,
  },
  text_primary: {
    color: 'white',
  },
  text_secondary: {
    color: '#374151',
  },
  text_outline: {
    color: '#3B82F6',
  },
});