<?php
declare(strict_types=1);

final class Auth
{
    public static function startSession(): void
    {
        if (session_status() === PHP_SESSION_ACTIVE) {
            return;
        }

        ini_set('session.use_strict_mode', '1');
        ini_set('session.use_only_cookies', '1');
        session_name('UNS_RESERVAS_SESSION');
        session_set_cookie_params([
            'lifetime' => 0,
            'path' => '/',
            'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
        session_start();
    }

    public static function csrfToken(): string
    {
        self::startSession();
        if (empty($_SESSION['csrf_token'])) {
            $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        }
        return (string) $_SESSION['csrf_token'];
    }

    public static function requireCsrf(): void
    {
        self::startSession();
        $provided = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
        $expected = $_SESSION['csrf_token'] ?? '';
        if (!$provided || !$expected || !hash_equals((string) $expected, (string) $provided)) {
            ApiResponse::error('La sesión de seguridad expiró. Actualiza la página e inténtalo nuevamente.', 419);
        }
    }

    public static function user(): ?array
    {
        self::startSession();
        return isset($_SESSION['user']) && is_array($_SESSION['user']) ? $_SESSION['user'] : null;
    }

    public static function requireUser(): array
    {
        $user = self::user();
        if (!$user) {
            ApiResponse::error('Tu sesión no está iniciada. Ingresa nuevamente.', 401);
        }
        return $user;
    }

    public static function requireRole(array $allowedRoles): array
    {
        $user = self::requireUser();
        if (!in_array($user['rol'] ?? '', $allowedRoles, true)) {
            ApiResponse::error('No tienes permisos para realizar esta operación.', 403);
        }
        return $user;
    }

    public static function publicUser(array $row): array
    {
        return [
            'id_usuario' => (int) $row['id_usuario'],
            'id_rol' => (int) $row['id_rol'],
            'rol' => (string) $row['rol'],
            'nombres' => (string) $row['nombres'],
            'apellidos' => (string) $row['apellidos'],
            'nombre_completo' => trim($row['nombres'] . ' ' . $row['apellidos']),
            'dni' => (string) $row['dni'],
            'codigo_universitario' => $row['codigo_universitario'],
            'correo' => (string) $row['correo'],
            'foto_perfil' => $row['foto_perfil'] ?: null,
        ];
    }
}
