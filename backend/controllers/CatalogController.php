<?php
declare(strict_types=1);

final class CatalogController
{
    public function __construct(private PDO $db, private BookingRepository $bookings) {}

    public function services(): never
    {
        Auth::requireRole(['Estudiante', 'Médico', 'Secretaria', 'Administrador']);
        $services = $this->bookings->services();
        foreach ($services as &$service) {
            $service['id'] = (int) $service['id'];
            $service['icono'] = $this->iconFor((string) $service['nombre']);
        }
        ApiResponse::success(['servicios' => $services]);
    }

    public function availability(): never
    {
        $user = Auth::requireRole(['Estudiante', 'Médico', 'Secretaria', 'Administrador']);
        $serviceId = filter_input(INPUT_GET, 'id_servicio', FILTER_VALIDATE_INT) ?: 0;
        $date = Validator::date((string) ($_GET['fecha'] ?? ''));
        if ($serviceId < 1) ApiResponse::error('Selecciona un servicio válido.', 422);
        $day = new DateTime($date, new DateTimeZone('America/Lima'));
        if ((int) $day->format('N') >= 6) ApiResponse::success(['horarios' => []]);
        $max = (new DateTime('today', new DateTimeZone('America/Lima')))->modify('+60 days');
        if ($day < new DateTime('today', new DateTimeZone('America/Lima')) || $day > $max) {
            ApiResponse::error('La fecha debe estar dentro de los próximos 60 días.', 422);
        }
        $studentId = ($user['rol'] ?? '') === 'Estudiante' ? (int) $user['id_usuario'] : null;
        $slots = $this->bookings->availableSlots($serviceId, $date, null, $studentId);
        foreach ($slots as &$slot) {
            $slot['id'] = (int) $slot['id'];
            $slot['id_medico'] = (int) $slot['id_medico'];
        }
        ApiResponse::success(['horarios' => $slots]);
    }

    private function iconFor(string $service): string
    {
        $icons = [
            'Medicina General' => 'ri-stethoscope-line',
            'Odontología' => 'ri-tooth-line',
            'Psicología' => 'ri-mental-health-line',
            'Oftalmología' => 'ri-eye-line',
            'Vacunación' => 'ri-syringe-line',
            'Laboratorio Clínico' => 'ri-flask-line',
        ];
        return $icons[$service] ?? 'ri-heart-pulse-line';
    }
}
