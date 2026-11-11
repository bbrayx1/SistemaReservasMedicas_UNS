<?php
declare(strict_types=1);

try {
    require_once __DIR__ . '/../bootstrap.php';
    $fileController->download();
} catch (Throwable $error) {
    error_log('[UNS FILE] ' . $error->getMessage());
    http_response_code(404);
    echo 'Archivo no disponible.';
}
