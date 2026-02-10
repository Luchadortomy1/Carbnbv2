import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Vehicle } from '../types';

interface CarCardProps {
  vehicle: Vehicle;
  onPress: (vehicle: Vehicle) => void;
}

export const CarCard: React.FC<CarCardProps> = ({ vehicle, onPress }) => {
  const handlePress = () => {
    onPress(vehicle);
  };

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress}>
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: vehicle.images[0] || 'https://via.placeholder.com/300x200' }}
          style={styles.image}
          resizeMode="cover"
        />
      </View>
      
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={1}>
            {vehicle.brand} {vehicle.model}
          </Text>
          <Text style={styles.year}>{vehicle.year}</Text>
        </View>
        
        <View style={styles.details}>
          <View style={styles.detailItem}>
            <Ionicons name="location-outline" size={14} color="#6B7280" />
            <Text style={styles.detailText} numberOfLines={1}>
              {vehicle.location.city}, {vehicle.location.state}
            </Text>
          </View>
          
          <View style={styles.detailItem}>
            <Ionicons name="car-outline" size={14} color="#6B7280" />
            <Text style={styles.detailText}>
              {vehicle.type} • {vehicle.transmission}
            </Text>
          </View>
        </View>
        
        <View style={styles.footer}>
          <View style={styles.ownerInfo}>
            <Image
              source={{ uri: vehicle.ownerPhoto || 'https://via.placeholder.com/30x30' }}
              style={styles.ownerAvatar}
            />
            <Text style={styles.ownerName} numberOfLines={1}>
              {vehicle.ownerName}
            </Text>
          </View>
          
          <View style={styles.priceContainer}>
            <Text style={styles.price}>${vehicle.pricePerDay.toFixed(2)}</Text>
            <Text style={styles.priceUnit}>/día</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  imageContainer: {
    position: 'relative',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 200,
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  year: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
  },
  details: {
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 6,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ownerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  ownerAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 8,
  },
  ownerName: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  price: {
    fontSize: 20,
    fontWeight: '700',
    color: '#3B82F6',
  },
  priceUnit: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 2,
  },
});