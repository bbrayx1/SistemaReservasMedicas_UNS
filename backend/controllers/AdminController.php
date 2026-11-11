<?php
declare(strict_types=1);

final class AdminController
{
    public function __construct(private AdminRepository $repository) {}

    public function metrics(): never
    {
        Auth::requireRole(['Administrador']);
        ApiResponse::success(['metricas' => $this->repository->metrics()]);
    }
}
