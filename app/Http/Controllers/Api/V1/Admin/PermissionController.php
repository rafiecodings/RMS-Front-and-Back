<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Permission;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PermissionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Permission::query();

        if ($module = $request->input('module')) {
            $query->where('module', $module);
        }

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->whereRaw('LOWER(name) LIKE ?', ["%".strtolower($search)."%"])
                    ->orWhereRaw('LOWER(display_name) LIKE ?', ["%".strtolower($search)."%"]);
            });
        }

        $permissions = $query->orderBy('module')
            ->orderBy('name')
            ->get();

        $grouped = $permissions->groupBy('module')->map(function ($items) {
            return $items->map(fn ($p) => [
                'id' => $p->id,
                'name' => $p->name,
                'display_name' => $p->display_name,
                'module' => $p->module,
                'description' => $p->description,
            ]);
        });

        return $this->success([
            'items' => $grouped,
            'total' => $permissions->count(),
        ]);
    }
}
