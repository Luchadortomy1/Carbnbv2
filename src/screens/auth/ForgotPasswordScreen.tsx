import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { CustomButton } from '../../components/CustomButton';
import { CustomInput } from '../../components/CustomInput';
import { AuthStackParamList } from '../../types';

type ForgotPasswordScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'ForgotPassword'>;

export const ForgotPasswordScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState('');

  const { resetPassword } = useAuth();
  const navigation = useNavigation<ForgotPasswordScreenNavigationProp>();

  const validateEmail = (): boolean => {
    setError('');

    if (!email.trim()) {
      setError('El email es requerido');
      return false;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Ingresa un email válido');
      return false;
    }

    return true;
  };

  const handleResetPassword = async () => {
    if (!validateEmail()) return;

    try {
      setLoading(true);
      await resetPassword(email.trim());
      setEmailSent(true);
      Alert.alert(
        'Email enviado',
        'Revisa tu correo electrónico para restablecer tu contraseña.',
        [
          {
            text: 'Entendido',
            onPress: () => navigation.navigate('Login'),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Error al enviar el email');
    } finally {
      setLoading(false);
    }
  };

  const navigateToLogin = () => {
    navigation.navigate('Login');
  };

  if (emailSent) {
    return (
      <View style={styles.container}>
        <View style={styles.successContainer}>
          <Ionicons name="checkmark-circle" size={80} color="#10B981" />
          <Text style={styles.successTitle}>Email enviado</Text>
          <Text style={styles.successMessage}>
            Hemos enviado las instrucciones para restablecer tu contraseña a{' '}
            <Text style={styles.email}>{email}</Text>
          </Text>
          <CustomButton
            title="Regresar al inicio"
            onPress={navigateToLogin}
            style={styles.backButton}
          />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={navigateToLogin} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#3B82F6" />
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="lock-closed-outline" size={60} color="#3B82F6" />
          </View>
          <Text style={styles.title}>¿Olvidaste tu contraseña?</Text>
          <Text style={styles.description}>
            No te preocupes, ingresa tu email y te enviaremos instrucciones para restablecerla.
          </Text>
        </View>

        <View style={styles.form}>
          <CustomInput
            label="Email"
            placeholder="tu@email.com"
            value={email}
            onChangeText={setEmail}
            error={error}
            icon="mail-outline"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />

          <CustomButton
            title="Enviar instrucciones"
            onPress={handleResetPassword}
            loading={loading}
            style={styles.sendButton}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>¿Recordaste tu contraseña? </Text>
          <TouchableOpacity onPress={navigateToLogin}>
            <Text style={styles.footerLink}>Inicia sesión</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 20,
    padding: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  form: {
    flex: 1,
    marginBottom: 24,
  },
  sendButton: {
    marginTop: 24,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 16,
    color: '#6B7280',
  },
  footerLink: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '600',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#111827',
    marginTop: 24,
    marginBottom: 16,
  },
  successMessage: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  email: {
    fontWeight: '600',
    color: '#3B82F6',
  },
});