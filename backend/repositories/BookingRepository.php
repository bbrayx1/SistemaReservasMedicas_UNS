<?php
declare(strict_types=1);

final class BookingRepository
{
    public function __construct(private PDO $db) {}

    public function services(?int $doctorId = null): array
    {
        if ($doctorId !== null) {
            $stmt = $this->db->prepare(
                "SELECT s.id_servicio AS id, s.nombre, s.descripcion
                 FROM medico_servicio ms JOIN servicios s ON s.id_servicio = ms.id_servicio
                 WHERE ms.id_medico = ? AND s.activo = 1 ORDER BY s.nombre"
            );
            $stmt->execute([$doctorId]);
            return $stmt->fetchAll();
        }

        return $this->db->query(
            "SELECT id_servicio AS id, nombre, descripcion FROM servicios
             WHERE activo = 1 ORDER BY nombre"
        )->fetchAll();
    }

    public function availableSlots(int $serviceId, string $date, ?int $doctorId = null, ?int $studentId = null): array
    {
        $sql = "SELECT h.id_horario AS id, TIME_FORMAT(h.hora_inicio, '%H:%i') AS hora,
                       TIME_FORMAT(h.hora_fin, '%H:%i') AS hora_fin,
                       m.id_medico, CONCAT(u.nombres, ' ', u.apellidos) AS medico,
                       COALESCE(m.consultorio, 'Centro Médico UNS') AS consultorio
                FROM horarios_medicos h
                JOIN medicos m ON m.id_medico = h.id_medico AND m.activo = 1
                JOIN usuarios u ON u.id_usuario = m.id_usuario AND u.activo = 1
                JOIN servicios s ON s.id_servicio = h.id_servicio AND s.activo = 1
                WHERE h.id_servicio = ? AND h.fecha = ? AND h.activo = 1
                  AND NOT EXISTS (
                    SELECT 1 FROM citas c
                    WHERE c.id_horario = h.id_horario AND c.estado <> 'CANCELADA'
                  )";
        $params = [$serviceId, $date];
        if ($doctorId !== null) {
            $sql .= ' AND h.id_medico = ?';
            $params[] = $doctorId;
        }
        if ($studentId !== null) {
            $sql .= " AND NOT EXISTS (
                SELECT 1 FROM citas c
                JOIN horarios_medicos ocupada ON ocupada.id_horario = c.id_horario
                WHERE c.id_estudiante = ? AND c.fecha = h.fecha AND c.estado <> 'CANCELADA'
                  AND (c.id_servicio = h.id_servicio
                    OR (ocupada.hora_inicio < h.hora_fin AND ocupada.hora_fin > h.hora_inicio))
            )";
            $params[] = $studentId;
        }
        $sql .= ' ORDER BY h.hora_inicio, medico';
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll();

