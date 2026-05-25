import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  TouchableOpacity, Modal, Alert, ActivityIndicator, StatusBar,
} from 'react-native';
import FaceCamera from '../../components/FaceCamera';
import { COLORS, FONTS, RADIUS, SHADOWS } from '../../utils/theme';
import api from '../../services/api';

const STEPS = ['Datos', 'Verificación facial', 'Confirmación'];

export default function RegisterScreen({ navigation }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    nombre: '', cedula: '', email: '',
    telefono: '', password: '', confirm: '',
    rol: 'profesor', carrera_id: '',
  });
  const [errors, setErrors] = useState({});
  const [showCamera, setShowCamera] = useState(false);
  const [faceData, setFaceData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const update = (key, val) => {
    setForm(p => ({ ...p, [key]: val }));
    setErrors(p => ({ ...p, [key]: null }));
  };

  const validateStep0 = () => {
    const e = {};
    if (!form.nombre.trim()) e.nombre = 'Requerido';
    if (!form.cedula.trim()) e.cedula = 'Requerido';
    if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Email inválido';
    if (form.password.length < 8) e.password = 'Mínimo 8 caracteres';
    if (form.password !== form.confirm) e.confirm = 'Las contraseñas no coinciden';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (step === 0) {
      if (!validateStep0()) return;
      setStep(1);
    }
  };

  const handleFaceSuccess = (data) => {
    setFaceData(data);
    setShowCamera(false);
    setStep(2);
  };

  const handleFaceError = (msg) => {
    setShowCamera(false);
    Alert.alert('Error de verificación', msg);
  };

  const handleSubmit = async () => {
    if (!faceData) {
      Alert.alert('Falta verificación', 'Completa la verificación facial primero.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/register', {
        ...form,
        foto_facial_registrada: faceData.fingerprint,
        foto: faceData.photo,
      });
      setSubmitted(true);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'No se pudo enviar la solicitud');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <View style={styles.successScreen}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
        <View style={styles.successIcon}><Text style={styles.successEmoji}>✅</Text></View>
        <Text style={styles.successTitle}>¡Solicitud enviada!</Text>
        <Text style={styles.successText}>
          Tu solicitud fue recibida y está pendiente de aprobación por el administrador.
          Recibirás una notificación cuando sea aprobada.
        </Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.replace('Login')}>
          <Text style={styles.backBtnText}>Volver al inicio</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => step > 0 ? setStep(step - 1) : navigation.goBack()} style={styles.backArrow}>
          <Text style={styles.backArrowText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Solicitar acceso</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Steps */}
      <View style={styles.stepsRow}>
        {STEPS.map((s, i) => (
          <React.Fragment key={s}>
            <View style={styles.stepItem}>
              <View style={[styles.stepCircle, i <= step && styles.stepCircleActive]}>
                <Text style={[styles.stepNum, i <= step && styles.stepNumActive]}>
                  {i < step ? '✓' : i + 1}
                </Text>
              </View>
              <Text style={[styles.stepLabel, i === step && styles.stepLabelActive]}>{s}</Text>
            </View>
            {i < STEPS.length - 1 && (
              <View style={[styles.stepLine, i < step && styles.stepLineDone]} />
            )}
          </React.Fragment>
        ))}
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} keyboardShouldPersistTaps="handled">

        {/* ── PASO 0: Datos ── */}
        {step === 0 && (
          <>
            <Text style={styles.stepTitle}>Información personal</Text>

            {/* Rol */}
            <Text style={styles.fieldLabel}>SOY</Text>
            <View style={styles.roleRow}>
              {[
                { val: 'profesor', label: '👨‍🏫 Profesor' },
                { val: 'estudiante', label: '🎓 Estudiante' },
              ].map(r => (
                <TouchableOpacity
                  key={r.val}
                  style={[styles.roleBtn, form.rol === r.val && styles.roleBtnActive]}
                  onPress={() => update('rol', r.val)}
                >
                  <Text style={[styles.roleBtnText, form.rol === r.val && styles.roleBtnTextActive]}>
                    {r.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {[
              { key: 'nombre', label: 'NOMBRE COMPLETO', icon: '👤', placeholder: 'Ej: Juan García Pérez', keyboard: 'default' },
              { key: 'cedula', label: 'NÚMERO DE CÉDULA', icon: '🪪', placeholder: 'Ej: 1234567890', keyboard: 'numeric' },
              { key: 'email', label: 'CORREO INSTITUCIONAL', icon: '✉️', placeholder: 'tu@universidad.edu.co', keyboard: 'email-address' },
              { key: 'telefono', label: 'TELÉFONO', icon: '📱', placeholder: 'Ej: 3001234567', keyboard: 'phone-pad' },
            ].map(f => (
              <View key={f.key} style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>{f.label}</Text>
                <View style={[styles.fieldBox, errors[f.key] && styles.fieldBoxError]}>
                  <Text style={styles.fieldIcon}>{f.icon}</Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder={f.placeholder}
                    placeholderTextColor={COLORS.gray}
                    value={form[f.key]}
                    onChangeText={t => update(f.key, t)}
                    keyboardType={f.keyboard}
                    autoCapitalize={f.key === 'nombre' ? 'words' : 'none'}
                  />
                </View>
                {errors[f.key] && <Text style={styles.fieldError}>{errors[f.key]}</Text>}
              </View>
            ))}

            {[
              { key: 'password', label: 'CONTRASEÑA', placeholder: 'Mínimo 8 caracteres' },
              { key: 'confirm', label: 'CONFIRMAR CONTRASEÑA', placeholder: 'Repite la contraseña' },
            ].map(f => (
              <View key={f.key} style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>{f.label}</Text>
                <View style={[styles.fieldBox, errors[f.key] && styles.fieldBoxError]}>
                  <Text style={styles.fieldIcon}>🔒</Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder={f.placeholder}
                    placeholderTextColor={COLORS.gray}
                    value={form[f.key]}
                    onChangeText={t => update(f.key, t)}
                    secureTextEntry
                  />
                </View>
                {errors[f.key] && <Text style={styles.fieldError}>{errors[f.key]}</Text>}
              </View>
            ))}

            <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
              <Text style={styles.nextBtnText}>Continuar →</Text>
            </TouchableOpacity>
          </>
        )}

        {/* ── PASO 1: Verificación facial ── */}
        {step === 1 && (
          <>
            <Text style={styles.stepTitle}>Verificación facial</Text>
            <Text style={styles.stepSubtitle}>
              Para registrarte, el sistema verificará que eres una persona real mediante desafíos en tiempo real.
            </Text>

            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>¿Qué va a pasar?</Text>
              {[
                { icon: '👁️', text: 'Te pedirá que parpadees' },
                { icon: '😊', text: 'Te pedirá que sonrías o gires la cabeza' },
                { icon: '🔐', text: 'Capturará tu mapa facial para futuras verificaciones' },
                { icon: '✅', text: 'Nadie puede suplantarte con una foto' },
              ].map(item => (
                <View key={item.text} style={styles.infoRow}>
                  <Text style={styles.infoRowIcon}>{item.icon}</Text>
                  <Text style={styles.infoRowText}>{item.text}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity style={styles.nextBtn} onPress={() => setShowCamera(true)}>
              <Text style={styles.nextBtnText}>📸 Iniciar verificación facial</Text>
            </TouchableOpacity>

            {faceData && (
              <View style={styles.successBanner}>
                <Text style={styles.successBannerText}>✅ Verificación facial completada</Text>
              </View>
            )}
          </>
        )}

        {/* ── PASO 2: Confirmar ── */}
        {step === 2 && (
          <>
            <Text style={styles.stepTitle}>Confirmar solicitud</Text>

            <View style={styles.summaryCard}>
              <View style={styles.facePreview}>
                <Text style={styles.facePreviewIcon}>🔐</Text>
                <Text style={styles.facePreviewText}>Verificación facial completada</Text>
              </View>

              {[
                { label: 'Nombre', value: form.nombre },
                { label: 'Cédula', value: form.cedula },
                { label: 'Email', value: form.email },
                { label: 'Teléfono', value: form.telefono || 'No especificado' },
                { label: 'Rol', value: form.rol === 'profesor' ? '👨‍🏫 Profesor' : '🎓 Estudiante' },
              ].map(item => (
                <View key={item.label} style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{item.label}</Text>
                  <Text style={styles.summaryValue}>{item.value}</Text>
                </View>
              ))}
            </View>

            <View style={styles.warningBox}>
              <Text style={styles.warningText}>
                ⏳ Tu solicitud quedará pendiente hasta que el administrador la apruebe.
              </Text>
            </View>

            <TouchableOpacity style={styles.nextBtn} onPress={handleSubmit} disabled={loading}>
              {loading
                ? <ActivityIndicator color={COLORS.white} />
                : <Text style={styles.nextBtnText}>📤 Enviar solicitud</Text>
              }
            </TouchableOpacity>
          </>
        )}

      </ScrollView>

      {/* Modal cámara */}
      <Modal visible={showCamera} animationType="slide" statusBarTranslucent>
        <View style={{ flex: 1 }}>
          <FaceCamera
            mode="register"
            onSuccess={handleFaceSuccess}
            onError={handleFaceError}
          />
          <TouchableOpacity style={styles.cancelCamBtn} onPress={() => setShowCamera(false)}>
            <Text style={styles.cancelCamText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.primary, paddingTop: 52, paddingBottom: 16,
    paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  backArrow: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  backArrowText: { fontSize: 20, color: COLORS.white },
  headerTitle: { ...FONTS.h3, color: COLORS.white },

  stepsRow: {
    backgroundColor: COLORS.primary, paddingBottom: 24,
    paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center',
  },
  stepItem: { alignItems: 'center', flex: 0 },
  stepCircle: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  stepCircleActive: { backgroundColor: COLORS.success },
  stepNum: { ...FONTS.label, color: 'rgba(255,255,255,0.6)' },
  stepNumActive: { color: COLORS.white, fontWeight: '700' },
  stepLabel: { ...FONTS.tiny, color: 'rgba(255,255,255,0.5)', marginTop: 4, textAlign: 'center', width: 60 },
  stepLabelActive: { color: COLORS.white },
  stepLine: { flex: 1, height: 2, backgroundColor: 'rgba(255,255,255,0.2)', marginBottom: 20 },
  stepLineDone: { backgroundColor: COLORS.success },

  body: { flex: 1 },
  bodyContent: { padding: 24, paddingBottom: 40 },
  stepTitle: { ...FONTS.h2, color: COLORS.dark, marginBottom: 6 },
  stepSubtitle: { ...FONTS.small, color: COLORS.gray, marginBottom: 24, lineHeight: 20 },

  roleRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  roleBtn: {
    flex: 1, paddingVertical: 14, borderRadius: RADIUS.md,
    backgroundColor: COLORS.white, alignItems: 'center',
    borderWidth: 2, borderColor: COLORS.grayLight, ...SHADOWS.small,
  },
  roleBtnActive: { borderColor: COLORS.primary, backgroundColor: '#EEF2FF' },
  roleBtnText: { ...FONTS.body, color: COLORS.gray },
  roleBtnTextActive: { color: COLORS.primary, fontWeight: '700' },

  fieldGroup: { marginBottom: 18 },
  fieldLabel: { ...FONTS.label, color: COLORS.gray, marginBottom: 8 },
  fieldBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.white, borderRadius: RADIUS.md,
    borderWidth: 1.5, borderColor: COLORS.grayLight,
    paddingHorizontal: 14, ...SHADOWS.small,
  },
  fieldBoxError: { borderColor: COLORS.danger },
  fieldIcon: { fontSize: 18, marginRight: 10 },
  fieldInput: { flex: 1, paddingVertical: 14, ...FONTS.body, color: COLORS.dark },
  fieldError: { ...FONTS.small, color: COLORS.danger, marginTop: 4 },

  nextBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
    paddingVertical: 17, alignItems: 'center', marginTop: 12, ...SHADOWS.medium,
  },
  nextBtnText: { ...FONTS.h4, color: COLORS.white },

  infoCard: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.lg,
    padding: 20, marginBottom: 24, ...SHADOWS.small,
    borderLeftWidth: 4, borderLeftColor: COLORS.primary,
  },
  infoTitle: { ...FONTS.h4, color: COLORS.dark, marginBottom: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 12 },
  infoRowIcon: { fontSize: 20 },
  infoRowText: { ...FONTS.body, color: COLORS.dark, flex: 1 },

  successBanner: {
    backgroundColor: COLORS.successLight, borderRadius: RADIUS.md,
    padding: 14, marginTop: 16, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.success,
  },
  successBannerText: { ...FONTS.body, color: COLORS.success, fontWeight: '700' },

  summaryCard: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.lg,
    padding: 20, marginBottom: 16, ...SHADOWS.small,
  },
  facePreview: {
    backgroundColor: '#EEF2FF', borderRadius: RADIUS.md, padding: 16,
    alignItems: 'center', marginBottom: 20,
  },
  facePreviewIcon: { fontSize: 40, marginBottom: 8 },
  facePreviewText: { ...FONTS.body, color: COLORS.primary, fontWeight: '700' },
  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.grayLight,
  },
  summaryLabel: { ...FONTS.small, color: COLORS.gray },
  summaryValue: { ...FONTS.small, color: COLORS.dark, fontWeight: '600', maxWidth: '60%', textAlign: 'right' },

  warningBox: {
    backgroundColor: COLORS.warningLight, borderRadius: RADIUS.md,
    padding: 14, marginBottom: 16, borderLeftWidth: 3, borderLeftColor: COLORS.warning,
  },
  warningText: { ...FONTS.small, color: '#7D5A2A', lineHeight: 20 },

  cancelCamBtn: {
    position: 'absolute', bottom: 40, left: 20, right: 20,
    backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: RADIUS.md,
    padding: 16, alignItems: 'center',
  },
  cancelCamText: { ...FONTS.h4, color: COLORS.white },

  // Pantalla de éxito
  successScreen: {
    flex: 1, backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center', padding: 40,
  },
  successIcon: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: COLORS.white, justifyContent: 'center', alignItems: 'center',
    marginBottom: 24, ...SHADOWS.large,
  },
  successEmoji: { fontSize: 48 },
  successTitle: { ...FONTS.h1, color: COLORS.white, textAlign: 'center', marginBottom: 16 },
  successText: { ...FONTS.body, color: 'rgba(255,255,255,0.8)', textAlign: 'center', lineHeight: 24, marginBottom: 40 },
  backBtn: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.md,
    paddingVertical: 16, paddingHorizontal: 40, ...SHADOWS.medium,
  },
  backBtnText: { ...FONTS.h4, color: COLORS.primary },
});
