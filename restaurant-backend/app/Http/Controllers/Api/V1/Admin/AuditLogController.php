<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = AuditLog::with('user');

        if ($userId = $request->input('user_id')) {
            $query->where('user_id', $userId);
        }

        if ($action = $request->input('action')) {
            $query->where('action', $action);
        }

        if ($model = $request->input('model')) {
            $query->where('auditable_type', $model);
        }

        if ($from = $request->input('from')) {
            $query->where('created_at', '>=', $from);
        }

        if ($to = $request->input('to')) {
            $query->where('created_at', '<=', $to);
        }

        $logs = $query->orderBy('created_at', 'desc')
            ->paginate($request->integer('per_page', 25));

        $data = $logs->getCollection()->map(fn (AuditLog $log) => [
            'id' => $log->id,
            'user' => $log->user ? [
                'id' => $log->user->id,
                'name' => $log->user->name,
                'email' => $log->user->email,
            ] : null,
            'action' => $log->action,
            'model' => $log->auditable_type,
            'model_id' => $log->auditable_id,
            'old_values' => $log->old_values,
            'new_values' => $log->new_values,
            'ip_address' => $log->ip_address,
            'user_agent' => $log->user_agent,
            'created_at' => $log->created_at?->toISOString(),
        ]);

        return $this->success([
            'items' => $data,
            'pagination' => [
                'current_page' => $logs->currentPage(),
                'last_page' => $logs->lastPage(),
                'per_page' => $logs->perPage(),
                'total' => $logs->total(),
            ],
        ]);
    }
}
