<?php
declare(strict_types=1);

final class StaffController
{
    public function __construct(private BookingRepository $bookings, private PDO $db) {}

    public function bookings(): never
    {
        $user = Auth::requireRole(['Médico', 'Secretaria', 'Administrador']);
        $date = trim((string) ($_GET['fecha'] ?? ''));
        if ($date !== '') $date = Validator::date($date);
        $query = trim((string) ($_GET['q'] ?? ''));
        if (mb_strlen($query) > 100) ApiResponse::error('Búsqueda demasiado extensa.', 422);
        ApiResponse::success(['citas' => $this->bookings->staffBookings(
            (string) $user['rol'], (int) $user['id_usuario'], $date ?: null, $query
        )]);
    }

    public function users(): never
    {
        Auth::requireRole(['Administrador']);
        $stmt = $this->db->query("SELECT u.id_usuario, u.nombres, u.apellidos, u.dni,
                                      u.codigo_universitario, u.correo, u.activo, r.nombre AS rol
                               FROM usuarios u JOIN roles r ON r.id_rol = u.id_rol
                               ORDER BY r.id_rol, u.apellidos LIMIT 500");
        ApiResponse::success(['usuarios' => $stmt->fetchAll()]);
    }
}
