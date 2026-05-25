import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../utils/theme';
import { AuthNavigator, ProfesorNavigator, EstudianteNavigator, AdminNavigator } from './navigators';

export default function RootNavigator() {
  const { user, loading } = useAuth();
  if (loading) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.primary }}>
      <ActivityIndicator size="large" color={COLORS.white} />
    </View>
  );
  if (!user) return <AuthNavigator />;
  if (user.rol === 'profesor') return <ProfesorNavigator />;
  if (user.rol === 'estudiante') return <EstudianteNavigator />;
  if (user.rol === 'admin') return <AdminNavigator />;
}
