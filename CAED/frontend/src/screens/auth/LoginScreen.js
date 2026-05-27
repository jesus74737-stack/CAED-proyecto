import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView,
  Animated, StatusBar, ActivityIndicator, Alert,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { COLORS, FONTS, RADIUS, SHADOWS } from '../../utils/theme';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [cedula, setCedula] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const validate = () => {
    const e = {};
    if (!cedula.trim()) e.cedula = 'Ingresa tu cédula';
    if (!password.trim()) e.password = 'Ingresa tu contraseña';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) { shake(); return; }
    setLoading(true);
    try {
      await login(cedula.trim(), password);
    } catch (error) {
      shake();
      // Mostrar el mensaje real del servidor en lugar de uno genérico
      const serverMsg = error?.response?.data?.message;
      const statusCode = error?.response?.status;

      let msg = 'Error al conectar con el servidor. Intenta de nuevo.';

      if (statusCode === 401) {
        msg = 'Cédula o contraseña incorrecta';
      } else if (statusCode === 403) {
        msg = serverMsg || 'Tu cuenta aún no ha sido aprobada por el administrador';
      } else if (serverMsg) {
        msg = serverMsg;
      }

      setErrors({ general: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Header azul */}
      <View style={styles.header}>
        <View style={styles.logoBox}>
          <Text style={styles.logoLetter}>C</Text>
        </View>
        <Text style={styles.appName}>CAED</Text>
        <Text style={styles.appSlogan}>Control de Asistencia{'\n'}Estudiantil y Docente</Text>
        <Text style={styles.appCountry}>🇨🇴 Colombia</Text>
      </View>

      {/* Formulario */}
      <ScrollView style={styles.form} contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">

        <Text style={styles.formTitle}>Iniciar sesión</Text>
        <Text style={styles.formSubtitle}>Ingresa tus credenciales institucionales</Text>

        {errors.general && (
          <Animated.View style={[styles.errorBanner, { transform: [{ translateX: shakeAnim }] }]}>
            <Text style={styles.errorBannerText}>
              {errors.general.includes('aprobada') ? '⏳' : '❌'} {errors.general}
            </Text>
          </Animated.View>
        )}

        {/* Cédula */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>NÚMERO DE CÉDULA</Text>
          <View style={[styles.fieldBox, errors.cedula && styles.fieldError]}>
            <Text style={styles.fieldIcon}>🪪</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder="Ej: 1234567890"
              placeholderTextColor={COLORS.gray}
              value={cedula}
              onChangeText={t => { setCedula(t); setErrors(p => ({ ...p, cedula: null })); }}
              keyboardType="numeric"
              autoCapitalize="none"
              returnKeyType="next"
            />
          </View>
          {errors.cedula && <Text style={styles.fieldErrorText}>{errors.cedula}</Text>}
        </View>

        {/* Contraseña */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>CONTRASEÑA</Text>
          <View style={[styles.fieldBox, errors.password && styles.fieldError]}>
            <Text style={styles.fieldIcon}>🔒</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder="Tu contraseña"
              placeholderTextColor={COLORS.gray}
              value={password}
              onChangeText={t => { setPassword(t); setErrors(p => ({ ...p, password: null })); }}
              secureTextEntry={!showPass}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
            <TouchableOpacity onPress={() => setShowPass(p => !p)} style={styles.eyeBtn}>
              <Text style={styles.eyeIcon}>{showPass ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>
          {errors.password && <Text style={styles.fieldErrorText}>{errors.password}</Text>}
        </View>

        {/* Botón login */}
        <TouchableOpacity
          style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.88}
        >
          {loading
            ? <ActivityIndicator color={COLORS.white} />
            : <Text style={styles.loginBtnText}>Ingresar al sistema</Text>
          }
        </TouchableOpacity>

        {/* Registro */}
        <View style={styles.registerRow}>
          <Text style={styles.registerText}>¿Primera vez en el sistema? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.registerLink}>Solicitar acceso</Text>
          </TouchableOpacity>
        </View>

        {/* Roles info */}
        <View style={styles.rolesRow}>
          {[
            { icon: '👨‍🏫', label: 'Profesor' },
            { icon: '🎓', label: 'Estudiante' },
            { icon: '👁️', label: 'Admin' },
          ].map(r => (
            <View key={r.label} style={styles.roleChip}>
              <Text style={styles.roleIcon}>{r.icon}</Text>
              <Text style={styles.roleLabel}>{r.label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.primary },

  header: {
    flex: 0.45, justifyContent: 'center', alignItems: 'center',
    paddingTop: 40, paddingBottom: 20,
  },
  logoBox: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: COLORS.white,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 16, ...SHADOWS.large,
  },
  logoLetter: { fontSize: 40, fontWeight: '900', color: COLORS.primary },
  appName: { ...FONTS.h1, color: COLORS.white, letterSpacing: 4 },
  appSlogan: { ...FONTS.small, color: 'rgba(255,255,255,0.75)', textAlign: 'center', marginTop: 6, lineHeight: 20 },
  appCountry: { ...FONTS.tiny, color: 'rgba(255,255,255,0.5)', marginTop: 8 },

  form: {
    flex: 0.55,
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 32, borderTopRightRadius: 32,
  },
  formContent: { padding: 28, paddingBottom: 40 },
  formTitle: { ...FONTS.h2, color: COLORS.dark, marginBottom: 4 },
  formSubtitle: { ...FONTS.small, color: COLORS.gray, marginBottom: 28 },

  errorBanner: {
    backgroundColor: COLORS.dangerLight,
    borderRadius: RADIUS.md, padding: 12,
    borderLeftWidth: 3, borderLeftColor: COLORS.danger,
    marginBottom: 20,
  },
  errorBannerText: { ...FONTS.small, color: COLORS.danger },

  fieldGroup: { marginBottom: 20 },
  fieldLabel: { ...FONTS.label, color: COLORS.gray, marginBottom: 8 },
  fieldBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.white, borderRadius: RADIUS.md,
    borderWidth: 1.5, borderColor: COLORS.grayLight,
    paddingHorizontal: 14, ...SHADOWS.small,
  },
  fieldError: { borderColor: COLORS.danger },
  fieldIcon: { fontSize: 18, marginRight: 10 },
  fieldInput: { flex: 1, paddingVertical: 15, ...FONTS.body, color: COLORS.dark },
  fieldErrorText: { ...FONTS.small, color: COLORS.danger, marginTop: 4, marginLeft: 4 },
  eyeBtn: { padding: 8 },
  eyeIcon: { fontSize: 18 },

  loginBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
    paddingVertical: 17, alignItems: 'center',
    marginTop: 8, ...SHADOWS.medium,
  },
  loginBtnDisabled: { backgroundColor: COLORS.gray },
  loginBtnText: { ...FONTS.h4, color: COLORS.white, letterSpacing: 0.5 },

  registerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 24, alignItems: 'center' },
  registerText: { ...FONTS.small, color: COLORS.gray },
  registerLink: { ...FONTS.small, color: COLORS.primary, fontWeight: '700' },

  rolesRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 28 },
  roleChip: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.full,
    paddingVertical: 8, paddingHorizontal: 14,
    alignItems: 'center', ...SHADOWS.small,
  },
  roleIcon: { fontSize: 16 },
  roleLabel: { ...FONTS.tiny, color: COLORS.gray, marginTop: 2 },
});
