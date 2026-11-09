<?php
declare(strict_types=1);
require __DIR__ . '/config.php';
session_start();
date_default_timezone_set('America/Lima');
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

class Aviso extends Exception {}
function out(array $d, int $c = 200): never { http_response_code($c); echo json_encode($d, JSON_UNESCAPED_UNICODE); exit; }

try {
    $pdo = new PDO('mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4', DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);

    // ---- Identificar al médico (sesión del login del equipo) ----
    $idUsuario = (int)($_SESSION[SESION_ID_USUARIO] ?? 0);
    if (!$idUsuario && AGENDA_DEMO && in_array($_SERVER['REMOTE_ADDR'] ?? '', ['127.0.0.1', '::1'], true)) {
        $idUsuario = (int)$pdo->query("SELECT id_usuario FROM medicos WHERE activo = 1 ORDER BY id_medico LIMIT 1")->fetchColumn();
    }
    if (!$idUsuario) throw new Aviso('Sesión no iniciada', 401);

    $st = $pdo->prepare("SELECT m.id_medico, CONCAT(u.nombres, ' ', u.apellidos) AS nombre
                         FROM medicos m JOIN usuarios u ON u.id_usuario = m.id_usuario
                         WHERE m.id_usuario = ? AND m.activo = 1 AND u.activo = 1 AND u.id_rol = 2");
    $st->execute([$idUsuario]);
    $medico = $st->fetch();
    if (!$medico) throw new Aviso('Acceso solo para personal médico', 403);
    $idMedico = (int)$medico['id_medico'];

    $hoy = date('Y-m-d');
    $accion = $_GET['accion'] ?? '';

    switch ($accion) {

    case 'agenda': // Citas del día del médico (lectura; el estado lo cambia el módulo de atención)
        $st = $pdo->prepare("SELECT c.id_cita AS id, TIME_FORMAT(c.hora_inicio, '%H:%i') AS hora,
                    CONCAT(u.nombres, ' ', u.apellidos) AS paciente, u.dni, s.nombre AS especialidad,
                    c.estado, u.foto_perfil AS foto
                FROM citas c
                JOIN horarios_medicos h ON h.id_horario = c.id_horario
                JOIN usuarios u ON u.id_usuario = c.id_estudiante
                JOIN servicios s ON s.id_servicio = c.id_servicio
                WHERE h.id_medico = ? AND c.fecha = ?
                ORDER BY c.hora_inicio");
        $st->execute([$idMedico, $hoy]);
        $citas = $st->fetchAll();
        foreach ($citas as &$c) { $c['estado'] = ucfirst(strtolower($c['estado'])); }
        out(['ok' => true, 'medico' => $medico['nombre'], 'fecha' => $hoy, 'citas' => $citas]);

    case 'servicios': // Servicios que atiende este médico
        $st = $pdo->prepare("SELECT s.id_servicio AS id, s.nombre FROM medico_servicio ms
                JOIN servicios s ON s.id_servicio = ms.id_servicio
                WHERE ms.id_medico = ? AND s.activo = 1 ORDER BY s.nombre");
        $st->execute([$idMedico]);
        out(['ok' => true, 'servicios' => $st->fetchAll()]);

    case 'estudiantes': // Buscar paciente por DNI, código o nombre
        $q = trim((string)($_GET['q'] ?? ''));
        if (mb_strlen($q) < 3) out(['ok' => true, 'estudiantes' => []]);
        $like = '%' . addcslashes($q, '%_\\') . '%';
        $st = $pdo->prepare("SELECT id_usuario AS id, CONCAT(nombres, ' ', apellidos) AS nombre, dni,
                    codigo_universitario AS codigo, foto_perfil AS foto
                FROM usuarios WHERE id_rol = 1 AND activo = 1
                  AND (dni LIKE ? OR codigo_universitario LIKE ? OR CONCAT(nombres, ' ', apellidos) LIKE ?)
                ORDER BY apellidos, nombres LIMIT 8");
        $st->execute([$like, $like, $like]);
        out(['ok' => true, 'estudiantes' => $st->fetchAll()]);

    case 'crear_paciente': // Registrar paciente/estudiante (POST JSON)
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') throw new Aviso('Método no permitido', 405);
        $in = json_decode((string)file_get_contents('php://input'), true) ?: [];
        $dni = trim((string)($in['dni'] ?? ''));
        $nombres = trim((string)($in['nombres'] ?? ''));
        $apellidos = trim((string)($in['apellidos'] ?? ''));
        $correo = trim((string)($in['correo'] ?? ''));
        $codigo = trim((string)($in['codigo_universitario'] ?? ''));
        if (!preg_match('/^[0-9]{8}$/', $dni)) throw new Aviso('El DNI debe contener exactamente 8 dígitos');
        if ($nombres === '' || $apellidos === '' || $correo === '') throw new Aviso('Nombres, apellidos y correo son obligatorios');
        if (!filter_var($correo, FILTER_VALIDATE_EMAIL)) throw new Aviso('Correo electrónico no válido');
        // Contraseña temporal: el paciente deberá cambiarla desde su perfil al integrarse el login.
        $claveTemporal = bin2hex(random_bytes(8));
        $hash = password_hash($claveTemporal, PASSWORD_DEFAULT);
        try {
            $st = $pdo->prepare("INSERT INTO usuarios (id_rol,nombres,apellidos,dni,codigo_universitario,correo,contrasena_hash,activo)
                                 VALUES (1,?,?,?,?,?,?,1)");
            $st->execute([$nombres,$apellidos,$dni,$codigo !== '' ? $codigo : null,$correo,$hash]);
            out(['ok'=>true,'id_estudiante'=>(int)$pdo->lastInsertId(),'mensaje'=>'Paciente registrado','clave_temporal'=>$claveTemporal],201);
        } catch (PDOException $e) {
            if ($e->getCode()==='23000') throw new Aviso('DNI, correo o código universitario ya registrado');
            throw $e;
        }

    case 'horarios': // Horas libres del médico para un servicio y fecha
        $idServ = (int)($_GET['id_servicio'] ?? 0);
        $fecha = (string)($_GET['fecha'] ?? '');
        $p = date_parse_from_format('Y-m-d', $fecha);
        if (!$idServ || $p['error_count'] || $p['warning_count']) throw new Aviso('Datos inválidos');
        if ($fecha < $hoy) throw new Aviso('La fecha no puede ser anterior a hoy');
        $st = $pdo->prepare("SELECT h.id_horario AS id, TIME_FORMAT(h.hora_inicio, '%H:%i') AS hora
                FROM horarios_medicos h
                WHERE h.id_medico = ? AND h.id_servicio = ? AND h.fecha = ?
                  AND NOT EXISTS (SELECT 1 FROM citas c WHERE c.id_horario = h.id_horario AND c.estado <> 'CANCELADA')
                ORDER BY h.hora_inicio");
        $st->execute([$idMedico, $idServ, $fecha]);
        $h = $st->fetchAll();
        if ($fecha === $hoy) { $ahora = date('H:i'); $h = array_values(array_filter($h, fn($x) => $x['hora'] > $ahora)); }
        out(['ok' => true, 'horarios' => $h]);

    case 'crear': // Crear cita (POST JSON: id_estudiante, id_horario)
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') throw new Aviso('Método no permitido', 405);
        if (stripos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') !== 0) throw new Aviso('Formato no permitido', 415);
        $in = json_decode((string)file_get_contents('php://input'), true) ?: [];
        $idEst = (int)($in['id_estudiante'] ?? 0);
        $idHor = (int)($in['id_horario'] ?? 0);
        if (!$idEst || !$idHor) throw new Aviso('Datos incompletos');

        $pdo->beginTransaction();
        // Bloquea el horario para que dos reservas simultáneas no tomen la misma hora
        $st = $pdo->prepare("SELECT id_servicio, fecha, hora_inicio FROM horarios_medicos
                             WHERE id_horario = ? AND id_medico = ? FOR UPDATE");
        $st->execute([$idHor, $idMedico]);
        $h = $st->fetch();
        if (!$h) throw new Aviso('Horario no disponible', 404);
        if (strtotime($h['fecha'] . ' ' . $h['hora_inicio']) < time()) throw new Aviso('Ese horario ya pasó', 409);

        $st = $pdo->prepare("SELECT 1 FROM usuarios WHERE id_usuario = ? AND id_rol = 1 AND activo = 1");
        $st->execute([$idEst]);
        if (!$st->fetchColumn()) throw new Aviso('Paciente no válido', 404);

        $st = $pdo->prepare("SELECT 1 FROM citas WHERE id_horario = ? AND estado <> 'CANCELADA' LIMIT 1");
        $st->execute([$idHor]);
        if ($st->fetchColumn()) throw new Aviso('Ese horario ya fue reservado', 409);

        $st = $pdo->prepare("SELECT 1 FROM citas WHERE id_estudiante = ? AND id_servicio = ? AND fecha = ? AND estado <> 'CANCELADA' LIMIT 1");
        $st->execute([$idEst, $h['id_servicio'], $h['fecha']]);
        if ($st->fetchColumn()) throw new Aviso('El paciente ya tiene una cita de este servicio ese día', 409);

        $st = $pdo->prepare("INSERT INTO citas (id_estudiante, id_servicio, id_horario, fecha, hora_inicio, estado)
                             VALUES (?, ?, ?, ?, ?, 'PENDIENTE')");
        $st->execute([$idEst, $h['id_servicio'], $idHor, $h['fecha'], $h['hora_inicio']]);
        $id = (int)$pdo->lastInsertId();
        $pdo->commit();
        out(['ok' => true, 'id_cita' => $id], 201);

    default:
        throw new Aviso('Acción no válida', 404);
    }
} catch (Aviso $e) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    $c = $e->getCode();
    out(['ok' => false, 'error' => $e->getMessage()], $c >= 400 ? $c : 400);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    error_log('[agenda] ' . $e->getMessage());
    out(['ok' => false, 'error' => 'Error interno del servidor'], 500);
}
