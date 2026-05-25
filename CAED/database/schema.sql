-- ============================================
-- CAED - Control de Asistencia Estudiantil y Docente
-- Schema PostgreSQL Completo
-- ============================================

-- UNIVERSIDAD
CREATE TABLE universidad (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(200) NOT NULL,
  coordenadas_gps VARCHAR(100) NOT NULL,
  radio_permitido_metros INT DEFAULT 500
);

-- SEMESTRE
CREATE TABLE semestre (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL,
  año INT NOT NULL,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL
);

-- CORTE
CREATE TABLE corte (
  id SERIAL PRIMARY KEY,
  semestre_id INT REFERENCES semestre(id),
  numero_corte INT NOT NULL CHECK (numero_corte IN (1, 2, 3)),
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL
);

-- CALENDARIO ACADÉMICO
CREATE TABLE calendario_academico (
  id SERIAL PRIMARY KEY,
  semestre_id INT REFERENCES semestre(id),
  fecha DATE NOT NULL,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('feriado', 'receso')),
  descripcion VARCHAR(200)
);

-- DEPARTAMENTO
CREATE TABLE departamento (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  descripcion TEXT
);

-- CARRERA
CREATE TABLE carrera (
  id SERIAL PRIMARY KEY,
  departamento_id INT REFERENCES departamento(id),
  nombre VARCHAR(150) NOT NULL,
  codigo VARCHAR(20) NOT NULL
);

-- USUARIO
CREATE TABLE usuario (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  cedula VARCHAR(20) UNIQUE NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  telefono VARCHAR(20),
  foto VARCHAR(500),
  push_token VARCHAR(200),
  rol VARCHAR(20) NOT NULL CHECK (rol IN ('profesor', 'estudiante', 'admin')),
  password VARCHAR(255) NOT NULL,
  fecha_registro TIMESTAMP DEFAULT NOW()
);

-- ADMINISTRADOR
CREATE TABLE administrador (
  id SERIAL PRIMARY KEY,
  usuario_id INT UNIQUE REFERENCES usuario(id),
  nivel_acceso VARCHAR(30) NOT NULL CHECK (nivel_acceso IN ('rector', 'decano', 'coordinador')),
  departamento_id INT REFERENCES departamento(id)
);

-- PROFESOR
CREATE TABLE profesor (
  id SERIAL PRIMARY KEY,
  usuario_id INT UNIQUE REFERENCES usuario(id),
  departamento_id INT REFERENCES departamento(id),
  especialidad VARCHAR(200),
  foto_facial_registrada TEXT
);

-- ESTUDIANTE
CREATE TABLE estudiante (
  id SERIAL PRIMARY KEY,
  usuario_id INT UNIQUE REFERENCES usuario(id),
  carrera_id INT REFERENCES carrera(id),
  matricula VARCHAR(30) UNIQUE NOT NULL
);

-- MATERIA
CREATE TABLE materia (
  id SERIAL PRIMARY KEY,
  carrera_id INT REFERENCES carrera(id),
  departamento_id INT REFERENCES departamento(id),
  nombre VARCHAR(150) NOT NULL,
  codigo VARCHAR(20) NOT NULL,
  creditos INT DEFAULT 3
);

-- CARGA ACADÉMICA
CREATE TABLE carga_academica (
  id SERIAL PRIMARY KEY,
  profesor_id INT REFERENCES profesor(id),
  materia_id INT REFERENCES materia(id),
  semestre_id INT REFERENCES semestre(id),
  aula VARCHAR(50) NOT NULL,
  horario_inicio TIME NOT NULL,
  horario_fin TIME NOT NULL,
  dias_semana VARCHAR(100) NOT NULL,
  total_clases_programadas INT DEFAULT 0,
  UNIQUE(profesor_id, materia_id, semestre_id)
);

-- SESIÓN DE CLASE
CREATE TABLE sesion_clase (
  id SERIAL PRIMARY KEY,
  carga_academica_id INT REFERENCES carga_academica(id),
  corte_id INT REFERENCES corte(id),
  fecha DATE NOT NULL,
  hora_activacion TIMESTAMP,
  hora_cierre TIMESTAMP,
  duracion_real_minutos INT,
  foto_facial_profesor TEXT,
  coordenadas_gps VARCHAR(100),
  estado VARCHAR(30) NOT NULL DEFAULT 'inasistencia'
    CHECK (estado IN ('activa', 'cerrada', 'sin_asistentes', 'inasistencia')),
  ventana_normal_fin TIMESTAMP,
  ventana_tardio_fin TIMESTAMP,
  es_sustitucion BOOLEAN DEFAULT FALSE,
  profesor_sustituto_id INT REFERENCES profesor(id),
  sesion_duplicada_bloqueada BOOLEAN DEFAULT TRUE,
  UNIQUE(carga_academica_id, fecha)
);

-- ASISTENCIA PROFESOR
CREATE TABLE asistencia_profesor (
  id SERIAL PRIMARY KEY,
  sesion_id INT REFERENCES sesion_clase(id),
  profesor_id INT REFERENCES profesor(id),
  hora_firma TIMESTAMP,
  estado VARCHAR(30) NOT NULL CHECK (estado IN ('presente', 'tardio', 'ausente', 'justificado', 'cubierta')),
  minutos_retraso INT DEFAULT 0,
  justificacion TEXT,
  justificado_por_admin_id INT REFERENCES administrador(id),
  fecha_justificacion TIMESTAMP,
  UNIQUE(sesion_id, profesor_id)
);

