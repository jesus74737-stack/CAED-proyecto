import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';
import { COLORS } from '../utils/theme';

import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import { ProfesorHomeScreen, ProfesorHistorialScreen, ProfesorEstadisticasScreen } from '../screens/profesor/ProfesorScreens';
import ActivarSesionScreen from '../screens/profesor/ActivarSesionScreen';
import { EstudianteHomeScreen, FirmarAsistenciaScreen, EstudianteHistorialScreen } from '../screens/estudiante/EstudianteScreens';
import AdminHomeScreen from '../screens/admin/AdminHomeScreen';
import { AdminProfesoresScreen, AdminRankingScreen, AdminAlertasScreen, AdminEstadisticasScreen, AdminProfesorDetalleScreen } from '../screens/admin/AdminScreens';
import AdminRegistrosScreen from '../screens/admin/AdminRegistrosScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const tabBarStyle = {
  tabBarActiveTintColor: COLORS.primary,
  tabBarInactiveTintColor: COLORS.gray,
  tabBarStyle: { borderTopWidth: 0, elevation: 20, shadowOpacity: 0.1, height: 62, paddingBottom: 8 },
  headerShown: false,
};

export function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} options={{ animation: 'slide_from_right' }} />
    </Stack.Navigator>
  );
}

function ProfesorTabs() {
  return (
    <Tab.Navigator screenOptions={tabBarStyle}>
      <Tab.Screen name="Inicio" component={ProfesorHomeScreen} options={{ tabBarIcon: () => <Text style={{ fontSize: 22 }}>🏠</Text> }} />
      <Tab.Screen name="Historial" component={ProfesorHistorialScreen} options={{ tabBarIcon: () => <Text style={{ fontSize: 22 }}>📅</Text> }} />
      <Tab.Screen name="Estadísticas" component={ProfesorEstadisticasScreen} options={{ tabBarIcon: () => <Text style={{ fontSize: 22 }}>📊</Text> }} />
    </Tab.Navigator>
  );
}

export function ProfesorNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfesorTabs" component={ProfesorTabs} />
      <Stack.Screen name="Activar" component={ActivarSesionScreen} options={{ animation: 'slide_from_bottom' }} />
    </Stack.Navigator>
  );
}

function EstudianteTabs() {
  return (
    <Tab.Navigator screenOptions={tabBarStyle}>
      <Tab.Screen name="Inicio" component={EstudianteHomeScreen} options={{ tabBarIcon: () => <Text style={{ fontSize: 22 }}>🏠</Text> }} />
      <Tab.Screen name="Historial" component={EstudianteHistorialScreen} options={{ tabBarIcon: () => <Text style={{ fontSize: 22 }}>📅</Text> }} />
    </Tab.Navigator>
  );
}

export function EstudianteNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="EstudianteTabs" component={EstudianteTabs} />
      <Stack.Screen name="Firmar" component={FirmarAsistenciaScreen} options={{ animation: 'slide_from_bottom' }} />
    </Stack.Navigator>
  );
}

function AdminTabs() {
  return (
    <Tab.Navigator screenOptions={tabBarStyle}>
      <Tab.Screen name="Panel" component={AdminHomeScreen} options={{ tabBarIcon: () => <Text style={{ fontSize: 22 }}>🏠</Text> }} />
      <Tab.Screen name="Profesores" component={AdminProfesoresScreen} options={{ tabBarIcon: () => <Text style={{ fontSize: 22 }}>👥</Text> }} />
      <Tab.Screen name="Ranking" component={AdminRankingScreen} options={{ tabBarIcon: () => <Text style={{ fontSize: 22 }}>🏆</Text> }} />
      <Tab.Screen name="Alertas" component={AdminAlertasScreen} options={{ tabBarIcon: () => <Text style={{ fontSize: 22 }}>🚨</Text> }} />
      <Tab.Screen name="Estadísticas" component={AdminEstadisticasScreen} options={{ tabBarIcon: () => <Text style={{ fontSize: 22 }}>📊</Text> }} />
    </Tab.Navigator>
  );
}

export function AdminNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AdminTabs" component={AdminTabs} />
      <Stack.Screen name="ProfesorDetalle" component={AdminProfesorDetalleScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="Registros" component={AdminRegistrosScreen} options={{ animation: 'slide_from_right' }} />
    </Stack.Navigator>
  );
}
