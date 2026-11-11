<?php
declare(strict_types=1);

final class ReceptionController
{
    public function __construct(private BookingRepository $bookings) {}

    public function queue(): never
    {
        Auth::requireRole(['Secretaria', 'Administrador']);
        ApiResponse::success(['citas' => $this->bookings->receptionQueue(date('Y-m-d'))]);
    }

    public function callPatient(): never
    {
        ApiResponse::requireMethod('POST');
        Auth::requireRole(['Secretaria', 'Administrador']);
        $data = ApiResponse::input();
        $id = filter_var($data['id_cita'] ?? null, FILTER_VALIDATE_INT);
        if (!$id || $id < 1) ApiResponse::error('Cita no válida.', 422);
        if (!$this->bookings->markWaiting((int) $id)) {
            ApiResponse::error('La cita ya no está pendiente o no corresponde al día de hoy.', 409);
        }
        ApiResponse::success(['message' => 'Paciente marcado en sala de espera.']);
    }
}