-- ASISTENCIA ESTUDIANTE
CREATE TABLE asistencia_estudiante (
  id SERIAL PRIMARY KEY,
  sesion_id INT REFERENCES sesion_clase(id),
  estudiante_id INT REFERENCES estudiante(id),
  hora_firma TIMESTAMP,
  estado VARCHAR(20) CHECK (estado IN ('presente', 'tardio', 'ausente')),
  habilitado_por_profesor BOOLEAN DEFAULT FALSE,
  UNIQUE(sesion_id, estudiante_id)
);

-- ALERTA
CREATE TABLE alerta (
  id SERIAL PRIMARY KEY,
  profesor_id INT REFERENCES profesor(id),
  sesion_id INT REFERENCES sesion_clase(id),
  tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('inasistencia', 'tardio', 'no_activo', 'sin_asistentes')),
  descripcion TEXT,
  fecha_generacion TIMESTAMP DEFAULT NOW(),
  fecha_notificacion_profesor TIMESTAMP,
  vista_por_profesor BOOLEAN DEFAULT FALSE,
  vista_por_admin BOOLEAN DEFAULT FALSE
);

-- RANKING INASISTENCIAS
CREATE TABLE ranking_inasistencias (
  id SERIAL PRIMARY KEY,
  profesor_id INT REFERENCES profesor(id),
  semestre_id INT REFERENCES semestre(id),
  corte_id INT REFERENCES corte(id),
  total_inasistencias INT DEFAULT 0,
  total_tardios INT DEFAULT 0,
  total_justificadas INT DEFAULT 0,
  total_cubiertas INT DEFAULT 0,
  posicion_ranking INT,
  UNIQUE(profesor_id, semestre_id, corte_id)
);

-- ESTADÍSTICAS POR CARRERA
CREATE TABLE estadisticas_carrera (
  id SERIAL PRIMARY KEY,
  carrera_id INT REFERENCES carrera(id),
  semestre_id INT REFERENCES semestre(id),
  corte_id INT REFERENCES corte(id),
  total_clases_programadas INT DEFAULT 0,
  total_inasistencias INT DEFAULT 0,
  total_tardios INT DEFAULT 0,
  porcentaje_cumplimiento DECIMAL(5,2),
  UNIQUE(carrera_id, semestre_id, corte_id)
);

-- REPORTE EXPORTABLE
CREATE TABLE reporte_exportable (
  id SERIAL PRIMARY KEY,
  admin_id INT REFERENCES administrador(id),
  tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('PDF', 'Excel')),
  fecha_generacion TIMESTAMP DEFAULT NOW(),
  corte_id INT REFERENCES corte(id),
  semestre_id INT REFERENCES semestre(id),
  carrera_id INT REFERENCES carrera(id),
  departamento_id INT REFERENCES departamento(id),
  contenido_tipo VARCHAR(50) CHECK (contenido_tipo IN ('asistencias', 'inasistencias', 'ranking', 'estadisticas'))
);

-- HISTORIAL DISCIPLINARIO
CREATE TABLE historial_disciplinario (
  id SERIAL PRIMARY KEY,
  profesor_id INT REFERENCES profesor(id),
  admin_id INT REFERENCES administrador(id),
  fecha TIMESTAMP DEFAULT NOW(),
  descripcion TEXT NOT NULL,
  accion_tomada TEXT NOT NULL,
  seguimiento TEXT
);

-- LOG DE ACTIVIDAD
CREATE TABLE log_actividad (
  id SERIAL PRIMARY KEY,
  usuario_id INT REFERENCES usuario(id),
  accion VARCHAR(100) NOT NULL,
  fecha_hora TIMESTAMP DEFAULT NOW(),
  coordenadas_gps VARCHAR(100),
  dispositivo VARCHAR(200),
  detalles TEXT
);

-- ============================================
-- DATOS INICIALES
-- ============================================

-- Admin por defecto (password: Admin123!)
INSERT INTO usuario (nombre, cedula, email, rol, password)
VALUES ('Administrador CAED', '0000000000', 'admin@caed.edu.co', 'admin', '$2a$10$rQnE2.placeholder.hash.here');

INSERT INTO administrador (usuario_id, nivel_acceso)
VALUES (1, 'rector');

-- ============================================
-- ÍNDICES PARA RENDIMIENTO
-- ============================================
CREATE INDEX idx_sesion_fecha ON sesion_clase(fecha);
CREATE INDEX idx_sesion_estado ON sesion_clase(estado);
CREATE INDEX idx_asistencia_profesor ON asistencia_profesor(profesor_id);
CREATE INDEX idx_asistencia_sesion ON asistencia_profesor(sesion_id);
CREATE INDEX idx_alerta_profesor ON alerta(profesor_id);
CREATE INDEX idx_log_usuario ON log_actividad(usuario_id);
CREATE INDEX idx_log_fecha ON log_actividad(fecha_hora);

-- ============================================
-- AGREGAR CAMPO ESTADO A USUARIO
-- ============================================
ALTER TABLE usuario ADD COLUMN IF NOT EXISTS estado VARCHAR(20) DEFAULT 'pendiente' 
  CHECK (estado IN ('pendiente', 'aprobado', 'rechazado'));

-- El admin por defecto va aprobado
UPDATE usuario SET estado = 'aprobado' WHERE rol = 'admin';
