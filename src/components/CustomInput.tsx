import React, { useState } from 'react';
import { TextInput, View, Text, StyleSheet, TextInputProps, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface CustomInputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  secureTextEntry?: boolean;
}

export const CustomInput: React.FC<CustomInputProps> = ({
  label,
  error,
  icon,
  secureTextEntry,
  style,
  ...props
}) => {
  const [isSecureTextVisible, setIsSecureTextVisible] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const getIconColor = (hasError?: string, focused?: boolean) => {
    if (hasError) return '#EF4444';
    if (focused) return '#3B82F6';
    return '#9CA3AF';
  };

  const toggleSecureTextVisibility = () => {
    setIsSecureTextVisible(!isSecureTextVisible);
  };

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[
        styles.inputContainer,
        isFocused && styles.inputContainerFocused,
        error && styles.inputContainerError
      ]}>
        {icon && (
          <Ionicons 
            name={icon} 
            size={20} 
            color={getIconColor(error, isFocused)} 
            style={styles.icon}
          />
        )}
        <TextInput
          style={[styles.input, icon && styles.inputWithIcon]}
          secureTextEntry={secureTextEntry && !isSecureTextVisible}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholderTextColor="#9CA3AF"
          {...props}
        />
        {secureTextEntry && (
          <TouchableOpacity
            onPress={toggleSecureTextVisibility}
            style={styles.eyeIcon}
          >
            <Ionicons
              name={isSecureTextVisible ? 'eye-off' : 'eye'}
              size={20}
              color="#9CA3AF"
            />
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 12,
    minHeight: 48,
  },
  inputContainerFocused: {
    borderColor: '#3B82F6',
    backgroundColor: '#FFFFFF',
  },
  inputContainerError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    paddingVertical: 12,
  },
  inputWithIcon: {
    marginLeft: 8,
  },
  icon: {
    marginRight: 8,
  },
  eyeIcon: {
    padding: 4,
  },
  error: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },
});