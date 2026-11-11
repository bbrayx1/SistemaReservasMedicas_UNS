<?php
declare(strict_types=1);

final class MedicalController
{
    public function __construct(
        private PDO $db,
        private UserRepository $users,
        private BookingRepository $bookings,
        private BookingService $bookingService
    ) {}

    private function doctor(array $user): array
    {
        $doctor = $this->bookings->doctorForUser((int) $user['id_usuario']);
        if (!$doctor) ApiResponse::error('No tienes un perfil médico activo.', 403);
        return $doctor;
    }

    public function agenda(): never
    {
        $user = Auth::requireRole(['Médico']);
        $doctor = $this->doctor($user);
        $date = (string) ($_GET['fecha'] ?? date('Y-m-d'));
        $date = Validator::date($date);
        $appointments = $this->bookings->doctorAgenda((int) $doctor['id_medico'], $date);
        foreach ($appointments as &$appointment) $appointment['id'] = (int) $appointment['id'];
        ApiResponse::success([
            'medico' => $doctor['nombre'],
            'fecha' => $date,
            'citas' => $appointments,
        ]);
    }

    public function services(): never
    {
        $user = Auth::requireRole(['Médico']);
        $doctor = $this->doctor($user);
        ApiResponse::success(['servicios' => $this->bookings->services((int) $doctor['id_medico'])]);
    }

    public function slots(): never
    {
        $user = Auth::requireRole(['Médico']);
        $doctor = $this->doctor($user);
        $serviceId = filter_input(INPUT_GET, 'id_servicio', FILTER_VALIDATE_INT) ?: 0;
        $date = Validator::date((string) ($_GET['fecha'] ?? ''));
        if ($serviceId < 1) ApiResponse::error('Servicio no válido.', 422);
        $day = new DateTime($date, new DateTimeZone('America/Lima'));
        $today = new DateTime('today', new DateTimeZone('America/Lima'));
        $maxDate = (clone $today)->modify('+60 days');
        if ($day < $today || $day > $maxDate) {
            ApiResponse::error('La fecha debe estar dentro de los próximos 60 días.', 422);
        }
        if ((int) $day->format('N') >= 6) {
            ApiResponse::success(['horarios' => []]);
        }
        ApiResponse::success(['horarios' => $this->bookings->availableSlots($serviceId, $date, (int) $doctor['id_medico'])]);
    }

    public function searchStudents(): never
    {
        Auth::requireRole(['Médico', 'Secretaria', 'Administrador']);
        $query = trim((string) ($_GET['q'] ?? ''));
        if (mb_strlen($query) < 3) ApiResponse::success(['estudiantes' => []]);
        ApiResponse::success(['estudiantes' => $this->bookings->searchStudents($query)]);
    }

    public function createPatient(): never
    {
        ApiResponse::requireMethod('POST');
        Auth::requireRole(['Médico', 'Secretaria', 'Administrador']);
        $data = ApiResponse::input();
        $dni = Validator::requiredString($data, 'dni', 'DNI', 8);
        if (!preg_match('/^\d{8}$/', $dni)) ApiResponse::error('El DNI debe contener exactamente 8 dígitos.', 422);
        $names = Validator::requiredString($data, 'nombres', 'nombres', 80);
        $surnames = Validator::requiredString($data, 'apellidos', 'apellidos', 80);
        $email = Validator::email(Validator::requiredString($data, 'correo', 'correo', 150));
        $code = trim((string) ($data['codigo_universitario'] ?? ''));
        if ($code !== '' && !preg_match('/^\d{10}$/', $code)) ApiResponse::error('El código universitario debe tener 10 dígitos.', 422);

        $temporaryPassword = bin2hex(random_bytes(5));
        try {
            $id = $this->users->createStudent([
                'nombres' => $names,
                'apellidos' => $surnames,
                'dni' => $dni,
                'codigo_universitario' => $code,
                'correo' => $email,
            ], password_hash($temporaryPassword, PASSWORD_DEFAULT));
        } catch (PDOException $error) {
            if ($error->getCode() === '23000') ApiResponse::error('El DNI, correo o código universitario ya está registrado.', 409);
            throw $error;
        }
        ApiResponse::success([
            'id_estudiante' => $id,
            'clave_temporal' => $temporaryPassword,
            'mensaje' => 'Paciente registrado. Entrega la clave temporal por un canal seguro.',
        ], 201);
    }

    public function createBooking(): never
    {
        ApiResponse::requireMethod('POST');
        $user = Auth::requireRole(['Médico']);
        $doctor = $this->doctor($user);
        $data = ApiResponse::input();
        $studentId = filter_var($data['id_estudiante'] ?? null, FILTER_VALIDATE_INT);
        $scheduleId = filter_var($data['id_horario'] ?? null, FILTER_VALIDATE_INT);
        if (!$studentId || !$scheduleId) ApiResponse::error('Selecciona paciente y horario.', 422);
        try {
            $id = $this->bookingService->createForPatient((int) $studentId, (int) $scheduleId, (int) $doctor['id_medico']);
            ApiResponse::success(['id_cita' => $id], 201);
        } catch (DomainException $error) {
            ApiResponse::error($error->getMessage(), 409);
        }
    }

    public function start(): never
    {
        ApiResponse::requireMethod('POST');
        $user = Auth::requireRole(['Médico']);
        $doctor = $this->doctor($user);
        $data = ApiResponse::input();
        $bookingId = filter_var($data['id_cita'] ?? null, FILTER_VALIDATE_INT);
        if (!$bookingId || $bookingId < 1) ApiResponse::error('La cita indicada no es válida.', 422);

        try {
            $this->bookings->startAppointment((int) $bookingId, (int) $doctor['id_medico']);
        } catch (DomainException $error) {
            ApiResponse::error($error->getMessage(), 409);
        }
        ApiResponse::success(['message' => 'La atención ha comenzado.']);
    }

    public function complete(): never
    {
        ApiResponse::requireMethod('POST');
        $user = Auth::requireRole(['Médico']);
        $doctor = $this->doctor($user);
        $data = ApiResponse::input();
        $bookingId = filter_var($data['id_cita'] ?? null, FILTER_VALIDATE_INT);
        $symptoms = trim((string) ($data['sintomas'] ?? ''));
        $diagnosis = trim((string) ($data['diagnostico'] ?? ''));
        $prescription = trim((string) ($data['receta_medica'] ?? ''));
        if (!$bookingId || $symptoms === '' || $diagnosis === '') {
            ApiResponse::error('La cita, los síntomas y el diagnóstico son obligatorios.', 422);
        }
        if (mb_strlen($symptoms) > 5000 || mb_strlen($diagnosis) > 5000 || mb_strlen($prescription) > 5000) {
            ApiResponse::error('Los datos de atención son demasiado extensos.', 422);
        }
        $this->db->beginTransaction();
        try {
            $this->bookings->completeAppointment((int) $bookingId, (int) $doctor['id_medico'], $symptoms, $diagnosis, $prescription);
            $this->db->commit();
        } catch (DomainException $error) {
            if ($this->db->inTransaction()) $this->db->rollBack();
            ApiResponse::error($error->getMessage(), 409);
        } catch (Throwable $error) {
            if ($this->db->inTransaction()) $this->db->rollBack();
            throw $error;
        }
        ApiResponse::success(['message' => 'Atención registrada y cita finalizada.']);
    }
}
