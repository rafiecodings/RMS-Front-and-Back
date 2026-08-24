<?php

namespace App\Services;

use App\Repositories\BaseRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

abstract class BaseService
{
    protected BaseRepositoryInterface $repository;

    public function __construct(BaseRepositoryInterface $repository)
    {
        $this->repository = $repository;
    }

    public function getAll(array $columns = ['*']): \Illuminate\Database\Eloquent\Collection
    {
        return $this->repository->all($columns);
    }

    public function getPaginated(int $perPage = 20, array $columns = ['*']): LengthAwarePaginator
    {
        return $this->repository->paginate($perPage, $columns);
    }

    public function getById(string $id, array $columns = ['*']): ?\Illuminate\Database\Eloquent\Model
    {
        return $this->repository->find($id, $columns);
    }

    public function getByIdOrFail(string $id, array $columns = ['*']): \Illuminate\Database\Eloquent\Model
    {
        return $this->repository->findOrFail($id, $columns);
    }

    public function create(array $data): \Illuminate\Database\Eloquent\Model
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
