// app/(tabs)/home.tsx

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as authService from '../../services/authService';
import API_BASE_URL from '../../constants/api';
import axios from 'axios';

export default function Home() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const token = await authService.getAccessToken();
      if (!token) {
        router.push('/(auth)/signin');
        return;
      }

      const response = await axios.get(`${API_BASE_URL}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data.success && response.data.data.user) {
        setFullName(response.data.data.user.fullName);
      }
    } catch (error) {
      console.log('Error fetching user:', error);
    } finally {
      setLoading(false);
    }
  };

  const performSignOut = () => {
    console.log('🔵 Signing out...');
    setModalVisible(false);
    authService.clearTokens()
      .then(() => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
        }
        console.log('🟢 Tokens cleared, redirecting...');
        router.push('/(auth)/signin');
      })
      .catch((error) => {
        console.log('❌ Clear tokens error:', error);
        router.push('/(auth)/signin');
      });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#3b5bdb" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to iGraph, {fullName || 'User'}!</Text>
      <Text style={styles.subtitle}>Learn SDLC and Create UML Diagrams</Text>

      <TouchableOpacity style={styles.logoutButton} onPress={() => setModalVisible(true)}>
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
<hr />
      <Text style={styles.subtitle1}>UNDER DEVELOPMENT</Text>
      <Text style={styles.subtitle}>NAGBAKASYON MUNA YUNG PROGRAMMER AHAHHA</Text>

      {/* Custom Modal for Sign Out Confirmation - Works on PWA! */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Sign Out</Text>
            <Text style={styles.modalMessage}>Are you sure you want to sign out?</Text>
            
            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              
              <Pressable
                style={[styles.modalButton, styles.confirmButton]}
                onPress={performSignOut}
              >
                <Text style={styles.confirmButtonText}>Yes, Sign Out</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#eef2ff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1f36',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 40,
    textAlign: 'center',
  },
    subtitle1: {
    fontSize: 20,
    color: '#64748b',
    marginBottom: 40,
    textAlign: 'center',
  },
  logoutButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 10,
  },
  logoutText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    width: '80%',
    maxWidth: 320,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1f36',
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
  },
  confirmButton: {
    backgroundColor: '#ef4444',
  },
  cancelButtonText: {
    color: '#4a5568',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});