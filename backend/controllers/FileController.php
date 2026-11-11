<?php
declare(strict_types=1);

final class FileController
{
    public function __construct(private BookingRepository $bookings) {}

    public function download(): never
    {
        $user = Auth::requireUser();
        if (!in_array($user['rol'] ?? '', ['Estudiante', 'Médico', 'Administrador'], true)) {
            ApiResponse::error('No tienes permisos para descargar este archivo.', 403);
        }
        $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT) ?: 0;
        if ($id < 1) ApiResponse::error('Archivo no encontrado.', 404);
        $row = $this->bookings->findAttachment($id, (int) $user['id_usuario'], (string) $user['rol']);
        if (!$row || !$row['adjunto_ruta']) ApiResponse::error('Archivo no encontrado.', 404);

        $base = realpath(__DIR__ . '/../public/uploads/attachments');
        $path = realpath(__DIR__ . '/../public/' . $row['adjunto_ruta']);
        if (!$base || !$path || !str_starts_with($path, $base . DIRECTORY_SEPARATOR) || !is_file($path)) {
            ApiResponse::error('Archivo no encontrado.', 404);
        }
        $mime = (new finfo(FILEINFO_MIME_TYPE))->file($path) ?: 'application/octet-stream';
        header('Content-Type: ' . $mime);
        header('Cache-Control: private, no-store, max-age=0');
        header('Pragma: no-cache');
        header('Content-Length: ' . filesize($path));
        header('Content-Disposition: attachment; filename="' . basename($path) . '"');
        header('X-Content-Type-Options: nosniff');
        readfile($path);
        exit;
    }
}
