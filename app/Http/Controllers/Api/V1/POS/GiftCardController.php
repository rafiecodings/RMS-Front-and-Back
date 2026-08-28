<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\POS;

use App\Http\Controllers\Controller;
use App\Models\GiftCard;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GiftCardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = GiftCard::query();

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        if ($search = $request->input('search')) {
            $query->whereRaw('LOWER(code) LIKE ?', ["%".strtolower($search)."%"]);
        }

        $giftCards = $query->orderBy('created_at', 'desc')
            ->paginate($request->integer('per_page', 15));

        $data = $giftCards->getCollection()->map(fn (GiftCard $gc) => [
            'id' => $gc->id,
            'code' => $gc->code,
            'balance' => (float) $gc->balance,
            'initial_amount' => (float) $gc->initial_amount,
            'status' => $gc->status,
            'expires_at' => $gc->expires_at?->toISOString(),
            'created_at' => $gc->created_at?->toISOString(),
            'updated_at' => $gc->updated_at?->toISOString(),
        ]);

        return $this->success([
            'items' => $data,
            'pagination' => [
                'current_page' => $giftCards->currentPage(),
                'last_page' => $giftCards->lastPage(),
                'per_page' => $giftCards->perPage(),
                'total' => $giftCards->total(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code' => 'required|string|max:50|unique:gift_cards,code',
            'initial_amount' => 'required|numeric|min:1',
            'expires_at' => 'nullable|date|after:now',
        ]);

        $giftCard = GiftCard::create([
            'code' => strtoupper($validated['code']),
            'balance' => $validated['initial_amount'],
            'initial_amount' => $validated['initial_amount'],
            'status' => 'active',
            'expires_at' => $validated['expires_at'] ?? null,
        ]);

        return $this->created([
            'id' => $giftCard->id,
            'code' => $giftCard->code,
            'balance' => (float) $giftCard->balance,
            'initial_amount' => (float) $giftCard->initial_amount,
            'status' => $giftCard->status,
            'expires_at' => $giftCard->expires_at?->toISOString(),
            'created_at' => $giftCard->created_at?->toISOString(),
        ], 'Gift card created successfully.');
    }

    public function redeem(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code' => 'required|string',
            'amount' => 'required|numeric|min:0.01',
        ]);

        $giftCard = GiftCard::where('code', strtoupper($validated['code']))
            ->where('status', 'active')
            ->first();

        if (!$giftCard) {
            return $this->notFound('Gift card not found or inactive.');
        }

        if ($giftCard->expires_at && $giftCard->expires_at->isPast()) {
            $giftCard->update(['status' => 'expired']);
            return $this->error('Gift card has expired.', 410);
        }

        if ((float) $giftCard->balance < $validated['amount']) {
            return $this->error('Insufficient gift card balance.', 422);
        }

        $giftCard->decrement('balance', $validated['amount']);

        if ((float) $giftCard->balance <= 0) {
            $giftCard->update(['status' => 'used']);
        }

        return $this->success([
            'id' => $giftCard->id,
            'code' => $giftCard->code,
            'redeemed_amount' => $validated['amount'],
            'remaining_balance' => (float) $giftCard->balance,
            'status' => $giftCard->status,
        ], 'Gift card redeemed successfully.');
    }
}