        if ($date === date('Y-m-d')) {
            $now = date('H:i:s');
            $rows = array_values(array_filter($rows, static fn(array $row): bool => $row['hora'] . ':00' > $now));
        }
        return $rows;
    }

    public function lockSchedule(int $scheduleId, ?int $doctorId = null): ?array
    {
        $sql = "SELECT h.id_horario, h.id_medico, h.id_servicio, h.fecha, h.hora_inicio, h.hora_fin,
                       m.consultorio, CONCAT(u.nombres, ' ', u.apellidos) AS medico
                FROM horarios_medicos h
                JOIN medicos m ON m.id_medico = h.id_medico AND m.activo = 1
                JOIN usuarios u ON u.id_usuario = m.id_usuario AND u.activo = 1
                JOIN servicios s ON s.id_servicio = h.id_servicio AND s.activo = 1
                WHERE h.id_horario = ? AND h.activo = 1";
        $params = [$scheduleId];
        if ($doctorId !== null) {
            $sql .= ' AND h.id_medico = ?';
            $params[] = $doctorId;
        }
        $sql .= ' FOR UPDATE';
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetch() ?: null;
    }

    public function isActiveStudent(int $studentId): bool
    {
        $stmt = $this->db->prepare("SELECT 1 FROM usuarios WHERE id_usuario = ? AND id_rol = 1 AND activo = 1 LIMIT 1");
        $stmt->execute([$studentId]);
        return (bool) $stmt->fetchColumn();
    }

    /** Serializa las reservas simultáneas de un mismo estudiante. Debe llamarse dentro de una transacción. */
    public function lockStudent(int $studentId): bool
    {
        $stmt = $this->db->prepare("SELECT id_usuario FROM usuarios WHERE id_usuario = ? AND id_rol = 1 AND activo = 1 FOR UPDATE");
        $stmt->execute([$studentId]);
        return (bool) $stmt->fetchColumn();
    }

    public function hasActiveBookingForSchedule(int $scheduleId): bool
    {
        $stmt = $this->db->prepare("SELECT 1 FROM citas WHERE id_horario = ? AND estado <> 'CANCELADA' LIMIT 1");
        $stmt->execute([$scheduleId]);
        return (bool) $stmt->fetchColumn();
    }

    public function hasActiveStudentServiceBooking(int $studentId, int $serviceId, string $date): bool
    {
        $stmt = $this->db->prepare(
            "SELECT 1 FROM citas WHERE id_estudiante = ? AND id_servicio = ? AND fecha = ?
             AND estado <> 'CANCELADA' LIMIT 1"
        );
        $stmt->execute([$studentId, $serviceId, $date]);
        return (bool) $stmt->fetchColumn();
    }

    public function hasOverlappingStudentBooking(int $studentId, string $date, string $start, string $end): bool
    {
        $stmt = $this->db->prepare(
            "SELECT 1 FROM citas c
             JOIN horarios_medicos h ON h.id_horario = c.id_horario
             WHERE c.id_estudiante = ? AND c.fecha = ? AND c.estado <> 'CANCELADA'
               AND h.hora_inicio < ? AND h.hora_fin > ?
             LIMIT 1"
        );
        $stmt->execute([$studentId, $date, $end, $start]);
        return (bool) $stmt->fetchColumn();
    }

    public function insertBooking(int $studentId, array $schedule, string $reason, ?string $attachmentPath): int
    {
        $stmt = $this->db->prepare(
            "INSERT INTO citas (id_estudiante, id_servicio, id_horario, fecha, hora_inicio, estado, motivo, adjunto_ruta)
             VALUES (?, ?, ?, ?, ?, 'PENDIENTE', ?, ?)"
        );
        $stmt->execute([
            $studentId, (int) $schedule['id_servicio'], (int) $schedule['id_horario'],
            $schedule['fecha'], $schedule['hora_inicio'], $reason, $attachmentPath,
        ]);
        return (int) $this->db->lastInsertId();
    }

    public function studentBookings(int $studentId): array
    {
        $stmt = $this->db->prepare(
            "SELECT c.id_cita, c.fecha, TIME_FORMAT(c.hora_inicio, '%H:%i') AS hora_inicio,
                    c.estado, c.motivo, c.adjunto_ruta, c.creada_en, c.cancelada_en,
                    s.id_servicio, s.nombre AS servicio,
                    m.id_medico, CONCAT(du.nombres, ' ', du.apellidos) AS medico,
                    COALESCE(m.consultorio, 'Centro Médico UNS') AS consultorio
             FROM citas c
             JOIN servicios s ON s.id_servicio = c.id_servicio
             LEFT JOIN horarios_medicos h ON h.id_horario = c.id_horario
             LEFT JOIN medicos m ON m.id_medico = h.id_medico
             LEFT JOIN usuarios du ON du.id_usuario = m.id_usuario
             WHERE c.id_estudiante = ?
             ORDER BY c.fecha DESC, c.hora_inicio DESC"
        );
        $stmt->execute([$studentId]);
        return $stmt->fetchAll();
    }

    public function findStudentBookingForUpdate(int $bookingId, int $studentId): ?array
    {
        $stmt = $this->db->prepare(
            "SELECT c.* FROM citas c WHERE c.id_cita = ? AND c.id_estudiante = ? LIMIT 1 FOR UPDATE"
        );
        $stmt->execute([$bookingId, $studentId]);
        return $stmt->fetch() ?: null;
    }

    public function cancelBooking(int $bookingId): bool
    {
        $stmt = $this->db->prepare(
            "UPDATE citas SET estado = 'CANCELADA', cancelada_en = NOW()
             WHERE id_cita = ? AND estado IN ('PENDIENTE', 'EN_ESPERA')"
        );
        $stmt->execute([$bookingId]);
        return $stmt->rowCount() === 1;
    }

    public function nextBooking(int $studentId): ?array
    {
        $stmt = $this->db->prepare(
            "SELECT c.id_cita, c.fecha, TIME_FORMAT(c.hora_inicio, '%H:%i') AS hora_inicio,
                    c.estado, s.nombre AS servicio,
                    CONCAT(du.nombres, ' ', du.apellidos) AS medico,
                    COALESCE(m.consultorio, 'Centro Médico UNS') AS consultorio
             FROM citas c JOIN servicios s ON s.id_servicio = c.id_servicio
             LEFT JOIN horarios_medicos h ON h.id_horario = c.id_horario
             LEFT JOIN medicos m ON m.id_medico = h.id_medico
             LEFT JOIN usuarios du ON du.id_usuario = m.id_usuario
             WHERE c.id_estudiante = ? AND c.estado IN ('PENDIENTE','EN_ESPERA','EN_ATENCION')
               AND (c.fecha > CURDATE() OR (c.fecha = CURDATE() AND c.hora_inicio >= CURTIME()))
             ORDER BY c.fecha, c.hora_inicio LIMIT 1"
        );
        $stmt->execute([$studentId]);
        return $stmt->fetch() ?: null;
    }

    public function studentStats(int $studentId): array
    {
        $stmt = $this->db->prepare(
            "SELECT COUNT(*) AS total,
                    SUM(estado IN ('PENDIENTE','EN_ESPERA','EN_ATENCION')) AS pendientes,
                    SUM(estado = 'ATENDIDA') AS atendidas,
                    SUM(estado = 'CANCELADA') AS canceladas
             FROM citas WHERE id_estudiante = ?"
        );
        $stmt->execute([$studentId]);
        $row = $stmt->fetch() ?: [];
        return array_map(static fn($v): int => (int) ($v ?? 0), $row);
    }

    public function doctorAgenda(int $doctorId, string $date): array
    {
        $stmt = $this->db->prepare(
            "SELECT c.id_cita AS id, TIME_FORMAT(c.hora_inicio, '%H:%i') AS hora,
                    CONCAT(u.nombres, ' ', u.apellidos) AS paciente, u.dni,
                    s.nombre AS especialidad, c.estado, u.foto_perfil AS foto, c.motivo
             FROM citas c JOIN horarios_medicos h ON h.id_horario = c.id_horario
             JOIN usuarios u ON u.id_usuario = c.id_estudiante
             JOIN servicios s ON s.id_servicio = c.id_servicio
             WHERE h.id_medico = ? AND c.fecha = ?
             ORDER BY c.hora_inicio"
        );
        $stmt->execute([$doctorId, $date]);
        return $stmt->fetchAll();
    }

    public function doctorForUser(int $userId): ?array
    {
        $stmt = $this->db->prepare(
            "SELECT m.id_medico, CONCAT(u.nombres, ' ', u.apellidos) AS nombre
             FROM medicos m JOIN usuarios u ON u.id_usuario = m.id_usuario
             WHERE m.id_usuario = ? AND m.activo = 1 AND u.activo = 1"
        );
        $stmt->execute([$userId]);
        return $stmt->fetch() ?: null;
    }

    public function searchStudents(string $query): array
    {
        $like = '%' . addcslashes($query, '%_\\') . '%';
        $stmt = $this->db->prepare(
            "SELECT id_usuario AS id, CONCAT(nombres, ' ', apellidos) AS nombre,
                    dni, codigo_universitario AS codigo, foto_perfil AS foto
             FROM usuarios WHERE id_rol = 1 AND activo = 1
               AND (dni LIKE ? OR codigo_universitario LIKE ? OR CONCAT(nombres, ' ', apellidos) LIKE ?)
             ORDER BY apellidos, nombres LIMIT 10"
        );
        $stmt->execute([$like, $like, $like]);
        return $stmt->fetchAll();
    }

    public function startAppointment(int $bookingId, int $doctorId): void
    {
        $stmt = $this->db->prepare(
            "UPDATE citas c JOIN horarios_medicos h ON h.id_horario = c.id_horario
             SET c.estado = 'EN_ATENCION'
             WHERE c.id_cita = ? AND h.id_medico = ? AND c.fecha = CURDATE()
               AND c.estado IN ('PENDIENTE', 'EN_ESPERA')"
        );
        $stmt->execute([$bookingId, $doctorId]);
        if ($stmt->rowCount() !== 1) {
            throw new DomainException('La cita no está pendiente, no corresponde al día de hoy o no pertenece a tu agenda.');
        }
    }

    public function completeAppointment(int $bookingId, int $doctorId, string $symptoms, string $diagnosis, string $prescription): void
    {
        $stmt = $this->db->prepare(
            "UPDATE citas c JOIN horarios_medicos h ON h.id_horario = c.id_horario
             SET c.estado = 'ATENDIDA'
             WHERE c.id_cita = ? AND h.id_medico = ? AND c.fecha = CURDATE() AND c.estado = 'EN_ATENCION'"
        );
        $stmt->execute([$bookingId, $doctorId]);
        if ($stmt->rowCount() !== 1) {
            throw new DomainException('La cita no está en atención, no corresponde al día de hoy o no pertenece a tu agenda.');
        }
        $stmt = $this->db->prepare(
            "INSERT INTO atenciones (id_cita, id_medico, sintomas, diagnostico, receta_medica)
             VALUES (?, ?, ?, ?, ?)"
        );
        $stmt->execute([$bookingId, $doctorId, $symptoms, $diagnosis, $prescription !== '' ? $prescription : null]);
    }

    public function receptionQueue(string $date): array
    {
        $stmt = $this->db->prepare(
            "SELECT c.id_cita AS id, TIME_FORMAT(c.hora_inicio, '%H:%i') AS hora,
                    CONCAT(u.nombres, ' ', u.apellidos) AS paciente, u.dni,
                    s.nombre AS especialidad, c.estado,
                    CONCAT(du.nombres, ' ', du.apellidos) AS medico
             FROM citas c JOIN usuarios u ON u.id_usuario = c.id_estudiante
             JOIN servicios s ON s.id_servicio = c.id_servicio
             LEFT JOIN horarios_medicos h ON h.id_horario = c.id_horario
             LEFT JOIN medicos m ON m.id_medico = h.id_medico
             LEFT JOIN usuarios du ON du.id_usuario = m.id_usuario
             WHERE c.fecha = ? AND c.estado IN ('PENDIENTE','EN_ESPERA','EN_ATENCION')
             ORDER BY c.hora_inicio"
        );
        $stmt->execute([$date]);
        return $stmt->fetchAll();
    }

    public function markWaiting(int $bookingId): bool
    {
        $stmt = $this->db->prepare(
            "UPDATE citas SET estado = 'EN_ESPERA'
             WHERE id_cita = ? AND fecha = CURDATE() AND estado = 'PENDIENTE'"
        );
        $stmt->execute([$bookingId]);
        return $stmt->rowCount() === 1;
    }

    /** Vista única de reservas, filtrada por rol en el servidor. */
    public function staffBookings(string $role, int $userId, ?string $date = null, string $search = ''): array
    {
        $sql = "SELECT c.id_cita AS id, c.fecha, TIME_FORMAT(c.hora_inicio, '%H:%i') AS hora,
                       c.estado, c.motivo, s.nombre AS especialidad,
                       CONCAT(p.nombres, ' ', p.apellidos) AS paciente, p.dni,
                       CONCAT(d.nombres, ' ', d.apellidos) AS medico,
                       m.consultorio
                FROM citas c
                JOIN usuarios p ON p.id_usuario = c.id_estudiante
                JOIN servicios s ON s.id_servicio = c.id_servicio
                JOIN horarios_medicos h ON h.id_horario = c.id_horario
                JOIN medicos m ON m.id_medico = h.id_medico
                JOIN usuarios d ON d.id_usuario = m.id_usuario
                WHERE 1=1";
        $args = [];
        if ($role === 'Médico') {
            $sql .= ' AND m.id_usuario = ?';
            $args[] = $userId;
        }
        if ($date !== null) {
            $sql .= ' AND c.fecha = ?';
            $args[] = $date;
        }
        if ($search !== '') {
            $sql .= " AND (p.dni LIKE ? OR CONCAT(p.nombres, ' ', p.apellidos) LIKE ? OR s.nombre LIKE ?)";
            $like = '%' . addcslashes($search, '%_\\') . '%';
            array_push($args, $like, $like, $like);
        }
        $sql .= ' ORDER BY c.fecha DESC, c.hora_inicio ASC LIMIT 500';
        $stmt = $this->db->prepare($sql);
        $stmt->execute($args);
        return $stmt->fetchAll();
    }

    public function findAttachment(int $bookingId, int $userId, string $role): ?array
    {
        if (!in_array($role, ['Estudiante', 'Médico', 'Administrador'], true)) {
            return null;
        }

        $sql = "SELECT c.adjunto_ruta FROM citas c
                LEFT JOIN horarios_medicos h ON h.id_horario = c.id_horario
                LEFT JOIN medicos m ON m.id_medico = h.id_medico
                WHERE c.id_cita = ?";
        $params = [$bookingId];
        if ($role === 'Estudiante') {
            $sql .= ' AND c.id_estudiante = ?';
            $params[] = $userId;
        } elseif ($role === 'Médico') {
            $sql .= ' AND m.id_usuario = ?';
            $params[] = $userId;
        }
        $stmt = $this->db->prepare($sql . ' LIMIT 1');
        $stmt->execute($params);
        return $stmt->fetch() ?: null;
    }
}
