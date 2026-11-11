<?php
declare(strict_types=1);

final class BookingService
{
    public function __construct(
        private PDO $db,
        private BookingRepository $bookings,
        private UploadService $uploads
    ) {}

    public function createForStudent(int $studentId, array $data, ?array $attachment): int
    {
        $scheduleId = filter_var($data['id_horario'] ?? null, FILTER_VALIDATE_INT);
        if (!$scheduleId || $scheduleId < 1) {
            throw new DomainException('Selecciona un horario disponible.');
        }
        $reason = trim((string) ($data['motivo'] ?? ''));
        if (mb_strlen($reason) > 500) {
            throw new DomainException('El motivo no puede superar los 500 caracteres.');
        }

        $this->db->beginTransaction();
        $attachmentPath = null;
        try {
            if (!$this->bookings->lockStudent($studentId)) {
                throw new DomainException('La cuenta de estudiante no está activa.');
            }
            $schedule = $this->bookings->lockSchedule((int) $scheduleId);
            if (!$schedule) throw new DomainException('El horario seleccionado ya no existe.');
            $this->validateSchedule($schedule);
            if ($this->bookings->hasActiveBookingForSchedule((int) $scheduleId)) {
                throw new DomainException('Este horario acaba de ser reservado. Selecciona otro.');
            }
            if ($this->bookings->hasActiveStudentServiceBooking($studentId, (int) $schedule['id_servicio'], $schedule['fecha'])) {
                throw new DomainException('Ya tienes una reserva activa para este servicio en esa fecha.');
            }
            if ($this->bookings->hasOverlappingStudentBooking($studentId, $schedule['fecha'], $schedule['hora_inicio'], $schedule['hora_fin'])) {
                throw new DomainException('Ya tienes otra cita que coincide con ese horario.');
            }

            if ($attachment && ($attachment['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_NO_FILE) {
                $attachmentPath = $this->uploads->saveAttachment($attachment);
            }

            $schedule['id_horario'] = (int) $schedule['id_horario'];
            $id = $this->bookings->insertBooking($studentId, $schedule, $reason, $attachmentPath);
            $this->db->commit();
            return $id;
        } catch (Throwable $error) {
            if ($this->db->inTransaction()) $this->db->rollBack();
            if ($attachmentPath) $this->uploads->deletePublicFile($attachmentPath);
            throw $error;
        }
    }

    public function createForPatient(int $studentId, int $scheduleId, ?int $doctorId): int
    {
        $this->db->beginTransaction();
        try {
            if (!$this->bookings->lockStudent($studentId)) {
                throw new DomainException('El paciente seleccionado no es un estudiante activo.');
            }
            $schedule = $this->bookings->lockSchedule($scheduleId, $doctorId);
            if (!$schedule) throw new DomainException('El horario seleccionado ya no está disponible.');
            $this->validateSchedule($schedule);
            if ($this->bookings->hasActiveBookingForSchedule($scheduleId)) {
                throw new DomainException('Este horario acaba de ser reservado. Selecciona otro.');
            }
            if ($this->bookings->hasActiveStudentServiceBooking($studentId, (int) $schedule['id_servicio'], $schedule['fecha'])) {
                throw new DomainException('El paciente ya tiene una reserva activa para ese servicio en esa fecha.');
            }
            if ($this->bookings->hasOverlappingStudentBooking($studentId, $schedule['fecha'], $schedule['hora_inicio'], $schedule['hora_fin'])) {
                throw new DomainException('El paciente ya tiene otra cita que coincide con ese horario.');
            }
            $schedule['id_horario'] = (int) $schedule['id_horario'];
            $id = $this->bookings->insertBooking($studentId, $schedule, '', null);
            $this->db->commit();
            return $id;
        } catch (Throwable $error) {
            if ($this->db->inTransaction()) $this->db->rollBack();
            throw $error;
        }
    }

    public function cancelForStudent(int $bookingId, int $studentId): void
    {
        $this->db->beginTransaction();
        try {
            $booking = $this->bookings->findStudentBookingForUpdate($bookingId, $studentId);
            if (!$booking) throw new DomainException('La reserva no existe.');
            if ($booking['estado'] !== 'PENDIENTE' && $booking['estado'] !== 'EN_ESPERA') {
                throw new DomainException('Solo puedes cancelar reservas pendientes o en espera.');
            }
            $appointmentAt = new DateTime($booking['fecha'] . ' ' . $booking['hora_inicio'], new DateTimeZone('America/Lima'));
            if ($appointmentAt <= new DateTime('now', new DateTimeZone('America/Lima'))) {
                throw new DomainException('Ya no es posible cancelar una reserva cuya hora de atención comenzó.');
            }
            if (!$this->bookings->cancelBooking($bookingId)) {
                throw new DomainException('La reserva cambió de estado y ya no puede cancelarse.');
            }
            $this->db->commit();
        } catch (Throwable $error) {
            if ($this->db->inTransaction()) $this->db->rollBack();
            throw $error;
        }
    }

    private function validateSchedule(array $schedule): void
    {
        $date = new DateTime($schedule['fecha'], new DateTimeZone('America/Lima'));
        $today = new DateTime('today', new DateTimeZone('America/Lima'));
        $maxDate = (clone $today)->modify('+60 days');
        if ($date < $today || $date > $maxDate) {
            throw new DomainException('Solo puedes reservar desde hoy y hasta 60 días de anticipación.');
        }
        if ((int) $date->format('N') >= 6) {
            throw new DomainException('La atención médica está disponible de lunes a viernes.');
        }
        $time = new DateTime($schedule['fecha'] . ' ' . $schedule['hora_inicio'], new DateTimeZone('America/Lima'));
        if ($time <= new DateTime('now', new DateTimeZone('America/Lima'))) {
            throw new DomainException('La hora seleccionada ya pasó.');
        }
    }
}
