<?php
declare(strict_types=1);

final class BookingController
{
    public function __construct(
        private PDO $db,
        private BookingRepository $bookings,
        private BookingService $service
    ) {}

    public function mine(): never
    {
        $user = Auth::requireRole(['Estudiante']);
        $rows = $this->bookings->studentBookings((int) $user['id_usuario']);
        $result = array_map(static function (array $row): array {
            return [
                'id_cita' => (int) $row['id_cita'],
                'codigo' => 'CIT-' . str_pad((string) $row['id_cita'], 5, '0', STR_PAD_LEFT),
                'fecha' => $row['fecha'],
                'hora_inicio' => $row['hora_inicio'],
                'estado' => $row['estado'],
                'motivo' => $row['motivo'],
                'adjunto' => $row['adjunto_ruta'] ? ['url' => '../backend/public/file.php?id=' . (int) $row['id_cita']] : null,
                'creada_en' => $row['creada_en'],
                'cancelada_en' => $row['cancelada_en'],
                'servicio' => ['id_servicio' => (int) $row['id_servicio'], 'nombre' => $row['servicio']],
                'medico' => $row['medico'] ? ['nombre' => $row['medico'], 'consultorio' => $row['consultorio']] : null,
            ];
        }, $rows);
        ApiResponse::success(['reservas' => $result]);
    }

    public function create(): never
    {
        ApiResponse::requireMethod('POST');
        $user = Auth::requireRole(['Estudiante']);
        $data = ApiResponse::input();
        try {
            $id = $this->service->createForStudent((int) $user['id_usuario'], $data, $_FILES['adjunto'] ?? null);
            ApiResponse::success(['id_cita' => $id, 'codigo' => 'CIT-' . str_pad((string) $id, 5, '0', STR_PAD_LEFT)], 201);
        } catch (DomainException $error) {
            ApiResponse::error($error->getMessage(), 409);
        }
    }

    public function cancel(): never
    {
        ApiResponse::requireMethod('POST');
        $user = Auth::requireRole(['Estudiante']);
        $data = ApiResponse::input();
        $id = filter_var($data['id_cita'] ?? null, FILTER_VALIDATE_INT);
        if (!$id || $id < 1) ApiResponse::error('La reserva indicada no es válida.', 422);
        try {
            $this->service->cancelForStudent((int) $id, (int) $user['id_usuario']);
            ApiResponse::success(['message' => 'La reserva fue cancelada.']);
        } catch (DomainException $error) {
            ApiResponse::error($error->getMessage(), 409);
        }
    }
}
