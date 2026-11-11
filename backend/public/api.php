<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

try {
    require_once __DIR__ . '/../bootstrap.php';

    $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
    if ($method === 'POST') Auth::requireCsrf();

    $action = trim((string) ($_GET['action'] ?? ''));
    switch ($action) {
        case 'auth.csrf': $authController->csrf();
        case 'auth.login': $authController->login();
        case 'auth.me': $authController->me();
        case 'auth.logout': $authController->logout();

        case 'catalog.services': $catalogController->services();
        case 'catalog.availability': $catalogController->availability();

        case 'student.dashboard': $studentController->dashboard();
        case 'student.profile': $studentController->profile();
        case 'student.profile.update': $studentController->updateProfile();
        case 'student.password.change': $studentController->changePassword();
        case 'student.photo.update': $studentController->updatePhoto();
        case 'student.photo.remove': $studentController->removePhoto();
        case 'student.bookings': $bookingController->mine();
        case 'student.bookings.create': $bookingController->create();
        case 'student.bookings.cancel': $bookingController->cancel();

        case 'medical.agenda': $medicalController->agenda();
        case 'medical.services': $medicalController->services();
        case 'medical.slots': $medicalController->slots();
        case 'medical.students.search': $medicalController->searchStudents();
        case 'medical.students.create': $medicalController->createPatient();
        case 'medical.bookings.create': $medicalController->createBooking();
        case 'medical.bookings.start': $medicalController->start();
        case 'medical.bookings.complete': $medicalController->complete();

        case 'reception.queue': $receptionController->queue();
        case 'reception.call': $receptionController->callPatient();

        case 'staff.bookings': $staffController->bookings();
        case 'staff.users': $staffController->users();
        case 'staff.users.create': $operationsController->createUser();
        case 'staff.users.update': $operationsController->updateUser();
        case 'staff.users.edit': $operationsController->editUser();
        case 'staff.doctors.assign': $operationsController->assignSpecialty();
        case 'staff.services': $operationsController->services();
        case 'staff.services.save': $operationsController->saveService();
        case 'staff.schedules': $operationsController->schedules();
        case 'staff.schedules.save': $operationsController->saveSchedule();
        case 'staff.schedules.toggle': $operationsController->toggleSchedule();
        case 'staff.patient.history': $operationsController->patientHistory();
        case 'staff.bookings.create': $operationsController->bookForPatient();

        case 'admin.metrics': $adminController->metrics();
        default: ApiResponse::error('Ruta de API no encontrada.', 404);
    }
} catch (PDOException $error) {
    error_log('[UNS API][DB] ' . $error->getMessage());
    ApiResponse::error('No se pudo completar la operación con la base de datos. Verifica la conexión y el esquema.', 500);
} catch (Throwable $error) {
    error_log('[UNS API] ' . $error->getMessage());
    ApiResponse::error('Ocurrió un error interno. Inténtalo nuevamente.', 500);
}
