-- ================================================================
-- SISTEMA DE RESERVAS MÉDICAS UNS · ESQUEMA V2
-- En phpMyAdmin, IMPORTAR el archivo COMPLETO desde la pestaña Importar.
-- No ejecutar bloques aislados como "estado ENUM(...)".
-- Compatible con versiones de MySQL/MariaDB sin DEFAULT en TEXT.
-- No elimina bases de datos existentes.
-- ================================================================

CREATE DATABASE IF NOT EXISTS reservas_medicas_uns
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE reservas_medicas_uns;

CREATE TABLE IF NOT EXISTS roles (
  id_rol TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(30) NOT NULL,
  PRIMARY KEY (id_rol),
  UNIQUE KEY uq_roles_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS usuarios (
  id_usuario INT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_rol TINYINT UNSIGNED NOT NULL,
  nombres VARCHAR(80) NOT NULL,
  apellidos VARCHAR(80) NOT NULL,
  dni CHAR(8) NOT NULL,
  codigo_universitario CHAR(10) DEFAULT NULL,
  correo VARCHAR(150) NOT NULL,
  contrasena_hash VARCHAR(255) NOT NULL,
  foto_perfil VARCHAR(255) DEFAULT NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_usuario),
  UNIQUE KEY uq_usuarios_dni (dni),
  UNIQUE KEY uq_usuarios_codigo (codigo_universitario),
  UNIQUE KEY uq_usuarios_correo (correo),
  KEY ix_usuarios_rol_activo (id_rol, activo),
  CONSTRAINT fk_usuarios_rol FOREIGN KEY (id_rol) REFERENCES roles (id_rol)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS servicios (
  id_servicio SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(80) NOT NULL,
  descripcion VARCHAR(255) DEFAULT NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (id_servicio),
  UNIQUE KEY uq_servicios_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS medicos (
  id_medico INT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_usuario INT UNSIGNED NOT NULL,
  numero_colegiatura VARCHAR(30) DEFAULT NULL,
  consultorio VARCHAR(100) NOT NULL DEFAULT 'Centro Médico UNS',
  activo TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (id_medico),
  UNIQUE KEY uq_medicos_usuario (id_usuario),
  UNIQUE KEY uq_medicos_colegiatura (numero_colegiatura),
  CONSTRAINT fk_medicos_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS medico_servicio (
  id_medico INT UNSIGNED NOT NULL,
  id_servicio SMALLINT UNSIGNED NOT NULL,
  PRIMARY KEY (id_medico, id_servicio),
  KEY ix_medico_servicio_servicio (id_servicio),
  CONSTRAINT fk_medico_servicio_medico FOREIGN KEY (id_medico) REFERENCES medicos (id_medico)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_medico_servicio_servicio FOREIGN KEY (id_servicio) REFERENCES servicios (id_servicio)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS horarios_medicos (
  id_horario INT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_medico INT UNSIGNED NOT NULL,
  id_servicio SMALLINT UNSIGNED NOT NULL,
  fecha DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (id_horario),
  UNIQUE KEY uq_horario_medico_inicio (id_medico, fecha, hora_inicio),
  UNIQUE KEY uq_horario_datos_cita (id_horario, id_servicio, fecha, hora_inicio),
  KEY ix_horarios_servicio_fecha (id_servicio, fecha, activo),
  KEY ix_horarios_medico_fecha (id_medico, fecha, hora_inicio),
  CONSTRAINT fk_horarios_medico_servicio FOREIGN KEY (id_medico, id_servicio)
    REFERENCES medico_servicio (id_medico, id_servicio)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS citas (
  id_cita INT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_estudiante INT UNSIGNED NOT NULL,
  id_servicio SMALLINT UNSIGNED NOT NULL,
  id_horario INT UNSIGNED NOT NULL,
  fecha DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  estado ENUM('PENDIENTE','EN_ESPERA','EN_ATENCION','ATENDIDA','CANCELADA') NOT NULL DEFAULT 'PENDIENTE',
  motivo VARCHAR(500) DEFAULT NULL,
  adjunto_ruta VARCHAR(255) DEFAULT NULL,
  creada_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  cancelada_en DATETIME DEFAULT NULL,
  PRIMARY KEY (id_cita),
  KEY ix_citas_estudiante_fecha (id_estudiante, fecha, hora_inicio),
  KEY ix_citas_agenda (fecha, estado, hora_inicio),
  KEY ix_citas_horario_estado (id_horario, estado),
  KEY ix_citas_horario_datos (id_horario, id_servicio, fecha, hora_inicio),
  KEY ix_citas_servicio_fecha (id_servicio, fecha),
  CONSTRAINT fk_citas_estudiante FOREIGN KEY (id_estudiante) REFERENCES usuarios (id_usuario)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_citas_servicio FOREIGN KEY (id_servicio) REFERENCES servicios (id_servicio)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_citas_horario_datos FOREIGN KEY (id_horario, id_servicio, fecha, hora_inicio)
    REFERENCES horarios_medicos (id_horario, id_servicio, fecha, hora_inicio)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS atenciones (
  id_atencion INT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_cita INT UNSIGNED NOT NULL,
  id_medico INT UNSIGNED NOT NULL,
  sintomas TEXT NOT NULL,
  diagnostico TEXT NOT NULL,
  receta_medica TEXT NULL,
  fecha_atencion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_atencion),
  UNIQUE KEY uq_atenciones_cita (id_cita),
  KEY ix_atenciones_medico (id_medico, fecha_atencion),
  CONSTRAINT fk_atenciones_cita FOREIGN KEY (id_cita) REFERENCES citas (id_cita)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_atenciones_medico FOREIGN KEY (id_medico) REFERENCES medicos (id_medico)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================================
-- DATOS DEMO PARA PRUEBAS LOCALES
-- Contraseña común de las cuentas demo: Uns2026*
-- Único estudiante de prueba: Brayam Jhoan Rubio Gonzales.
-- El correo example.test es un marcador temporal, no una dirección real.
-- Cambiarla antes de cualquier despliegue real.
-- ================================================================
INSERT IGNORE INTO roles (id_rol, nombre) VALUES
  (1, 'Estudiante'), (2, 'Médico'), (3, 'Secretaria'), (4, 'Administrador');

INSERT IGNORE INTO servicios (id_servicio, nombre, descripcion, activo) VALUES
  (1, 'Medicina General', 'Consulta médica general y control preventivo.', 1),
  (2, 'Odontología', 'Evaluación y cuidado de la salud bucal.', 1),
  (3, 'Psicología', 'Orientación y acompañamiento psicológico.', 1),
  (4, 'Oftalmología', 'Evaluación y cuidado de la salud visual.', 1),
  (5, 'Vacunación', 'Inmunizaciones y campañas preventivas.', 1),
  (6, 'Laboratorio Clínico', 'Orientación para análisis clínicos.', 1);

-- Hash compatible con password_verify() para la contraseña demo Uns2026*.
INSERT IGNORE INTO usuarios
  (id_usuario, id_rol, nombres, apellidos, dni, codigo_universitario, correo, contrasena_hash, activo)
VALUES
  (1, 2, 'Juan', 'Pérez Salas', '40123456', NULL, 'juan.perez@uns.edu.pe', '$6$SQ.g3jcoVzg2f4LT$IODfucnctBQ/C4DiMl.nRSOABwdV518sJLhfh1Ny.hVGfz5lLAk9NjNJJyJglnB6Gus.Ww.Lw3X1Y1jR08enA0', 1),
  (2, 1, 'Brayam Jhoan', 'Rubio Gonzales', '60817359', '0202414046', 'brayam.rubio@example.test', '$6$SQ.g3jcoVzg2f4LT$IODfucnctBQ/C4DiMl.nRSOABwdV518sJLhfh1Ny.hVGfz5lLAk9NjNJJyJglnB6Gus.Ww.Lw3X1Y1jR08enA0', 1),
  (7, 4, 'Administrador', 'Sistema UNS', '40000001', NULL, 'admin@uns.edu.pe', '$6$SQ.g3jcoVzg2f4LT$IODfucnctBQ/C4DiMl.nRSOABwdV518sJLhfh1Ny.hVGfz5lLAk9NjNJJyJglnB6Gus.Ww.Lw3X1Y1jR08enA0', 1),
  (8, 3, 'Recepción', 'Servicio Médico', '40000002', NULL, 'recepcion@uns.edu.pe', '$6$SQ.g3jcoVzg2f4LT$IODfucnctBQ/C4DiMl.nRSOABwdV518sJLhfh1Ny.hVGfz5lLAk9NjNJJyJglnB6Gus.Ww.Lw3X1Y1jR08enA0', 1),
  (9, 2, 'Ana', 'Torres', '40000003', NULL, 'ana.torres@uns.edu.pe', '$6$SQ.g3jcoVzg2f4LT$IODfucnctBQ/C4DiMl.nRSOABwdV518sJLhfh1Ny.hVGfz5lLAk9NjNJJyJglnB6Gus.Ww.Lw3X1Y1jR08enA0', 1),
  (10, 2, 'Luis', 'Mendoza', '40000004', NULL, 'luis.mendoza@uns.edu.pe', '$6$SQ.g3jcoVzg2f4LT$IODfucnctBQ/C4DiMl.nRSOABwdV518sJLhfh1Ny.hVGfz5lLAk9NjNJJyJglnB6Gus.Ww.Lw3X1Y1jR08enA0', 1),
  (11, 2, 'Rosa', 'Quispe', '40000005', NULL, 'rosa.quispe@uns.edu.pe', '$6$SQ.g3jcoVzg2f4LT$IODfucnctBQ/C4DiMl.nRSOABwdV518sJLhfh1Ny.hVGfz5lLAk9NjNJJyJglnB6Gus.Ww.Lw3X1Y1jR08enA0', 1),
  (12, 2, 'Carmen', 'Díaz', '40000006', NULL, 'carmen.diaz@uns.edu.pe', '$6$SQ.g3jcoVzg2f4LT$IODfucnctBQ/C4DiMl.nRSOABwdV518sJLhfh1Ny.hVGfz5lLAk9NjNJJyJglnB6Gus.Ww.Lw3X1Y1jR08enA0', 1),
  (13, 2, 'Pedro', 'Ramos', '40000007', NULL, 'pedro.ramos@uns.edu.pe', '$6$SQ.g3jcoVzg2f4LT$IODfucnctBQ/C4DiMl.nRSOABwdV518sJLhfh1Ny.hVGfz5lLAk9NjNJJyJglnB6Gus.Ww.Lw3X1Y1jR08enA0', 1);

INSERT IGNORE INTO medicos (id_medico, id_usuario, numero_colegiatura, consultorio, activo) VALUES
  (1, 1, 'CMP-045678', 'Consultorio N° 1', 1),
  (2, 9, 'COP-045679', 'Consultorio N° 2', 1),
  (3, 10, 'PSI-045680', 'Consultorio N° 3', 1),
  (4, 11, 'CMP-045681', 'Consultorio N° 4', 1),
  (5, 12, 'ENF-045682', 'Tópico de Vacunación', 1),
  (6, 13, 'LAB-045683', 'Laboratorio Clínico', 1);

INSERT IGNORE INTO medico_servicio (id_medico, id_servicio) VALUES
  (1, 1), (2, 2), (3, 3), (4, 4), (5, 5), (6, 6);

-- Genera horarios de 30 minutos, lunes a viernes, para los próximos 60 días.
-- Los horarios ya existentes no se duplican al volver a importar este bloque.
INSERT IGNORE INTO horarios_medicos (id_medico, id_servicio, fecha, hora_inicio, hora_fin)
SELECT ms.id_medico, ms.id_servicio,
       DATE_ADD(CURDATE(), INTERVAL dias.n DAY),
       horas.hora_inicio,
       ADDTIME(horas.hora_inicio, '00:30:00')
FROM medico_servicio ms
CROSS JOIN (
  SELECT 0 AS n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
  UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9
  UNION ALL SELECT 10 UNION ALL SELECT 11 UNION ALL SELECT 12 UNION ALL SELECT 13 UNION ALL SELECT 14
  UNION ALL SELECT 15 UNION ALL SELECT 16 UNION ALL SELECT 17 UNION ALL SELECT 18 UNION ALL SELECT 19
  UNION ALL SELECT 20 UNION ALL SELECT 21 UNION ALL SELECT 22 UNION ALL SELECT 23 UNION ALL SELECT 24
  UNION ALL SELECT 25 UNION ALL SELECT 26 UNION ALL SELECT 27 UNION ALL SELECT 28 UNION ALL SELECT 29
  UNION ALL SELECT 30 UNION ALL SELECT 31 UNION ALL SELECT 32 UNION ALL SELECT 33 UNION ALL SELECT 34
  UNION ALL SELECT 35 UNION ALL SELECT 36 UNION ALL SELECT 37 UNION ALL SELECT 38 UNION ALL SELECT 39
  UNION ALL SELECT 40 UNION ALL SELECT 41 UNION ALL SELECT 42 UNION ALL SELECT 43 UNION ALL SELECT 44
  UNION ALL SELECT 45 UNION ALL SELECT 46 UNION ALL SELECT 47 UNION ALL SELECT 48 UNION ALL SELECT 49
  UNION ALL SELECT 50 UNION ALL SELECT 51 UNION ALL SELECT 52 UNION ALL SELECT 53 UNION ALL SELECT 54
  UNION ALL SELECT 55 UNION ALL SELECT 56 UNION ALL SELECT 57 UNION ALL SELECT 58 UNION ALL SELECT 59
  UNION ALL SELECT 60
) AS dias
CROSS JOIN (
  SELECT '08:00:00' AS hora_inicio UNION ALL SELECT '08:30:00' UNION ALL SELECT '09:00:00'
  UNION ALL SELECT '09:30:00' UNION ALL SELECT '10:00:00' UNION ALL SELECT '10:30:00'
  UNION ALL SELECT '11:00:00' UNION ALL SELECT '11:30:00' UNION ALL SELECT '12:00:00' UNION ALL SELECT '12:30:00'
  UNION ALL SELECT '14:00:00' UNION ALL SELECT '14:30:00' UNION ALL SELECT '15:00:00'
  UNION ALL SELECT '15:30:00' UNION ALL SELECT '16:00:00' UNION ALL SELECT '16:30:00' UNION ALL SELECT '17:00:00'
) AS horas
WHERE WEEKDAY(DATE_ADD(CURDATE(), INTERVAL dias.n DAY)) BETWEEN 0 AND 4;

-- Una reserva inicial para la cuenta demo de estudiante (si aún no tiene una activa).
INSERT INTO citas (id_estudiante, id_servicio, id_horario, fecha, hora_inicio, estado, motivo)
SELECT 2, h.id_servicio, h.id_horario, h.fecha, h.hora_inicio, 'PENDIENTE', 'Control preventivo de salud.'
FROM horarios_medicos h
WHERE h.id_medico = 1 AND h.id_servicio = 1 AND h.activo = 1
  AND h.fecha >= CURDATE()
  AND (h.fecha > CURDATE() OR h.hora_inicio > CURTIME())
  AND NOT EXISTS (
    SELECT 1 FROM citas c
    WHERE c.id_estudiante = 2 AND c.id_servicio = 1 AND c.estado <> 'CANCELADA'
      AND (c.fecha > CURDATE() OR (c.fecha = CURDATE() AND c.hora_inicio > CURTIME()))
  )
  AND NOT EXISTS (
    SELECT 1 FROM citas ocupada
    WHERE ocupada.id_horario = h.id_horario AND ocupada.estado <> 'CANCELADA'
  )
ORDER BY h.fecha, h.hora_inicio
LIMIT 1;


-- ================================================================
-- DATOS HISTÓRICOS DE PRUEBA (un solo estudiante)
-- Citas atendidas y canceladas para probar estadísticas e historial.
-- Se usa el código universitario para localizar al estudiante.
-- Es seguro reimportar estos registros: se comprueba si ya existen.
-- ================================================================

-- Turno ya atendido, exactamente una semana atrás, para Medicina General.
INSERT IGNORE INTO horarios_medicos
  (id_medico, id_servicio, fecha, hora_inicio, hora_fin, activo)
SELECT m.id_medico, s.id_servicio, DATE_SUB(CURDATE(), INTERVAL 7 DAY),
       '09:00:00', '09:30:00', 1
FROM medicos m
JOIN usuarios doctor ON doctor.id_usuario = m.id_usuario AND doctor.dni = '40123456'
JOIN medico_servicio ms ON ms.id_medico = m.id_medico
JOIN servicios s ON s.id_servicio = ms.id_servicio AND s.nombre = 'Medicina General';

INSERT INTO citas (id_estudiante, id_servicio, id_horario, fecha, hora_inicio, estado, motivo)
SELECT alumno.id_usuario, h.id_servicio, h.id_horario, h.fecha, h.hora_inicio,
       'ATENDIDA', 'Consulta preventiva de demostración (historial).'
FROM usuarios alumno
JOIN horarios_medicos h ON h.fecha = DATE_SUB(CURDATE(), INTERVAL 7 DAY)
  AND h.hora_inicio = '09:00:00'
JOIN medicos m ON m.id_medico = h.id_medico
JOIN usuarios doctor ON doctor.id_usuario = m.id_usuario AND doctor.dni = '40123456'
WHERE alumno.codigo_universitario = '0202414046'
  AND NOT EXISTS (
    SELECT 1 FROM citas prev WHERE prev.id_estudiante = alumno.id_usuario
      AND prev.id_horario = h.id_horario
  );

INSERT INTO atenciones (id_cita, id_medico, sintomas, diagnostico, receta_medica, fecha_atencion)
SELECT c.id_cita, h.id_medico,
       'Evaluación preventiva; datos simulados.',
       'Control general de demostración; no es un diagnóstico real.',
       'No corresponde tratamiento; registro de prueba.',
       CONCAT(c.fecha, ' 09:20:00')
FROM citas c
JOIN usuarios alumno ON alumno.id_usuario = c.id_estudiante
JOIN horarios_medicos h ON h.id_horario = c.id_horario
JOIN medicos m ON m.id_medico = h.id_medico
JOIN usuarios doctor ON doctor.id_usuario = m.id_usuario AND doctor.dni = '40123456'
WHERE alumno.codigo_universitario = '0202414046'
  AND c.fecha = DATE_SUB(CURDATE(), INTERVAL 7 DAY)
  AND c.hora_inicio = '09:00:00' AND c.estado = 'ATENDIDA'
  AND NOT EXISTS (SELECT 1 FROM atenciones a WHERE a.id_cita = c.id_cita);

-- Turno cancelado, de hace dos semanas, para Psicología.
INSERT IGNORE INTO horarios_medicos
  (id_medico, id_servicio, fecha, hora_inicio, hora_fin, activo)
SELECT m.id_medico, s.id_servicio, DATE_SUB(CURDATE(), INTERVAL 14 DAY),
       '10:00:00', '10:30:00', 1
FROM medicos m
JOIN usuarios doctor ON doctor.id_usuario = m.id_usuario AND doctor.dni = '40000004'
JOIN medico_servicio ms ON ms.id_medico = m.id_medico
JOIN servicios s ON s.id_servicio = ms.id_servicio AND s.nombre = 'Psicología';

INSERT INTO citas
  (id_estudiante, id_servicio, id_horario, fecha, hora_inicio, estado, motivo, cancelada_en)
SELECT alumno.id_usuario, h.id_servicio, h.id_horario, h.fecha, h.hora_inicio,
       'CANCELADA', 'Cita de demostración cancelada.', CONCAT(h.fecha, ' 08:00:00')
FROM usuarios alumno
JOIN horarios_medicos h ON h.fecha = DATE_SUB(CURDATE(), INTERVAL 14 DAY)
  AND h.hora_inicio = '10:00:00'
JOIN medicos m ON m.id_medico = h.id_medico
JOIN usuarios doctor ON doctor.id_usuario = m.id_usuario AND doctor.dni = '40000004'
WHERE alumno.codigo_universitario = '0202414046'
  AND NOT EXISTS (
    SELECT 1 FROM citas prev WHERE prev.id_estudiante = alumno.id_usuario
      AND prev.id_horario = h.id_horario
  );

-- ================================================================
-- CONSULTAS DE VERIFICACIÓN (se muestran al terminar la importación)
-- ================================================================
SELECT 'usuarios' AS tabla, COUNT(*) AS registros FROM usuarios
UNION ALL SELECT 'roles', COUNT(*) FROM roles
UNION ALL SELECT 'servicios', COUNT(*) FROM servicios
UNION ALL SELECT 'medicos', COUNT(*) FROM medicos
UNION ALL SELECT 'medico_servicio', COUNT(*) FROM medico_servicio
UNION ALL SELECT 'horarios_medicos', COUNT(*) FROM horarios_medicos
UNION ALL SELECT 'citas', COUNT(*) FROM citas
UNION ALL SELECT 'atenciones', COUNT(*) FROM atenciones;

SELECT u.codigo_universitario, CONCAT(u.nombres, ' ', u.apellidos) AS estudiante,
       u.dni, r.nombre AS rol
FROM usuarios u JOIN roles r ON r.id_rol = u.id_rol
WHERE u.codigo_universitario = '0202414046';
