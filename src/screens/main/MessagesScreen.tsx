import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { useMessages } from '../../contexts/MessagesContext';
import { chatService, userService } from '../../services/firebaseService';
import { Chat, User } from '../../types';

export const MessagesScreen: React.FC = () => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { refreshUnreadCount } = useMessages();
  const navigation = useNavigation();

  useEffect(() => {
    if (user) {
      loadChats();
      // Actualizar contador de mensajes no leídos cuando se abre la pantalla
      refreshUnreadCount();
    }
  }, [user, refreshUnreadCount]);

  const loadChats = async () => {
    try {
      if (!user) return;
      
      const userChats = await chatService.getUserChats(user.id);
      
      // Obtener información de los otros participantes
      const chatsWithUserInfo = await Promise.all(
        userChats.map(async (chat) => {
          const otherParticipantId = chat.participants.find(id => id !== user.id);
          if (otherParticipantId) {
            const otherUser = await userService.getUser(otherParticipantId);
            return {
              ...chat,
              otherUser,
            };
          }
          return chat;
        })
      );

      setChats(chatsWithUserInfo);
    } catch (error) {
      console.error('Error loading chats:', error);
      Alert.alert('Error', 'No se pudieron cargar los mensajes');
    } finally {
      setLoading(false);
    }
  };

  const openChat = (chat: Chat & { otherUser?: User }) => {
    if (!chat.otherUser) {
      Alert.alert('Error', 'No se pudo cargar la información del contacto');
      return;
    }

    (navigation as any).navigate('Chat', {
      chatId: chat.id,
      otherUserId: chat.otherUser.id,
      vehicleId: chat.vehicleId,
      // Nota: El objeto vehicle se obtendrá automáticamente en ChatScreen 
      // usando vehicleId si no se proporciona
    });
  };

  const formatLastMessageTime = (date: Date | undefined): string => {
    if (!date || !(date instanceof Date) || Number.isNaN(date.getTime())) {
      return '';
    }

    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Ahora';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    
    return date.toLocaleDateString();
  };

  const renderChatItem = ({ item }: { item: Chat & { otherUser?: User } }) => {
    const hasUnreadMessages = item.lastMessage && 
      item.lastMessage.senderId !== user?.id && 
      !item.lastMessage.read;

    // Determinar el rol del OTRO usuario (no el actual)
    // Si yo soy el owner del vehículo, el otro es comprador
    // Si yo NO soy el owner, el otro es propietario
    const isOwner = item.ownerId === user?.id;
    const roleText = isOwner ? 'Comprador interesado' : 'Propietario del vehículo';
    const otherUserName = item.otherUser?.displayName || 'Usuario';

    return (
      <TouchableOpacity style={styles.chatItem} onPress={() => openChat(item)}>
        <View style={styles.avatarContainer}>
          <Image
            source={{ 
              uri: item.otherUser?.photoURL || 'https://via.placeholder.com/50x50' 
            }}
            style={styles.avatar}
          />
          {hasUnreadMessages && <View style={styles.unreadIndicator} />}
        </View>

        <View style={styles.chatContent}>
          <View style={styles.chatHeader}>
            <View style={styles.userInfo}>
              <Text style={styles.userName} numberOfLines={1}>
                {otherUserName}
              </Text>
              <Text style={styles.roleText} numberOfLines={1}>
                {roleText}
              </Text>
            </View>
            {item.lastMessage?.timestamp && (
              <Text style={styles.messageTime}>
                {formatLastMessageTime(item.lastMessage.timestamp)}
              </Text>
            )}
          </View>

          {item.vehicleTitle && (
            <Text style={styles.vehicleTitle} numberOfLines={1}>
              🚗 {item.vehicleTitle}
            </Text>
          )}

          <View style={styles.messagePreview}>
            <Text 
              style={[
                styles.lastMessage,
                hasUnreadMessages && styles.unreadMessage
              ]} 
              numberOfLines={2}
            >
              {item.lastMessage ? item.lastMessage.text : 'Inicia una conversación'}
            </Text>
            {hasUnreadMessages && <View style={styles.unreadBadge} />}
          </View>
        </View>

        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="chatbubbles-outline" size={80} color="#9CA3AF" />
      <Text style={styles.emptyTitle}>No tienes mensajes</Text>
      <Text style={styles.emptyMessage}>
        Cuando alguien se interese en tus vehículos o contactes a otros usuarios, 
        aparecerá aquí.
      </Text>
      <TouchableOpacity 
        style={styles.exploreButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.exploreButtonText}>Explorar vehículos</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Ionicons name="chatbubbles" size={50} color="#3B82F6" />
          <Text style={styles.loadingText}>Cargando mensajes...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mensajes</Text>
      </View>

      <FlatList
        data={chats}
        renderItem={renderChatItem}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={chats.length === 0 ? styles.emptyListContainer : undefined}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
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
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  composeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#EBF4FF',
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  unreadIndicator: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  chatContent: {
    flex: 1,
    marginRight: 12,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  roleText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  messageTime: {
    fontSize: 12,
    color: '#9CA3AF',
    marginLeft: 8,
  },
  vehicleTitle: {
    fontSize: 14,
    color: '#3B82F6',
    marginBottom: 4,
  },
  messagePreview: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
  },
  unreadMessage: {
    color: '#111827',
    fontWeight: '500',
  },
  unreadBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3B82F6',
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyListContainer: {
    flexGrow: 1,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
  exploreButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
  },
  exploreButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});