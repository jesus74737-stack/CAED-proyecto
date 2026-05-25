# CAED - Control de Asistencia Estudiantil y Docente 🎓🇨🇴

Sistema móvil completo para instituciones educativas de Colombia.

---

## 🚀 Obtener el APK (3 pasos)

1. Sube este proyecto a GitHub
2. Ve a **Settings → Secrets → Actions** y agrega `EXPO_TOKEN`
   - Crea tu token en: https://expo.dev/accounts/[tu-usuario]/settings/access-tokens
3. Haz push a `main` → GitHub Actions genera el APK automáticamente en **Actions → Artifacts**

---

## ⚙️ Configurar Backend

```bash
cd backend
cp .env.example .env        # Edita con tus datos reales
npm install
node server.js
```

## 🗄️ Configurar Base de datos

```bash
psql -U postgres -c "CREATE DATABASE caed_db;"
psql -U postgres -d caed_db -f database/schema.sql
```

## 📱 Probar Frontend

```bash
cd frontend
npm install
# Edita src/services/api.js con tu URL del backend
npx expo start --android
```

---

## 🔐 Sistema de seguridad facial

| Momento | Seguridad |
|---------|-----------|
| **Registro** | Liveness completo: parpadeo + sonrisa/giro de cabeza |
| **Tomar asistencia** | Parpadeo natural + comparación de mapa facial |
| **GPS** | Verificación de radio del campus en ambos casos |

---

## 👥 Flujo de usuarios

```
Profesor/Estudiante se registra
        ↓
Admin ve solicitud pendiente → Aprueba o rechaza
        ↓
Usuario aprobado puede iniciar sesión
```

---

## ✅ Todo lo implementado

- 3 roles: Profesor, Estudiante, Admin
- Reconocimiento facial con liveness detection (sin servicios externos)
- GPS dentro del campus
- Cruce con horario oficial
- Estados: Presente, Tardío, Ausente
- Ventana 30 min tardíos
- Clase sin asistentes registrada
- 3 cortes por semestre
- Ranking automático de inasistencias
- Alertas automáticas admin
- Notificación al profesor a los 15 min
- Reporte automático de inasistencia
- Historial del profesor
- Reporte exportable PDF/Excel
- Sesión única por clase
- Inasistencia justificada por admin
- Carga académica del profesor
- Carreras y departamentos
- Sustitución de clase cubierta
- Historial disciplinario
- Estadísticas por carrera
- Calendario académico feriados
- Duración real de la clase
- Log de actividad
- Registro con aprobación del admin
- Push notifications
- Diseño profesional
