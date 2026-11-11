<?php
declare(strict_types=1);

final class Validator
{
    public static function requiredString(array $data, string $key, string $label, int $max = 255): string
    {
        $value = trim((string) ($data[$key] ?? ''));
        if ($value === '') {
            ApiResponse::error("El campo {$label} es obligatorio.", 422);
        }
        if (mb_strlen($value) > $max) {
            ApiResponse::error("El campo {$label} supera el máximo de {$max} caracteres.", 422);
        }
        return $value;
    }

    public static function email(string $email): string
    {
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            ApiResponse::error('Ingresa un correo electrónico válido.', 422);
        }
        return $email;
    }

    public static function date(string $date): string
    {
        $parsed = DateTime::createFromFormat('!Y-m-d', $date);
        if (!$parsed || $parsed->format('Y-m-d') !== $date) {
            ApiResponse::error('La fecha seleccionada no es válida.', 422);
        }
        return $date;
    }
}
