<?php

namespace App\Repositories;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\ModelNotFoundException;

abstract class BaseRepository implements BaseRepositoryInterface
{
    protected Model $model;
    protected Builder $query;

    public function __construct(Model $model)
    {
        $this->model = $model;
        $this->query = $model->newQuery();
    }

    public function all(array $columns = ['*']): Collection
    {
        return $this->query->get($columns);
    }

    public function paginate(int $perPage = 20, array $columns = ['*']): LengthAwarePaginator
    {
        return $this->query->paginate($perPage, $columns);
    }

    public function find(string $id, array $columns = ['*']): ?Model
    {
        return $this->model->find($id, $columns);
    }

    public function findOrFail(string $id, array $columns = ['*']): Model
    {
        $model = $this->model->find($id, $columns);

        if (!$model) {
            throw new ModelNotFoundException("Model not found with ID: {$id}");
        }

        return $model;
    }

    public function create(array $data): Model
    {
        return $this->model->create($data);
    }

    public function update(string $id, array $data): bool
    {
        $model = $this->findOrFail($id);
        return $model->update($data);
    }

    public function delete(string $id): bool
    {
        $model = $this->findOrFail($id);
        return $model->forceDelete();
    }

    public function softDelete(string $id): bool
    {
        $model = $this->findOrFail($id);
        return $model->delete();
    }

    public function restore(string $id): bool
    {
        $model = $this->model->withTrashed()->findOrFail($id);
        return $model->restore();
    }

    public function count(): int
    {
        return $this->query->count();
    }

    public function exists(string $id): bool
    {
        return $this->model->find($id) !== null;
    }

    public function where(string $column, mixed $value): static
    {
        $this->query->where($column, $value);
        return $this;
    }

    public function whereIn(string $column, array $values): static
    {
        $this->query->whereIn($column, $values);
        return $this;
    }

    public function orderBy(string $column, string $direction = 'asc'): static
    {
        $this->query->orderBy($column, $direction);
        return $this;
    }

    public function with(array|string $relations): static
    {
        $this->query->with($relations);
        return $this;
    }

    protected function resetQuery(): void
    {
        $this->query = $this->model->newQuery();
    }
}
