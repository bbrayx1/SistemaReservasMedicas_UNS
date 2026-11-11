<?php
declare(strict_types=1);

final class UserRepository
{
    public function __construct(private PDO $db) {}

    public function findStudentForLogin(string $code, string $dni): ?array
    {
        $stmt = $this->db->prepare(
            "SELECT u.*, r.nombre AS rol
             FROM usuarios u JOIN roles r ON r.id_rol = u.id_rol
             WHERE u.id_rol = 1 AND u.codigo_universitario = ? AND u.dni = ? AND u.activo = 1
             LIMIT 1"
        );
        $stmt->execute([$code, $dni]);
        return $stmt->fetch() ?: null;
    }

    public function findStaffForLogin(string $identifier): ?array
    {
        $stmt = $this->db->prepare(
            "SELECT u.*, r.nombre AS rol
             FROM usuarios u JOIN roles r ON r.id_rol = u.id_rol
             WHERE u.id_rol IN (2,3,4) AND (u.dni = ? OR u.correo = ?) AND u.activo = 1
             LIMIT 1"
        );
        $stmt->execute([$identifier, $identifier]);
        return $stmt->fetch() ?: null;
    }

    public function findActiveById(int $id): ?array
    {
        $stmt = $this->db->prepare(
            "SELECT u.*, r.nombre AS rol FROM usuarios u
             JOIN roles r ON r.id_rol = u.id_rol
             WHERE u.id_usuario = ? AND u.activo = 1 LIMIT 1"
        );
        $stmt->execute([$id]);
        return $stmt->fetch() ?: null;
    }

    public function updateEmail(int $id, string $email): void
    {
        $stmt = $this->db->prepare('UPDATE usuarios SET correo = ? WHERE id_usuario = ?');
        $stmt->execute([$email, $id]);
    }

    public function updatePassword(int $id, string $hash): void
    {
        $stmt = $this->db->prepare('UPDATE usuarios SET contrasena_hash = ? WHERE id_usuario = ?');
        $stmt->execute([$hash, $id]);
    }

    public function updatePhoto(int $id, ?string $path): void
    {
        $stmt = $this->db->prepare('UPDATE usuarios SET foto_perfil = ? WHERE id_usuario = ?');
        $stmt->execute([$path, $id]);
    }

    public function createStudent(array $data, string $passwordHash): int
    {
        $stmt = $this->db->prepare(
            "INSERT INTO usuarios (id_rol, nombres, apellidos, dni, codigo_universitario, correo, contrasena_hash, activo)
             VALUES (1, ?, ?, ?, ?, ?, ?, 1)"
        );
        $stmt->execute([
            $data['nombres'], $data['apellidos'], $data['dni'],
            $data['codigo_universitario'] !== '' ? $data['codigo_universitario'] : null,
            $data['correo'], $passwordHash,
        ]);
        return (int) $this->db->lastInsertId();
    }
}
