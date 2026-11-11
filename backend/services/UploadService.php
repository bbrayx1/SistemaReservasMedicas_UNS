<?php
declare(strict_types=1);

final class UploadService
{
    private const ATTACHMENT_MAX = 2 * 1024 * 1024;
    private const PHOTO_MAX = 4 * 1024 * 1024;

    public function saveAttachment(array $file): ?string
    {
        return $this->save($file, 'attachments', self::ATTACHMENT_MAX, [
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'application/pdf' => 'pdf',
        ]);
    }

    public function saveProfilePhoto(array $file): string
    {
        $path = $this->save($file, 'profiles', self::PHOTO_MAX, [
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'image/webp' => 'webp',
        ]);
        if ($path === null) {
            throw new DomainException('Selecciona una imagen válida.');
        }
        return $path;
    }

    private function save(array $file, string $folder, int $maxBytes, array $allowedMime): ?string
    {
        if (($file['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) {
            return null;
        }
        if (($file['error'] ?? UPLOAD_ERR_OK) !== UPLOAD_ERR_OK) {
            throw new DomainException('No se pudo recibir el archivo.');
        }
        if (($file['size'] ?? 0) > $maxBytes) {
            throw new DomainException('El archivo supera el tamaño máximo permitido.');
        }
        if (!is_uploaded_file($file['tmp_name'] ?? '')) {
            throw new DomainException('El archivo recibido no es válido.');
        }

        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $mime = $finfo->file($file['tmp_name']);
        if (!isset($allowedMime[$mime])) {
            throw new DomainException('El formato del archivo no está permitido.');
        }

        $directory = __DIR__ . '/../public/uploads/' . $folder;
        if (!is_dir($directory) && !mkdir($directory, 0750, true) && !is_dir($directory)) {
            throw new RuntimeException('No se pudo preparar el almacenamiento de archivos.');
        }

        $filename = bin2hex(random_bytes(18)) . '.' . $allowedMime[$mime];
        $destination = $directory . '/' . $filename;
        if (!move_uploaded_file($file['tmp_name'], $destination)) {
            throw new RuntimeException('No se pudo guardar el archivo.');
        }
        return 'uploads/' . $folder . '/' . $filename;
    }

    public function deletePublicFile(?string $relativePath): void
    {
        if (!$relativePath) return;
        $base = realpath(__DIR__ . '/../public/uploads');
        $candidate = realpath(__DIR__ . '/../public/' . ltrim($relativePath, '/'));
        if ($base && $candidate && str_starts_with($candidate, $base . DIRECTORY_SEPARATOR) && is_file($candidate)) {
            @unlink($candidate);
        }
    }
}
