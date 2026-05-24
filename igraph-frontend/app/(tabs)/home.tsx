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
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as authService from '../../services/authService';
import API_BASE_URL from '../../constants/api';
import axios from 'axios';
import { Svg, Path, Circle, Rect } from 'react-native-svg';

// Dashboard Card Component with proper TypeScript typing
interface DashboardCardProps {
  title: string;
  value: string;
  icon: 'document' | 'trending' | 'time';
  color?: string;
}

const DashboardCard = ({ title, value, icon, color = '#4c6fff' }: DashboardCardProps) => (
  <View style={[styles.card, { borderTopColor: color }]}>
    <View style={styles.cardHeader}>
      <Text style={styles.cardTitle}>{title}</Text>
      <View style={[styles.iconCircle, { backgroundColor: color + '20' }]}>
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
          {icon === 'document' && (
            <Path d="M4 4h16v16H4V4z" stroke={color} strokeWidth={1.5} fill="none" />
          )}
          {icon === 'trending' && (
            <Path d="M23 6l-9.5 9.5-5-5L1 18" stroke={color} strokeWidth={1.5} fill="none" />
          )}
          {icon === 'time' && (
            <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={1.5} />
          )}
        </Svg>
      </View>
    </View>
    <Text style={styles.cardValue}>{value}</Text>
    <Text style={styles.cardSubtext}>Total count</Text>
  </View>
);

export default function Home() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [stats, setStats] = useState({
    diagrams: 0,
    progress: 0,
    recentActivity: 'None',
  });

  useEffect(() => {
    let isMounted = true;
    
    const initialize = async () => {
      await fetchUserProfile();
      await fetchStats();
      if (isMounted) {
        setLoading(false);
      }
    };
    
    initialize();
    
    return () => { isMounted = false; };
  }, [router]);

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
    }
  };

  const fetchStats = async () => {
    // Placeholder for actual stats fetching
    // You can replace this with real API calls
    setStats({
      diagrams: 0,
      progress: 0,
      recentActivity: 'No recent activity',
    });
  };

  const performSignOut = () => {
    setModalVisible(false);
    authService.clearTokens()
      .then(() => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
        }
        router.push('/(auth)/signin');
      })
      .catch((error) => {
        console.log('Clear tokens error:', error);
        router.push('/(auth)/signin');
      });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b5bdb" />
        <Text style={styles.loadingText}>Loading your dashboard...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.welcomeText}>Welcome back,</Text>
            <Text style={styles.userName}>{fullName || 'User'}!</Text>
          </View>
          <TouchableOpacity 
            style={styles.logoutButton} 
            onPress={() => setModalVisible(true)}
            accessibilityLabel="Sign out of your account"
            accessibilityRole="button"
          >
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
              <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="#ef4444" strokeWidth={2} strokeLinecap="round"/>
              <Path d="M16 17l4-4-4-4" stroke="#ef4444" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/>
              <Path d="M20 13H9" stroke="#ef4444" strokeWidth={2} strokeLinecap="round"/>
            </Svg>
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <DashboardCard 
            title="Diagrams" 
            value={stats.diagrams.toString()} 
            icon="document" 
            color="#4c6fff"
          />
          <DashboardCard 
            title="Progress" 
            value={`${stats.progress}%`} 
            icon="trending" 
            color="#10b981"
          />
          <DashboardCard 
            title="Activity" 
            value={stats.recentActivity === 'None' ? '0' : '1'} 
            icon="time" 
            color="#f59e0b"
          />
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionGrid}>
            <TouchableOpacity style={styles.actionCard} activeOpacity={0.8}>
              <View style={[styles.actionIcon, { backgroundColor: '#eef2ff' }]}>
                <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                  <Rect x="4" y="4" width="16" height="16" rx="2" stroke="#4c6fff" strokeWidth={1.5}/>
                  <Path d="M8 8h8M8 12h6M8 16h4" stroke="#4c6fff" strokeWidth={1.5} strokeLinecap="round"/>
                </Svg>
              </View>
              <Text style={styles.actionTitle}>Create Diagram</Text>
              <Text style={styles.actionDesc}>Start a new UML diagram</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCard} activeOpacity={0.8}>
              <View style={[styles.actionIcon, { backgroundColor: '#fef3c7' }]}>
                <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                  <Path d="M12 6v6l4 2" stroke="#f59e0b" strokeWidth={1.5} strokeLinecap="round"/>
                  <Circle cx="12" cy="12" r="9" stroke="#f59e0b" strokeWidth={1.5}/>
                </Svg>
              </View>
              <Text style={styles.actionTitle}>Continue Learning</Text>
              <Text style={styles.actionDesc}>SDLC fundamentals</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCard} activeOpacity={0.8}>
              <View style={[styles.actionIcon, { backgroundColor: '#d1fae5' }]}>
                <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                  <Path d="M4 4v16h16V4H4z" stroke="#10b981" strokeWidth={1.5}/>
                  <Path d="M8 12h8M12 8v8" stroke="#10b981" strokeWidth={1.5} strokeLinecap="round"/>
                </Svg>
              </View>
              <Text style={styles.actionTitle}>Templates</Text>
              <Text style={styles.actionDesc}>Use pre-made templates</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Activity Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <View style={styles.activityList}>
            <Text style={styles.activityEmpty}>No recent activity to display</Text>
          </View>
        </View>

        {/* Coming Soon Banner */}
        <View style={styles.comingSoon}>
          <Svg width={32} height={32} viewBox="0 0 24 24" fill="none">
            <Circle cx="12" cy="12" r="10" stroke="#64748b" strokeWidth={1.5}/>
            <Path d="M12 8v4l3 3" stroke="#64748b" strokeWidth={1.5} strokeLinecap="round"/>
          </Svg>
          <View>
            <Text style={styles.comingSoonTitle}>More features coming soon!</Text>
            <Text style={styles.comingSoonText}>SDLC tutorials, collaboration tools, and more</Text>
          </View>
        </View>

        {/* Sign Out Modal */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Svg width={48} height={48} viewBox="0 0 24 24" fill="none">
                <Circle cx="12" cy="12" r="10" stroke="#ef4444" strokeWidth={1.5}/>
                <Path d="M12 8v4M12 16h.01" stroke="#ef4444" strokeWidth={2} strokeLinecap="round"/>
              </Svg>
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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8faff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8faff',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8faff',
  },
  contentContainer: {
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    backgroundColor: '#f8faff',
  },
  welcomeText: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1f36',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#fee2e2',
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 24,
  },
  card: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderTopWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1f36',
    marginBottom: 4,
  },
  cardSubtext: {
    fontSize: 11,
    color: '#94a3b8',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1f36',
    marginBottom: 16,
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1f36',
    marginBottom: 4,
  },
  actionDesc: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center',
  },
  activityList: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  activityEmpty: {
    fontSize: 14,
    color: '#94a3b8',
  },
  comingSoon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 20,
    marginTop: 8,
    padding: 16,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
  },
  comingSoonTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  comingSoonText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
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
    marginTop: 12,
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 14,
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
    fontSize: 14,
    fontWeight: '600',
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});