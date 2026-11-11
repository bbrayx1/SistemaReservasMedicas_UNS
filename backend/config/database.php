<?php
declare(strict_types=1);

/**
 * Configuración central de MySQL.
 * En producción se recomienda definir DB_HOST, DB_NAME, DB_USER y DB_PASS
 * como variables de entorno. Los valores por defecto corresponden a XAMPP.
 */
return [
    'host' => getenv('DB_HOST') ?: '127.0.0.1',
    'name' => getenv('DB_NAME') ?: 'reservas_medicas_uns',
    'user' => getenv('DB_USER') ?: 'root',
    'pass' => getenv('DB_PASS') ?: '',
    'charset' => 'utf8mb4',
];
