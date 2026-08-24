<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Integration;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class IntegrationController extends Controller
{
    public function status(Request $request): JsonResponse
    {
        $modules = [
            'hrms' => ['name' => 'HRMS', 'status' => 'disconnected', 'description' => 'Human Resource Management System'],
            'finance' => ['name' => 'Finance', 'status' => 'disconnected', 'description' => 'Financial Management System'],
            'supply_chain' => ['name' => 'Supply Chain', 'status' => 'disconnected', 'description' => 'Supply Chain Management'],
            'hotel' => ['name' => 'Hotel', 'status' => 'disconnected', 'description' => 'Hotel Management System'],
            'facilities' => ['name' => 'Facilities', 'status' => 'disconnected', 'description' => 'Facilities Management'],
        ];

        return $this->success([
            'modules' => $modules,
            'message' => 'External module integrations will be configured by the Lead Programmer.',
        ]);
    }

    public function storeWebhook(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'url' => 'required|url|max:500',
            'events' => 'required|array|min:1',
            'events.*' => 'string|max:255',
            'description' => 'nullable|string|max:500',
            'is_active' => 'sometimes|boolean',
        ]);

        return $this->created([
            'id' => 'wh_' . uniqid(),
            'url' => $validated['url'],
            'events' => $validated['events'],
            'description' => $validated['description'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
            'created_at' => now()->toISOString(),
        ], 'Webhook created successfully.');
    }

    public function listWebhooks(Request $request): JsonResponse
    {
        return $this->success([
            'items' => [],
            'message' => 'Webhooks will be stored in database once integration module is configured.',
        ]);
    }

    public function deleteWebhook(string $id): JsonResponse
    {
        return $this->noContent('Webhook deleted successfully.');
    }

    public function listEvents(Request $request): JsonResponse
    {
        $events = [
            'order.created',
            'order.updated',
            'order.completed',
            'order.cancelled',
            'payment.received',
            'payment.refunded',
            'inventory.low_stock',
            'inventory.out_of_stock',
            'reservation.created',
            'reservation.cancelled',
            'staff.clock_in',
            'staff.clock_out',
            'invoice.generated',
            'invoice.paid',
        ];

        return $this->success([
            'events' => $events,
            'total' => count($events),
        ]);
    }
}
