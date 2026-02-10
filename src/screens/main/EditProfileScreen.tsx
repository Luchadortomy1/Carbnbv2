import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../contexts/AuthContext';
import { CustomButton } from '../../components/CustomButton';
import { userService } from '../../services/firebaseService';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../config/firebaseConfig';

interface EditProfileScreenProps {
  navigation: any;
}

export const EditProfileScreen: React.FC<EditProfileScreenProps> = ({ navigation }) => {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    displayName: user?.displayName || '',
    phoneNumber: user?.phoneNumber || '',
    photoURL: user?.photoURL || '',
  });

  const handleImagePicker = async () => {
    try {
      // Pedir permisos
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permisos requeridos', 'Necesitas dar permisos para acceder a la galería de fotos.');
        return;
      }

      // Opciones para seleccionar imagen
      Alert.alert(
        'Cambiar foto de perfil',
        'Elige una opción',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Galería', onPress: () => void pickFromGallery() },
          { text: 'Cámara', onPress: () => void pickFromCamera() },
        ]
      );
    } catch (error) {
      console.error('Error requesting permissions:', error);
      Alert.alert('Error', 'No se pudieron obtener los permisos necesarios');
    }
  };

  const pickFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setProfileData(prev => ({ ...prev, photoURL: result.assets[0].uri }));
      }
    } catch (error) {
      console.error('Error picking image from gallery:', error);
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
    }
  };

  const pickFromCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permisos requeridos', 'Necesitas dar permisos para usar la cámara.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setProfileData(prev => ({ ...prev, photoURL: result.assets[0].uri }));
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'No se pudo tomar la foto');
    }
  };

  const uploadImage = async (imageUri: string): Promise<string> => {
    try {

      const response = await fetch(imageUri);
      const blob = await response.blob();
      const imageRef = ref(storage, `profile_images/${user?.id}_${Date.now()}`);
      
      await uploadBytes(imageRef, blob);
      const downloadURL = await getDownloadURL(imageRef);

      return downloadURL;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  };

  const handleSave = async () => {
    if (!user) return;

    if (!profileData.displayName.trim()) {
      Alert.alert('Error', 'El nombre es requerido');
      return;
    }

    if (profileData.phoneNumber && !isValidPhoneNumber(profileData.phoneNumber)) {
      Alert.alert('Error', 'Introduce un número de teléfono válido');
      return;
    }

    setLoading(true);
    try {


      let finalPhotoURL = profileData.photoURL;

      // Si la foto es una URI local (nueva imagen), subirla a Firebase Storage
      if (profileData.photoURL && !profileData.photoURL.startsWith('http')) {

        finalPhotoURL = await uploadImage(profileData.photoURL);
      }

      // Actualizar usuario en Firebase
      await userService.updateUser(user.id, {
        displayName: profileData.displayName.trim(),
        phoneNumber: profileData.phoneNumber.trim(),
        photoURL: finalPhotoURL,
      });



      // Refrescar los datos del usuario
      await refreshUser();

      // Verificar si el usuario agregó teléfono por primera vez
      const addedPhoneNumber = !user.phoneNumber && profileData.phoneNumber.trim();

      Alert.alert(
        'Éxito',
        addedPhoneNumber 
          ? '¡Perfecto! Ya puedes publicar vehículos. Tu número de teléfono ha sido agregado correctamente.'
          : 'Perfil actualizado correctamente.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'No se pudo actualizar el perfil: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const isValidPhoneNumber = (phone: string): boolean => {
    // Validación básica para números de teléfono
    const phoneRegex = /^[+]?[1-9]\d{0,15}$/;
    return phoneRegex.test(phone.replaceAll(/\s+/g, ''));
  };

  const renderProfileImage = () => (
    <TouchableOpacity style={styles.imageContainer} onPress={handleImagePicker}>
      {profileData.photoURL ? (
        <Image source={{ uri: profileData.photoURL }} style={styles.profileImage} />
      ) : (
        <View style={styles.placeholderImage}>
          <Ionicons name="person" size={50} color="#9CA3AF" />
        </View>
      )}
      <View style={styles.imageOverlay}>
        <Ionicons name="camera" size={24} color="#FFFFFF" />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.title}>Editar Perfil</Text>
        <View style={styles.placeholder} />
      </View>

      <KeyboardAvoidingView 
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.imageSection}>
            {renderProfileImage()}
            <Text style={styles.imageHint}>Toca para cambiar tu foto de perfil</Text>
          </View>

          <View style={styles.formSection}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nombre completo *</Text>
              <TextInput
                style={styles.input}
                value={profileData.displayName}
                onChangeText={(text) => setProfileData(prev => ({ ...prev, displayName: text }))}
                placeholder="Introduce tu nombre completo"
                maxLength={50}
              />
            </View>

            {/* Alerta para usuarios sin teléfono */}
            {(!profileData.phoneNumber || profileData.phoneNumber.trim() === '') && (
              <View style={styles.alertCard}>
                <Ionicons name="warning" size={24} color="#F59E0B" />
                <View style={styles.alertContent}>
                  <Text style={styles.alertTitle}>📱 Teléfono Requerido para Publicar</Text>
                  <Text style={styles.alertText}>
                    Para publicar vehículos necesitas agregar tu número de teléfono. Esto permite que los interesados puedan contactarte de manera segura.
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Número de teléfono
                {(!profileData.phoneNumber || profileData.phoneNumber.trim() === '') && (
                  <Text style={styles.requiredText}> *</Text>
                )}
              </Text>
              <TextInput
                style={[
                  styles.input,
                  (!profileData.phoneNumber || profileData.phoneNumber.trim() === '') && styles.inputRequired
                ]}
                value={profileData.phoneNumber}
                onChangeText={(text) => setProfileData(prev => ({ ...prev, phoneNumber: text }))}
                placeholder="Introduce tu número de teléfono"
                keyboardType="phone-pad"
                maxLength={20}
              />
              <Text style={styles.hint}>
                Este número se mostrará a los usuarios cuando aceptes una reserva
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, styles.inputDisabled]}
                value={user?.email || ''}
                editable={false}
              />
              <Text style={styles.hint}>
                El email no se puede cambiar desde aquí
              </Text>
            </View>
          </View>

          <View style={styles.infoSection}>
            <View style={styles.infoCard}>
              <Ionicons name="information-circle" size={24} color="#3B82F6" />
              <View style={styles.infoText}>
                <Text style={styles.infoTitle}>¿Por qué necesitamos esta información?</Text>
                <Text style={styles.infoDescription}>
                  • Tu nombre se muestra a otros usuarios{'\n'}
                  • Tu foto ayuda a identificarte{'\n'}
                  • Tu teléfono se comparte solo cuando aceptas una reserva
                </Text>
              </View>
            </View>

            <View style={styles.infoCard}>
              <Ionicons name="shield-checkmark" size={24} color="#10B981" />
              <View style={styles.infoText}>
                <Text style={styles.infoTitle}>Tu privacidad es importante</Text>
                <Text style={styles.infoDescription}>
                  Solo compartimos tu información de contacto con usuarios que tienen reservas confirmadas contigo.
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>

        <View style={styles.bottomSection}>
          <CustomButton
            title={loading ? "Guardando..." : "Guardar Cambios"}
            onPress={handleSave}
            disabled={loading}
            style={styles.saveButton}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  imageSection: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  placeholderImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#3B82F6',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  imageHint: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  formSection: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 24,
    marginTop: 16,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  inputDisabled: {
    backgroundColor: '#F9FAFB',
    color: '#6B7280',
  },
  hint: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 6,
    lineHeight: 18,
  },
  infoSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 16,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  infoDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  bottomSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  saveButton: {
    marginBottom: 0,
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  alertContent: {
    flex: 1,
    marginLeft: 12,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 4,
  },
  alertText: {
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
  },
  requiredText: {
    color: '#EF4444',
    fontWeight: '600',
  },
  inputRequired: {
    borderColor: '#F59E0B',
    borderWidth: 2,
    backgroundColor: '#FFFBF5',
  },
});