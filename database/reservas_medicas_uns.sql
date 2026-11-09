-- 1. Crear la base de datos y usarla
CREATE DATABASE IF NOT EXISTS `reservas_medicas_uns` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `reservas_medicas_uns`;

-- 2. Crear las tablas (Estructura original)
CREATE TABLE `atenciones` (
  `id_atencion` int(10) UNSIGNED NOT NULL,
  `id_cita` int(10) UNSIGNED NOT NULL,
  `id_medico` int(10) UNSIGNED NOT NULL,
  `sintomas` text NOT NULL,
  `diagnostico` text NOT NULL,
  `receta_medica` text DEFAULT NULL,
  `fecha_atencion` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `citas` (
  `id_cita` int(10) UNSIGNED NOT NULL,
  `id_estudiante` int(10) UNSIGNED NOT NULL,
  `id_servicio` smallint(5) UNSIGNED NOT NULL,
  `id_horario` int(10) UNSIGNED DEFAULT NULL,
  `fecha` date NOT NULL,
  `hora_inicio` time NOT NULL,
  `estado` enum('PENDIENTE','ATENDIDA','CANCELADA') NOT NULL DEFAULT 'PENDIENTE',
  `creada_en` timestamp NOT NULL DEFAULT current_timestamp(),
  `cancelada_en` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `horarios_medicos` (
  `id_horario` int(10) UNSIGNED NOT NULL,
  `id_medico` int(10) UNSIGNED NOT NULL,
  `id_servicio` smallint(5) UNSIGNED NOT NULL,
  `fecha` date NOT NULL,
  `hora_inicio` time NOT NULL,
  `hora_fin` time NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `medicos` (
  `id_medico` int(10) UNSIGNED NOT NULL,
  `id_usuario` int(10) UNSIGNED NOT NULL,
  `numero_colegiatura` varchar(30) DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `medico_servicio` (
  `id_medico` int(10) UNSIGNED NOT NULL,
  `id_servicio` smallint(5) UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `roles` (
  `id_rol` tinyint(3) UNSIGNED NOT NULL,
  `nombre` varchar(30) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `servicios` (
  `id_servicio` smallint(5) UNSIGNED NOT NULL,
  `nombre` varchar(80) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `usuarios` (
  `id_usuario` int(10) UNSIGNED NOT NULL,
  `id_rol` tinyint(3) UNSIGNED NOT NULL,
  `nombres` varchar(80) NOT NULL,
  `apellidos` varchar(80) NOT NULL,
  `dni` char(8) NOT NULL,
  `codigo_universitario` char(10) DEFAULT NULL,
  `correo` varchar(150) NOT NULL,
  `contrasena_hash` varchar(255) NOT NULL,
  `foto_perfil` varchar(255) DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `fecha_registro` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Añadir los índices y llaves primarias
ALTER TABLE `atenciones`
  ADD PRIMARY KEY (`id_atencion`),
  ADD UNIQUE KEY `uq_atenciones_cita` (`id_cita`),
  ADD KEY `fk_atenciones_medico` (`id_medico`);

ALTER TABLE `citas`
  ADD PRIMARY KEY (`id_cita`),
  ADD KEY `ix_citas_estudiante_fecha` (`id_estudiante`,`fecha`),
  ADD KEY `ix_citas_agenda` (`fecha`,`hora_inicio`,`estado`),
  ADD KEY `fk_citas_servicio` (`id_servicio`),
  ADD KEY `fk_citas_horario` (`id_horario`,`id_servicio`,`fecha`,`hora_inicio`);

ALTER TABLE `horarios_medicos`
  ADD PRIMARY KEY (`id_horario`),
  ADD UNIQUE KEY `uq_horario_medico_inicio` (`id_medico`,`fecha`,`hora_inicio`),
  ADD UNIQUE KEY `uq_horario_datos_cita` (`id_horario`,`id_servicio`,`fecha`,`hora_inicio`),
  ADD KEY `fk_horario_medico_servicio` (`id_medico`,`id_servicio`);

ALTER TABLE `medicos`
  ADD PRIMARY KEY (`id_medico`),
  ADD UNIQUE KEY `uq_medicos_usuario` (`id_usuario`),
  ADD UNIQUE KEY `uq_medicos_colegiatura` (`numero_colegiatura`);

ALTER TABLE `medico_servicio`
  ADD PRIMARY KEY (`id_medico`,`id_servicio`),
  ADD KEY `fk_medico_servicio_servicio` (`id_servicio`);

ALTER TABLE `roles`
  ADD PRIMARY KEY (`id_rol`),
  ADD UNIQUE KEY `nombre` (`nombre`);

ALTER TABLE `servicios`
  ADD PRIMARY KEY (`id_servicio`),
  ADD UNIQUE KEY `uq_especialidades_nombre` (`nombre`);

ALTER TABLE `usuarios`
  ADD PRIMARY KEY (`id_usuario`),
  ADD UNIQUE KEY `uq_usuarios_dni` (`dni`),
  ADD UNIQUE KEY `uq_usuarios_correo` (`correo`),
  ADD UNIQUE KEY `uq_usuarios_codigo` (`codigo_universitario`),
  ADD KEY `fk_usuarios_rol` (`id_rol`);

-- 4. Configurar el AUTO_INCREMENT
ALTER TABLE `atenciones` MODIFY `id_atencion` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;
ALTER TABLE `citas` MODIFY `id_cita` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;
ALTER TABLE `horarios_medicos` MODIFY `id_horario` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;
ALTER TABLE `medicos` MODIFY `id_medico` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;
ALTER TABLE `roles` MODIFY `id_rol` tinyint(3) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;
ALTER TABLE `servicios` MODIFY `id_servicio` smallint(5) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;
ALTER TABLE `usuarios` MODIFY `id_usuario` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

-- 5. Crear las relaciones (Llaves Foráneas)
ALTER TABLE `atenciones`
  ADD CONSTRAINT `fk_atenciones_cita` FOREIGN KEY (`id_cita`) REFERENCES `citas` (`id_cita`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_atenciones_medico` FOREIGN KEY (`id_medico`) REFERENCES `medicos` (`id_medico`) ON UPDATE CASCADE;

ALTER TABLE `citas`
  ADD CONSTRAINT `fk_citas_estudiante` FOREIGN KEY (`id_estudiante`) REFERENCES `usuarios` (`id_usuario`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_citas_horario` FOREIGN KEY (`id_horario`,`id_servicio`,`fecha`,`hora_inicio`) REFERENCES `horarios_medicos` (`id_horario`, `id_servicio`, `fecha`, `hora_inicio`),
  ADD CONSTRAINT `fk_citas_servicio` FOREIGN KEY (`id_servicio`) REFERENCES `servicios` (`id_servicio`) ON UPDATE CASCADE;

ALTER TABLE `horarios_medicos`
  ADD CONSTRAINT `fk_horario_medico_servicio` FOREIGN KEY (`id_medico`,`id_servicio`) REFERENCES `medico_servicio` (`id_medico`, `id_servicio`) ON UPDATE CASCADE;

ALTER TABLE `medicos`
  ADD CONSTRAINT `fk_medicos_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON UPDATE CASCADE;

ALTER TABLE `medico_servicio`
  ADD CONSTRAINT `fk_medico_servicio_medico` FOREIGN KEY (`id_medico`) REFERENCES `medicos` (`id_medico`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_medico_servicio_servicio` FOREIGN KEY (`id_servicio`) REFERENCES `servicios` (`id_servicio`) ON UPDATE CASCADE;

ALTER TABLE `usuarios`
  ADD CONSTRAINT `fk_usuarios_rol` FOREIGN KEY (`id_rol`) REFERENCES `roles` (`id_rol`) ON UPDATE CASCADE;


-- =========================================================
-- 6. INSERTAR DATOS BÁSICOS Y DEMO (Fusión del 2do archivo)
-- =========================================================

-- Roles y Servicios base
INSERT INTO `roles` (`id_rol`, `nombre`) VALUES
(4, 'Administrador'), (1, 'Estudiante'), (2, 'Médico'), (3, 'Secretaria');

INSERT INTO `servicios` (`id_servicio`, `nombre`, `descripcion`, `activo`) VALUES
(1, 'Medicina General', NULL, 1), (2, 'Odontología', NULL, 1),
(3, 'Psicología', NULL, 1), (4, 'Oftalmología', NULL, 1),
(5, 'Vacunación', NULL, 1), (6, 'Laboratorio Clínico', NULL, 1);

-- Usuarios DEMO
INSERT INTO `usuarios` (`id_usuario`,`id_rol`,`nombres`,`apellidos`,`dni`,`codigo_universitario`,`correo`,`contrasena_hash`) VALUES
(1,2,'Juan','Pérez Salas','40123456',NULL,'juan.perez@uns.edu.pe','$6$SQ.g3jcoVzg2f4LT$IODfucnctBQ/C4DiMl.nRSOABwdV518sJLhfh1Ny.hVGfz5lLAk9NjNJJyJglnB6Gus.Ww.Lw3X1Y1jR08enA0'),
(2,1,'María','López Díaz','73451234','0202110101','maria.lopez@uns.edu.pe','$6$SQ.g3jcoVzg2f4LT$IODfucnctBQ/C4DiMl.nRSOABwdV518sJLhfh1Ny.hVGfz5lLAk9NjNJJyJglnB6Gus.Ww.Lw3X1Y1jR08enA0'),
(3,1,'Carlos','Torres Vega','71234567','0202110102','carlos.torres@uns.edu.pe','$6$SQ.g3jcoVzg2f4LT$IODfucnctBQ/C4DiMl.nRSOABwdV518sJLhfh1Ny.hVGfz5lLAk9NjNJJyJglnB6Gus.Ww.Lw3X1Y1jR08enA0'),
(4,1,'Ana','Rojas Quispe','74561234','0202110103','ana.rojas@uns.edu.pe','$6$SQ.g3jcoVzg2f4LT$IODfucnctBQ/C4DiMl.nRSOABwdV518sJLhfh1Ny.hVGfz5lLAk9NjNJJyJglnB6Gus.Ww.Lw3X1Y1jR08enA0'),
(5,1,'Luis','Sánchez Ramos','70123456','0202110104','luis.sanchez@uns.edu.pe','$6$SQ.g3jcoVzg2f4LT$IODfucnctBQ/C4DiMl.nRSOABwdV518sJLhfh1Ny.hVGfz5lLAk9NjNJJyJglnB6Gus.Ww.Lw3X1Y1jR08enA0'),
(6,1,'Rosa','Medina Cruz','72345678','0202110105','rosa.medina@uns.edu.pe','$6$SQ.g3jcoVzg2f4LT$IODfucnctBQ/C4DiMl.nRSOABwdV518sJLhfh1Ny.hVGfz5lLAk9NjNJJyJglnB6Gus.Ww.Lw3X1Y1jR08enA0');

-- Médicos
INSERT INTO `medicos` (`id_medico`,`id_usuario`,`numero_colegiatura`,`activo`) VALUES (1,1,'CMP-045678',1);
INSERT INTO `medico_servicio` (`id_medico`,`id_servicio`) VALUES (1,1),(1,3);

-- Horarios, Citas y Atenciones
INSERT INTO `horarios_medicos` (`id_horario`,`id_medico`,`id_servicio`,`fecha`,`hora_inicio`,`hora_fin`) VALUES
(1,1,1,CURDATE(),'08:00:00','08:30:00'),(2,1,1,CURDATE(),'08:30:00','09:00:00'),
(3,1,1,CURDATE(),'09:00:00','09:30:00'),(4,1,1,CURDATE(),'09:30:00','10:00:00'),
(5,1,1,CURDATE(),'10:00:00','10:30:00'),(6,1,1,CURDATE(),'10:30:00','11:00:00'),
(7,1,1,CURDATE(),'11:00:00','11:30:00'),(8,1,1,CURDATE(),'11:30:00','12:00:00'),
(9,1,3,CURDATE(),'15:00:00','15:30:00'),(10,1,3,CURDATE(),'15:30:00','16:00:00'),
(11,1,1,CURDATE() + INTERVAL 1 DAY,'08:00:00','08:30:00'),(12,1,1,CURDATE() + INTERVAL 1 DAY,'08:30:00','09:00:00');

INSERT INTO `citas` (`id_cita`,`id_estudiante`,`id_servicio`,`id_horario`,`fecha`,`hora_inicio`,`estado`) VALUES
(101,2,1,1,CURDATE(),'08:00:00','PENDIENTE'),
(102,3,1,2,CURDATE(),'08:30:00','PENDIENTE'),
(103,4,1,3,CURDATE(),'09:00:00','ATENDIDA'),
(104,5,1,4,CURDATE(),'09:30:00','PENDIENTE');

INSERT INTO `atenciones` (`id_cita`,`id_medico`,`sintomas`,`diagnostico`,`receta_medica`) VALUES
(103,1,'Dolor de garganta y malestar general','Faringitis aguda','Paracetamol 500 mg cada 8 horas por 3 días');