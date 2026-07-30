<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\POS;

use App\Http\Controllers\Controller;
use App\Models\CashRegisterSession;
use App\Models\Payment;
use App\Models\Refund;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CashRegisterController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = CashRegisterSession::with('user');

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        if ($userId = $request->input('user_id')) {
            $query->where('user_id', $userId);
        }

        $sessions = $query->orderBy('created_at', 'desc')
            ->paginate($request->integer('per_page', 15));

        $data = $sessions->getCollection()->map(fn (CashRegisterSession $s) => [
            'id' => $s->id,
            'user' => [
                'id' => $s->user->id,
                'name' => $s->user->name,
            ],
            'opening_balance' => (float) $s->opening_balance,
            'closing_balance' => $s->closing_balance ? (float) $s->closing_balance : null,
            'actual_balance' => $s->actual_balance ? (float) $s->actual_balance : null,
            'difference' => $s->difference ? (float) $s->difference : null,
            'status' => $s->status,
            'notes' => $s->notes,
            'opened_at' => $s->opened_at?->toISOString(),
            'closed_at' => $s->closed_at?->toISOString(),
            'created_at' => $s->created_at?->toISOString(),
            'updated_at' => $s->updated_at?->toISOString(),
        ]);

        return $this->success([
            'items' => $data,
            'pagination' => [
                'current_page' => $sessions->currentPage(),
                'last_page' => $sessions->lastPage(),
                'per_page' => $sessions->perPage(),
                'total' => $sessions->total(),
            ],
        ]);
    }

    public function open(Request $request): JsonResponse
    {
        $openSession = CashRegisterSession::where('user_id', $request->user()->id)
            ->where('status', 'open')
            ->first();

        if ($openSession) {
            return $this->error('You already have an open cash register session.', 409);
        }

        $validated = $request->validate([
            'opening_balance' => 'required|numeric|min:0',
            'notes' => 'nullable|string|max:500',
        ]);

        $session = CashRegisterSession::create([
            'user_id' => $request->user()->id,
            'opening_balance' => $validated['opening_balance'],
            'status' => 'open',
            'notes' => $validated['notes'] ?? null,
            'opened_at' => now(),
        ]);

        return $this->created([
            'id' => $session->id,
            'opening_balance' => (float) $session->opening_balance,
            'status' => $session->status,
            'opened_at' => $session->opened_at?->toISOString(),
            'created_at' => $session->created_at?->toISOString(),
        ], 'Cash register opened successfully.');
    }

    public function close(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'session_id' => 'required|string|exists:cash_register_sessions,id',
            'actual_balance' => 'required|numeric|min:0',
            'notes' => 'nullable|string|max:500',
        ]);

        $session = CashRegisterSession::find($validated['session_id']);

        if ($session->status !== 'open') {
            return $this->error('Session is not open.', 409);
        }

        $difference = (float) $validated['actual_balance'] - (float) $session->opening_balance;

        $session->update([
            'actual_balance' => $validated['actual_balance'],
            'difference' => $difference,
            'status' => 'closed',
            'notes' => $validated['notes'] ?? $session->notes,
            'closed_at' => now(),
        ]);

        return $this->success([
            'id' => $session->id,
            'opening_balance' => (float) $session->opening_balance,
            'actual_balance' => (float) $session->actual_balance,
            'difference' => (float) $session->difference,
            'status' => $session->status,
            'closed_at' => $session->closed_at?->toISOString(),
        ], 'Cash register closed successfully.');
    }

    public function xReport(Request $request): JsonResponse
    {
        $session = CashRegisterSession::where('status', 'open')
            ->where('user_id', $request->user()->id)
            ->first();

        if (!$session) {
            return $this->error('No open cash register session found.', 404);
        }

        $payments = Payment::whereHas('invoice', fn ($q) => $q->where('created_at', '>=', $session->opened_at))
            ->where('created_at', '>=', $session->opened_at)
            ->get();

        $refunds = Refund::where('status', 'approved')
            ->where('created_at', '>=', $session->opened_at)
            ->get();

        $totalSales = (float) $payments->sum('amount');
        $totalRefunds = (float) $refunds->sum('amount');
        $netSales = $totalSales - $totalRefunds;

        $byMethod = $payments->groupBy('payment_method')->map(fn ($p) => [
            'count' => $p->count(),
            'total' => (float) $p->sum('amount'),
        ]);

        return $this->success([
            'session' => [
                'id' => $session->id,
                'opening_balance' => (float) $session->opening_balance,
                'opened_at' => $session->opened_at?->toISOString(),
            ],
            'summary' => [
                'total_sales' => $totalSales,
                'total_refunds' => $totalRefunds,
                'net_sales' => $netSales,
                'transactions_count' => $payments->count(),
            ],
            'by_payment_method' => $byMethod,
            'generated_at' => now()->toISOString(),
        ]);
    }
}
