<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Table;

use App\Http\Controllers\Controller;
use App\Models\Waitlist;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WaitlistController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Waitlist::query();

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        $waitlist = $query->orderBy('created_at', 'desc')
            ->paginate($request->integer('per_page', 15));

        $data = $waitlist->getCollection()->map(fn (Waitlist $w) => [
            'id' => $w->id,
            'guest_name' => $w->guest_name,
            'guest_phone' => $w->guest_phone,
            'party_size' => $w->party_size,
            'status' => $w->status,
            'notes' => $w->notes,
            'created_at' => $w->created_at?->toISOString(),
            'updated_at' => $w->updated_at?->toISOString(),
        ]);

        return $this->success([
            'items' => $data,
            'pagination' => [
                'current_page' => $waitlist->currentPage(),
                'last_page' => $waitlist->lastPage(),
                'per_page' => $waitlist->perPage(),
                'total' => $waitlist->total(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'guest_name' => 'required|string|max:255',
            'guest_phone' => 'nullable|string|max:50',
            'party_size' => 'required|integer|min:1',
            'notes' => 'nullable|string|max:1000',
        ]);

        $validated['status'] = 'waiting';

        $waitlist = Waitlist::create($validated);

        return $this->created([
            'id' => $waitlist->id,
            'guest_name' => $waitlist->guest_name,
            'guest_phone' => $waitlist->guest_phone,
            'party_size' => $waitlist->party_size,
            'status' => $waitlist->status,
            'notes' => $waitlist->notes,
            'created_at' => $waitlist->created_at?->toISOString(),
            'updated_at' => $waitlist->updated_at?->toISOString(),
        ], 'Guest added to waitlist successfully.');
    }

    public function updateStatus(Request $request, string $id): JsonResponse
    {
        $waitlist = Waitlist::find($id);

        if (! $waitlist) {
            return $this->notFound('Waitlist entry not found.');
        }

        $validated = $request->validate([
            'status' => 'required|string|in:waiting,seated,cancelled,expired',
        ]);

        $waitlist->update(['status' => $validated['status']]);

        return $this->success([
            'id' => $waitlist->id,
            'guest_name' => $waitlist->guest_name,
            'status' => $waitlist->status,
        ], 'Waitlist status updated successfully.');
    }
}
