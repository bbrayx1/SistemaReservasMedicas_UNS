<?php
declare(strict_types=1);

final class StudentController
{
    public function __construct(
        private PDO $db,
        private UserRepository $users,
        private BookingRepository $bookings,
        private UploadService $uploads
    ) {}

    public function dashboard(): never
    {
        $user = Auth::requireRole(['Estudiante']);
        ApiResponse::success([
            'user' => $user,
            'proxima_cita' => $this->bookings->nextBooking((int) $user['id_usuario']),
            'estadisticas' => $this->bookings->studentStats((int) $user['id_usuario']),
        ]);
    }

    public function profile(): never
    {
        $user = Auth::requireRole(['Estudiante']);
        $fresh = $this->users->findActiveById((int) $user['id_usuario']);
        if (!$fresh) ApiResponse::error('No se encontró el perfil.', 404);
        $public = Auth::publicUser($fresh);
        $_SESSION['user'] = $public;
        ApiResponse::success(['user' => $public]);
    }

    public function updateProfile(): never
    {
        ApiResponse::requireMethod('POST');
        $user = Auth::requireRole(['Estudiante']);
        $data = ApiResponse::input();
        $email = Validator::email(Validator::requiredString($data, 'correo', 'correo', 150));
        try {
            $this->users->updateEmail((int) $user['id_usuario'], $email);
        } catch (PDOException $error) {
            if ($error->getCode() === '23000') ApiResponse::error('Ese correo ya está registrado.', 409);
            throw $error;
        }
        $fresh = $this->users->findActiveById((int) $user['id_usuario']);
        $_SESSION['user'] = Auth::publicUser($fresh);
        ApiResponse::success(['user' => $_SESSION['user'], 'message' => 'Perfil actualizado.']);
    }

    public function changePassword(): never
    {
        ApiResponse::requireMethod('POST');
        $user = Auth::requireRole(['Estudiante', 'Médico', 'Secretaria', 'Administrador']);
        $data = ApiResponse::input();
        $current = (string) ($data['password_actual'] ?? '');
        $new = (string) ($data['password_nueva'] ?? '');
        if (strlen($new) < 8 || strlen($new) > 72) ApiResponse::error('La nueva contraseña debe tener entre 8 y 72 caracteres.', 422);
        $row = $this->users->findActiveById((int) $user['id_usuario']);
        if (!$row || !password_verify($current, (string) $row['contrasena_hash'])) {
            ApiResponse::error('La contraseña actual no es correcta.', 422);
        }
        $this->users->updatePassword((int) $user['id_usuario'], password_hash($new, PASSWORD_DEFAULT));
        ApiResponse::success(['message' => 'Contraseña actualizada correctamente.']);
    }

    public function updatePhoto(): never
    {
        ApiResponse::requireMethod('POST');
        $user = Auth::requireRole(['Estudiante']);
        $file = $_FILES['foto'] ?? null;
        if (!$file) ApiResponse::error('Selecciona una imagen.', 422);
        $oldPath = $user['foto_perfil'] ?? null;
        $newPath = $this->uploads->saveProfilePhoto($file);
        try {
            $this->users->updatePhoto((int) $user['id_usuario'], $newPath);
        } catch (Throwable $error) {
            $this->uploads->deletePublicFile($newPath);
            throw $error;
        }
        $fresh = $this->users->findActiveById((int) $user['id_usuario']);
        $_SESSION['user'] = Auth::publicUser($fresh);
        if ($oldPath) $this->uploads->deletePublicFile($oldPath);
        ApiResponse::success(['user' => $_SESSION['user'], 'message' => 'Foto de perfil actualizada.']);
    }

    public function removePhoto(): never
    {
        ApiResponse::requireMethod('POST');
        $user = Auth::requireRole(['Estudiante']);
        $oldPath = $user['foto_perfil'] ?? null;
        $this->users->updatePhoto((int) $user['id_usuario'], null);
        $fresh = $this->users->findActiveById((int) $user['id_usuario']);
        $_SESSION['user'] = Auth::publicUser($fresh);
        if ($oldPath) $this->uploads->deletePublicFile($oldPath);
        ApiResponse::success(['user' => $_SESSION['user'], 'message' => 'Foto de perfil eliminada.']);
    }
}
