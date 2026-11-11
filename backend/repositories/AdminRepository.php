<?php
declare(strict_types=1);

final class AdminRepository
{
    public function __construct(private PDO $db) {}

    public function metrics(): array
    {
        $today = $this->db->query(
            "SELECT COUNT(*) AS total,
                    SUM(estado IN ('PENDIENTE','EN_ESPERA','EN_ATENCION')) AS pendientes,
                    SUM(estado = 'ATENDIDA') AS atendidas,
                    SUM(estado = 'CANCELADA') AS canceladas
             FROM citas WHERE fecha = CURDATE()"
        )->fetch() ?: [];

        $monthly = $this->db->query(
            "SELECT DATE_FORMAT(fecha, '%Y-%m') AS periodo, COUNT(*) AS total
             FROM citas WHERE fecha >= DATE_SUB(CURDATE(), INTERVAL 5 MONTH)
             GROUP BY DATE_FORMAT(fecha, '%Y-%m') ORDER BY periodo"
        )->fetchAll();

        $byService = $this->db->query(
            "SELECT s.nombre, COUNT(c.id_cita) AS total
             FROM servicios s LEFT JOIN citas c ON c.id_servicio = s.id_servicio
             AND c.fecha >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
             WHERE s.activo = 1 GROUP BY s.id_servicio, s.nombre ORDER BY total DESC"
        )->fetchAll();

        $counts = $this->db->query(
            "SELECT r.nombre AS rol, COUNT(u.id_usuario) AS total
             FROM roles r LEFT JOIN usuarios u ON u.id_rol = r.id_rol AND u.activo = 1
             GROUP BY r.id_rol, r.nombre ORDER BY r.id_rol"
        )->fetchAll();

        return [
            'hoy' => array_map(static fn($v): int => (int) ($v ?? 0), $today),
            'mensual' => $monthly,
            'servicios' => $byService,
            'usuarios' => $counts,
        ];
    }
}
