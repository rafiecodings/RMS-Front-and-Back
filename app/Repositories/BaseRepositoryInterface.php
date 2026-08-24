<?php

namespace App\Repositories;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;

interface BaseRepositoryInterface
{
    public function all(array $columns = ['*']): \Illuminate\Database\Eloquent\Collection;

    public function paginate(int $perPage = 20, array $columns = ['*']): LengthAwarePaginator;

    public function find(string $id, array $columns = ['*']): ?\Illuminate\Database\Eloquent\Model;

    public function findOrFail(string $id, array $columns = ['*']): \Illuminate\Database\Eloquent\Model;

    public function create(array $data): \Illuminate\Database\Eloquent\Model;

    public function update(string $id, array $data): bool;

    public function delete(string $id): bool;

    public function softDelete(string $id): bool;

    public function restore(string $id): bool;

    public function count(): int;

    public function exists(string $id): bool;

    public function where(string $column, mixed $value): self;

    public function whereIn(string $column, array $values): self;

    public function orderBy(string $column, string $direction = 'asc'): self;

    public function with(array|string $relations): self;
}
