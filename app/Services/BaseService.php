<?php

namespace App\Services;

use App\Repositories\BaseRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;

abstract class BaseService
{
    protected BaseRepositoryInterface $repository;

    public function __construct(BaseRepositoryInterface $repository)
    {
        $this->repository = $repository;
    }

    public function getAll(array $columns = ['*']): Collection
    {
        return $this->repository->all($columns);
    }

    public function getPaginated(int $perPage = 20, array $columns = ['*']): LengthAwarePaginator
    {
        return $this->repository->paginate($perPage, $columns);
    }

    public function getById(string $id, array $columns = ['*']): ?Model
    {
        return $this->repository->find($id, $columns);
    }

    public function getByIdOrFail(string $id, array $columns = ['*']): Model
    {
        return $this->repository->findOrFail($id, $columns);
    }

    public function create(array $data): Model
    {
        return $this->repository->create($data);
    }

    public function update(string $id, array $data): bool
    {
        return $this->repository->update($id, $data);
    }

    public function delete(string $id): bool
    {
        return $this->repository->delete($id);
    }

    public function softDelete(string $id): bool
    {
        return $this->repository->softDelete($id);
    }

    public function count(): int
    {
        return $this->repository->count();
    }

    public function exists(string $id): bool
    {
        return $this->repository->exists($id);
    }
}
