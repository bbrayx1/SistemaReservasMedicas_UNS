<?php
declare(strict_types=1);

final class AuthController
{
    public function __construct(private PDO $db, private UserRepository $users) {}

    public function csrf(): never
    {
        ApiResponse::success(['csrf_token' => Auth::csrfToken()]);
    }

    public function login(): never
    {
        ApiResponse::requireMethod('POST');
        $data = ApiResponse::input();
        $isStudent = trim((string) ($data['codigo_universitario'] ?? '')) !== '';

        if ($isStudent) {
            $code = trim((string) ($data['codigo_universitario'] ?? ''));
            $dni = trim((string) ($data['dni'] ?? ''));
            $password = (string) ($data['password'] ?? '');
            if (!preg_match('/^\d{10}$/', $code) || !preg_match('/^\d{8}$/', $dni) || $password === '') {
                ApiResponse::error('Verifica tu código universitario, DNI y contraseña.', 422);
            }
            $user = $this->users->findStudentForLogin($code, $dni);
        } else {
            $identifier = trim((string) ($data['identificador'] ?? ''));
            $password = (string) ($data['password'] ?? '');
            if ($identifier === '' || $password === '') {
                ApiResponse::error('Ingresa tu DNI o correo y contraseña.', 422);
            }
            $user = $this->users->findStaffForLogin($identifier);
        }

        if (!$user || !password_verify($password, (string) $user['contrasena_hash'])) {
            ApiResponse::error('Las credenciales ingresadas no son correctas.', 401);
        }
        if (password_needs_rehash((string) $user['contrasena_hash'], PASSWORD_DEFAULT)) {
            $newHash = password_hash($password, PASSWORD_DEFAULT);
            $this->users->updatePassword((int) $user['id_usuario'], $newHash);
            $user['contrasena_hash'] = $newHash;
        }

        session_regenerate_id(true);
        $_SESSION['user'] = Auth::publicUser($user);
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        ApiResponse::success(['user' => $_SESSION['user'], 'csrf_token' => $_SESSION['csrf_token']]);
    }

    public function me(): never
    {
        $user = Auth::requireUser();
        ApiResponse::success(['user' => $user, 'csrf_token' => Auth::csrfToken()]);
    }

    public function logout(): never
    {
        ApiResponse::requireMethod('POST');
        Auth::requireCsrf();
        Auth::startSession();
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', [
                'expires' => time() - 42000,
                'path' => $params['path'],
                'domain' => $params['domain'],
                'secure' => $params['secure'],
                'httponly' => $params['httponly'],
                'samesite' => $params['samesite'] ?? 'Lax',
            ]);
        }
        session_destroy();
        ApiResponse::success(['message' => 'Sesión cerrada correctamente.']);
    }
}
