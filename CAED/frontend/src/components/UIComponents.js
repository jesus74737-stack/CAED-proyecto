import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Animated
} from 'react-native';
import { COLORS, SHADOWS, RADIUS, FONTS } from '../utils/theme';

// ── Botón principal ──────────────────────────────────────────
export const PrimaryButton = ({ title, onPress, loading, disabled, danger, style }) => (
  <TouchableOpacity
    style={[
      styles.primaryBtn,
      danger && styles.dangerBtn,
      (disabled || loading) && styles.disabledBtn,
      style,
    ]}
    onPress={onPress}
    disabled={disabled || loading}
    activeOpacity={0.85}
  >
    {loading
      ? <ActivityIndicator color={COLORS.white} size="small" />
      : <Text style={styles.primaryBtnText}>{title}</Text>
    }
  </TouchableOpacity>
);

// ── Botón secundario ─────────────────────────────────────────
export const SecondaryButton = ({ title, onPress, style }) => (
  <TouchableOpacity style={[styles.secondaryBtn, style]} onPress={onPress} activeOpacity={0.8}>
    <Text style={styles.secondaryBtnText}>{title}</Text>
  </TouchableOpacity>
);

// ── Card ─────────────────────────────────────────────────────
export const Card = ({ children, style }) => (
  <View style={[styles.card, style]}>{children}</View>
);

// ── Input ────────────────────────────────────────────────────
export const Input = ({ label, error, ...props }) => (
  <View style={styles.inputWrapper}>
    {label && <Text style={styles.inputLabel}>{label}</Text>}
    <View style={[styles.inputContainer, error && styles.inputError]}>
      <Text style={styles.inputIcon}>{props.icon}</Text>
      <React.Fragment>{props.render?.()}</React.Fragment>
    </View>
    {error && <Text style={styles.errorText}>{error}</Text>}
  </View>
);

// ── Badge de estado ──────────────────────────────────────────
export const StatusBadge = ({ status }) => {
  const config = {
    presente: { label: 'Presente', color: COLORS.success, bg: COLORS.successLight },
    tardio: { label: 'Tardío', color: COLORS.warning, bg: COLORS.warningLight },
    ausente: { label: 'Ausente', color: COLORS.danger, bg: COLORS.dangerLight },
    justificado: { label: 'Justificado', color: COLORS.secondary, bg: '#E8F4FB' },
    cubierta: { label: 'Cubierta', color: '#9B59B6', bg: '#F5EEF8' },
    activa: { label: 'Activa', color: COLORS.success, bg: COLORS.successLight },
    inasistencia: { label: 'Ausente', color: COLORS.danger, bg: COLORS.dangerLight },
  }[status] || { label: status, color: COLORS.gray, bg: COLORS.grayLight };

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <Text style={[styles.badgeText, { color: config.color }]}>{config.label}</Text>
    </View>
  );
};

// ── Stat Card ────────────────────────────────────────────────
export const StatCard = ({ value, label, color, icon }) => (
  <View style={[styles.statCard, { borderTopColor: color, borderTopWidth: 3 }]}>
    <Text style={styles.statIcon}>{icon}</Text>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

// ── Header de pantalla ───────────────────────────────────────
export const ScreenHeader = ({ title, subtitle, onBack, action }) => (
  <View style={styles.screenHeader}>
    <View style={styles.headerLeft}>
      {onBack && (
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
      )}
      <View>
        <Text style={styles.headerTitle}>{title}</Text>
        {subtitle && <Text style={styles.headerSubtitle}>{subtitle}</Text>}
      </View>
    </View>
    {action}
  </View>
);

// ── Divider ──────────────────────────────────────────────────
export const Divider = ({ label }) => (
  <View style={styles.divider}>
    <View style={styles.dividerLine} />
    {label && <Text style={styles.dividerLabel}>{label}</Text>}
    {label && <View style={styles.dividerLine} />}
  </View>
);

// ── Avatar ───────────────────────────────────────────────────
export const Avatar = ({ name, photo, size = 48, color = COLORS.primary }) => (
  <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }]}>
    <Text style={[styles.avatarText, { fontSize: size * 0.38 }]}>
      {name?.charAt(0)?.toUpperCase() || '?'}
    </Text>
  </View>
);

// ── Alert Banner ─────────────────────────────────────────────
export const AlertBanner = ({ type = 'info', message }) => {
  const colors = {
    info: { bg: '#E8F4FB', border: COLORS.secondary, icon: 'ℹ️' },
    success: { bg: COLORS.successLight, border: COLORS.success, icon: '✅' },
    warning: { bg: COLORS.warningLight, border: COLORS.warning, icon: '⚠️' },
    danger: { bg: COLORS.dangerLight, border: COLORS.danger, icon: '🚨' },
  }[type];

  return (
    <View style={[styles.alertBanner, { backgroundColor: colors.bg, borderLeftColor: colors.border }]}>
      <Text style={styles.alertIcon}>{colors.icon}</Text>
      <Text style={styles.alertMessage}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  dangerBtn: { backgroundColor: COLORS.danger },
  disabledBtn: { backgroundColor: COLORS.gray, ...SHADOWS.small },
  primaryBtnText: { ...FONTS.h4, color: COLORS.white, letterSpacing: 0.5 },

  secondaryBtn: {
    backgroundColor: 'transparent',
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  secondaryBtnText: { ...FONTS.h4, color: COLORS.primary },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: 20,
    ...SHADOWS.small,
  },

  inputWrapper: { marginBottom: 16 },
  inputLabel: { ...FONTS.label, color: COLORS.dark, marginBottom: 8, textTransform: 'uppercase' },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md, borderWidth: 1.5,
    borderColor: COLORS.grayLight, paddingHorizontal: 14,
  },
  inputError: { borderColor: COLORS.danger },
  inputIcon: { fontSize: 18, marginRight: 10 },
  errorText: { ...FONTS.small, color: COLORS.danger, marginTop: 4 },

  badge: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  badgeText: { ...FONTS.tiny, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },

  statCard: {
    flex: 1, backgroundColor: COLORS.card,
    borderRadius: RADIUS.md, padding: 14,
    alignItems: 'center', ...SHADOWS.small,
  },
  statIcon: { fontSize: 20, marginBottom: 4 },
  statValue: { ...FONTS.h2, marginBottom: 2 },
  statLabel: { ...FONTS.tiny, color: COLORS.gray, textAlign: 'center' },

  screenHeader: {
    backgroundColor: COLORS.primary,
    paddingTop: 52, paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  backIcon: { fontSize: 20, color: COLORS.white },
  headerTitle: { ...FONTS.h3, color: COLORS.white },
  headerSubtitle: { ...FONTS.small, color: 'rgba(255,255,255,0.7)', marginTop: 2 },

  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20, gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.grayLight },
  dividerLabel: { ...FONTS.small, color: COLORS.gray },

  avatar: { justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: COLORS.white, fontWeight: '700' },

  alertBanner: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: RADIUS.md, padding: 14,
    borderLeftWidth: 4, marginVertical: 8,
    gap: 10,
  },
  alertIcon: { fontSize: 18 },
  alertMessage: { ...FONTS.small, color: COLORS.dark, flex: 1, lineHeight: 20 },
});
