-- Datos DEMO para probar el módulo Agenda. Ejecutar UNA vez, después de reservas_medicas_uns.sql.
-- No modifica la estructura. Contraseña de todos los usuarios demo: Uns2026*
USE `reservas_medicas_uns`;

INSERT INTO `usuarios` (`id_usuario`,`id_rol`,`nombres`,`apellidos`,`dni`,`codigo_universitario`,`correo`,`contrasena_hash`) VALUES
(1,2,'Juan','Pérez Salas','40123456',NULL,'juan.perez@uns.edu.pe','$6$SQ.g3jcoVzg2f4LT$IODfucnctBQ/C4DiMl.nRSOABwdV518sJLhfh1Ny.hVGfz5lLAk9NjNJJyJglnB6Gus.Ww.Lw3X1Y1jR08enA0'),
(2,1,'María','López Díaz','73451234','0202110101','maria.lopez@uns.edu.pe','$6$SQ.g3jcoVzg2f4LT$IODfucnctBQ/C4DiMl.nRSOABwdV518sJLhfh1Ny.hVGfz5lLAk9NjNJJyJglnB6Gus.Ww.Lw3X1Y1jR08enA0'),
(3,1,'Carlos','Torres Vega','71234567','0202110102','carlos.torres@uns.edu.pe','$6$SQ.g3jcoVzg2f4LT$IODfucnctBQ/C4DiMl.nRSOABwdV518sJLhfh1Ny.hVGfz5lLAk9NjNJJyJglnB6Gus.Ww.Lw3X1Y1jR08enA0'),
(4,1,'Ana','Rojas Quispe','74561234','0202110103','ana.rojas@uns.edu.pe','$6$SQ.g3jcoVzg2f4LT$IODfucnctBQ/C4DiMl.nRSOABwdV518sJLhfh1Ny.hVGfz5lLAk9NjNJJyJglnB6Gus.Ww.Lw3X1Y1jR08enA0'),
(5,1,'Luis','Sánchez Ramos','70123456','0202110104','luis.sanchez@uns.edu.pe','$6$SQ.g3jcoVzg2f4LT$IODfucnctBQ/C4DiMl.nRSOABwdV518sJLhfh1Ny.hVGfz5lLAk9NjNJJyJglnB6Gus.Ww.Lw3X1Y1jR08enA0'),
(6,1,'Rosa','Medina Cruz','72345678','0202110105','rosa.medina@uns.edu.pe','$6$SQ.g3jcoVzg2f4LT$IODfucnctBQ/C4DiMl.nRSOABwdV518sJLhfh1Ny.hVGfz5lLAk9NjNJJyJglnB6Gus.Ww.Lw3X1Y1jR08enA0');

INSERT INTO `medicos` (`id_medico`,`id_usuario`,`numero_colegiatura`,`activo`) VALUES (1,1,'CMP-045678',1);
INSERT INTO `medico_servicio` (`id_medico`,`id_servicio`) VALUES (1,1),(1,3);

-- Horarios: hoy (Medicina General 08:00-11:30, Psicología tarde) y mañana
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
