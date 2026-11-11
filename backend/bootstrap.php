<?php
declare(strict_types=1);

date_default_timezone_set('America/Lima');
ini_set('display_errors', '0');
error_reporting(E_ALL);

require_once __DIR__ . '/core/ApiResponse.php';
require_once __DIR__ . '/core/Database.php';
require_once __DIR__ . '/core/Auth.php';
require_once __DIR__ . '/core/Validator.php';
require_once __DIR__ . '/repositories/UserRepository.php';
require_once __DIR__ . '/repositories/BookingRepository.php';
require_once __DIR__ . '/repositories/AdminRepository.php';
require_once __DIR__ . '/services/UploadService.php';
require_once __DIR__ . '/services/BookingService.php';
require_once __DIR__ . '/controllers/AuthController.php';
require_once __DIR__ . '/controllers/CatalogController.php';
require_once __DIR__ . '/controllers/BookingController.php';
require_once __DIR__ . '/controllers/StudentController.php';
require_once __DIR__ . '/controllers/MedicalController.php';
require_once __DIR__ . '/controllers/ReceptionController.php';
require_once __DIR__ . '/controllers/AdminController.php';
require_once __DIR__ . '/controllers/FileController.php';
require_once __DIR__ . '/controllers/StaffController.php';
require_once __DIR__ . '/controllers/OperationsController.php';

Auth::startSession();
$pdo = Database::connection();
$userRepository = new UserRepository($pdo);
$bookingRepository = new BookingRepository($pdo);
$adminRepository = new AdminRepository($pdo);
$uploadService = new UploadService();
$bookingService = new BookingService($pdo, $bookingRepository, $uploadService);

$authController = new AuthController($pdo, $userRepository);
$catalogController = new CatalogController($pdo, $bookingRepository);
$bookingController = new BookingController($pdo, $bookingRepository, $bookingService);
$studentController = new StudentController($pdo, $userRepository, $bookingRepository, $uploadService);
$medicalController = new MedicalController($pdo, $userRepository, $bookingRepository, $bookingService);
$receptionController = new ReceptionController($bookingRepository);
$adminController = new AdminController($adminRepository);
$fileController = new FileController($bookingRepository);

$staffController = new StaffController($bookingRepository, $pdo);

$operationsController = new OperationsController($pdo, $bookingRepository, $bookingService);
