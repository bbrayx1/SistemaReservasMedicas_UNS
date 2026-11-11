<?php
declare(strict_types=1);

final class ApiResponse
{
    public static function json(array $payload, int $status = 200): never
    {
        header('Content-Type: application/json; charset=utf-8');
        header('X-Content-Type-Options: nosniff');
        http_response_code($status);
        echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    public static function success(array $data = [], int $status = 200): never
    {
        self::json(['ok' => true] + $data, $status);
    }

    public static function error(string $message, int $status = 400, array $extra = []): never
    {
        self::json(['ok' => false, 'error' => $message] + $extra, $status);
    }

    public static function input(): array
    {
        $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
        if (stripos($contentType, 'application/json') === 0) {
            $decoded = json_decode((string) file_get_contents('php://input'), true);
            return is_array($decoded) ? $decoded : [];
        }
        return $_POST;
    }

    public static function requireMethod(string $method): void
    {
        if (strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET') !== strtoupper($method)) {
            self::error('Método no permitido.', 405);
        }
    }
}
