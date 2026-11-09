<?php
// Conexión del módulo Agenda (valores por defecto de XAMPP). Si el equipo ya tiene
// un archivo de conexión compartido, puedes reemplazar estas constantes por el suyo.
const DB_HOST = '127.0.0.1';
const DB_NAME = 'reservas_medicas_uns';
const DB_USER = 'root';
const DB_PASS = '';

// Clave de $_SESSION donde el login (Salinas) guarda el id_usuario al iniciar sesión:
//   $_SESSION['id_usuario'] = $fila['id_usuario'];
const SESION_ID_USUARIO = 'id_usuario';

// Modo demo: SOLO desde localhost y SOLO si no hay sesión, usa al primer médico activo
// para poder probar la agenda sin el login. Ponlo en false al integrar/publicar.
const AGENDA_DEMO = true;
