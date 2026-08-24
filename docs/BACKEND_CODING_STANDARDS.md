# Backend Coding Standards

**Project**: Restaurant Management System (RMS)
**Framework**: Laravel 12
**PHP Version**: 8.2+
**Status**: Active — All backend code must follow these standards

---

## 1. PSR-12 Coding Standard

All PHP code must follow [PSR-12 Extended Coding Style](https://www.php-fig.org/psr/psr-12/).

### Rules

- Use **4 spaces** for indentation, never tabs
- There MUST be one blank line after the namespace declaration
- There MUST be one blank line after the `declare(strict_types=1)` statement
- Opening braces for classes MUST go on the next line
- Opening braces for methods MUST go on the next line
- Visibility MUST be declared on all properties and methods
- Use strict types: `declare(strict_types=1);`
- Use `snake_case` for methods and variables
- Use `PascalCase` for class names
- Use `UPPER_SNAKE_CASE` for constants

### Example

```php
<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\SoftDeletes;

class Order extends BaseModel
{
    use SoftDeletes;

    public const STATUS_PLACED = 'placed';

    protected $fillable = [
        'outlet_id',
        'table_id',
        'customer_id',
        'order_type',
        'status',
    ];

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function getStatusLabelAttribute(): string
    {
        return match ($this->status) {
            self::STATUS_PLACED => 'Placed',
            default => 'Unknown',
        };
    }
}
```

---

## 2. RESTful Naming Conventions

### URL Structure

| Method | URL Pattern | Description |
|--------|-------------|-------------|
| GET | `/api/v1/orders` | List orders |
| POST | `/api/v1/orders` | Create order |
| GET | `/api/v1/orders/{id}` | Get single order |
| PUT | `/api/v1/orders/{id}` | Update order |
| DELETE | `/api/v1/orders/{id}` | Soft-delete order |
| PATCH | `/api/v1/orders/{id}/status` | Partial update (status only) |

### Rules

- Use **plural nouns** for resources: `/orders`, not `/order`
- Use **kebab-case** for multi-word URLs: `/menu-items`, not `/menuItems`
- Use **nouns**, not verbs: `/orders/{id}`, not `/getOrder/{id}`
- Nested resources when logical: `/orders/{id}/items`
- Use `PATCH` for partial updates, `PUT` for full updates
- Use `DELETE` for soft-deletes (never hard delete via API)

---

## 3. Singular Model Names

Model class names MUST be singular and in PascalCase.

| Model | Table | Incorrect |
|-------|-------|-----------|
| `Order` | `rms_orders` | `Orders` |
| `MenuItem` | `rms_menu_items` | `MenuItems` |
| `KotTicket` | `rms_kot_tickets` | `KotTickets` |
| `PurchaseOrder` | `rms_purchase_orders` | `PurchaseOrders` |

### Rules

- Model names are **singular**: `Order`, not `Orders`
- Model names use **PascalCase**: `MenuItem`, not `menu_item`
- Model names do **NOT** have a prefix in the class name (prefix is in the table)
- Table names use **snake_case** with `rms_` prefix: `rms_orders`

---

## 4. Plural Database Tables

All database table names MUST be plural and snake_case with the `rms_` prefix.

| Table Name | Model |
|------------|-------|
| `rms_orders` | `Order` |
| `rms_order_items` | `OrderItem` |
| `rms_menu_items` | `MenuItem` |
| `rms_menu_categories` | `MenuCategory` |
| `rms_customers` | `Customer` |
| `rms_tables` | `Table` (use `rms_tables` via `$table` property) |
| `rms_reservations` | `Reservation` |
| `rms_kot_tickets` | `KotTicket` |
| `rms_invoices` | `Invoice` |
| `rms_payments` | `Payment` |
| `rms_ingredients` | `Ingredient` |
| `rms_stock_levels` | `StockLevel` |
| `rms_staff_profiles` | `StaffProfile` |
| `rms_shift_schedules` | `ShiftSchedule` |
| `rms_audit_logs` | `AuditLog` |

### Column Naming Rules

- Use **snake_case**: `created_at`, `order_type`, `table_id`
- Foreign keys end with `_id`: `outlet_id`, `customer_id`
- Boolean columns use `is_`: `is_active`, `is_available`
- Timestamps use `_at`: `created_at`, `deleted_at`
- Pivot tables use singular model names sorted alphabetically: `order_item` (not `order_items`)

---

## 5. Resource Controllers

Every resource MUST use a Resource Controller with the standard 7 methods.

### Controller Structure

```php
<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Order;

use App\Http\Controllers\Controller;
use App\Http\Requests\Order\StoreOrderRequest;
use App\Http\Requests\Order\UpdateOrderRequest;
use App\Http\Resources\Order\OrderResource;
use App\Services\Order\OrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OrderController extends Controller
{
    public function __construct(
        private readonly OrderService $orderService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $orders = $this->orderService->getPaginated(
            perPage: $request->input('per_page', 20)
        );

        return $this->success(
            OrderResource::collection($orders),
            'Orders retrieved successfully'
        );
    }

    public function store(StoreOrderRequest $request): JsonResponse
    {
        $order = $this->orderService->create($request->validated());

        return $this->created(
            new OrderResource($order),
            'Order created successfully'
        );
    }

    public function show(string $id): JsonResponse
    {
        $order = $this->orderService->getByIdOrFail($id);

        return $this->success(
            new OrderResource($order),
            'Order retrieved successfully'
        );
    }

    public function update(UpdateOrderRequest $request, string $id): JsonResponse
    {
        $order = $this->orderService->update($id, $request->validated());

        return $this->success(
            new OrderResource($order),
            'Order updated successfully'
        );
    }

    public function destroy(string $id): JsonResponse
    {
        $this->orderService->softDelete($id);

        return $this->noContent('Order deleted successfully');
    }
}
```

### Rules

- One controller per resource: `OrderController` for `Order`
- Inject service via constructor (never call repository directly from controller)
- Return `JsonResponse` always
- Use `$this->success()`, `$this->created()`, `$this->error()` from `ApiResponder` trait
- Never put business logic in controllers — delegate to Service
- Never put database queries in controllers — delegate to Repository via Service

---

## 6. Form Request Validation

Use Form Request classes for ALL validation. Never validate in controllers.

### File Naming

```
app/Http/Requests/Order/StoreOrderRequest.php
app/Http/Requests/Order/UpdateOrderRequest.php
app/Http/Requests/Customer/StoreCustomerRequest.php
```

### Example

```php
<?php

declare(strict_types=1);

namespace App\Http\Requests\Order;

use App\Http\Requests\BaseRequest;

class StoreOrderRequest extends BaseRequest
{
    public function rules(): array
    {
        return [
            'outlet_id' => ['required', 'uuid', 'exists:rms_outlets,id'],
            'table_id' => ['nullable', 'uuid', 'exists:rms_tables,id'],
            'customer_id' => ['nullable', 'uuid', 'exists:rms_customers,id'],
            'order_type' => ['required', 'string', 'in:dine_in,takeaway,delivery'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.menu_item_id' => ['required', 'uuid', 'exists:rms_menu_items,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.modifiers' => ['nullable', 'array'],
            'items.*.modifiers.*' => ['uuid', 'exists:rms_modifier_options,id'],
            'items.*.notes' => ['nullable', 'string', 'max:500'],
        ];
    }

    public function messages(): array
    {
        return [
            'outlet_id.required' => 'Outlet is required',
            'items.required' => 'At least one item is required',
            'items.min' => 'At least one item is required',
        ];
    }
}
```

### Rules

- Extend `BaseRequest` (handles error formatting automatically)
- Every request MUST define `rules()` method
- Use `exists:rms_table_name,id` for foreign key validation
- Use `unique:rms_table_name,column` for unique validation
- Define `messages()` for custom error messages
- Use `authorized()` to check permissions if needed

---

## 7. Service Classes for Business Logic

Services contain ALL business logic. Controllers and Repositories never contain business logic.

### File Naming

```
app/Services/Order/OrderService.php
app/Services/Menu/MenuService.php
app/Services/Inventory/InventoryService.php
```

### Structure

```php
<?php

declare(strict_types=1);

namespace App\Services\Order;

use App\Repositories\Order\OrderRepository;
use App\Services\BaseService;
use Illuminate\Database\Eloquent\Model;

class OrderService extends BaseService
{
    public function __construct(
        private readonly OrderRepository $orderRepository
    ) {
        parent::__construct($orderRepository);
    }

    public function create(array $data): Model
    {
        // Business logic here
        $data['order_number'] = $this->generateOrderNumber();
        $data['status'] = 'placed';
        $data['created_by'] = auth()->id();

        $order = $this->repository->create($data);

        // Create order items
        foreach ($data['items'] as $item) {
            $order->items()->create($item);
        }

        return $order->load('items');
    }

    public function updateStatus(string $id, string $status): Model
    {
        $order = $this->getByIdOrFail($id);

        // Validate status transition
        $this->validateStatusTransition($order->status, $status);

        $order->update(['status' => $status]);

        return $order->refresh();
    }

    private function validateStatusTransition(string $current, string $next): void
    {
        $validTransitions = [
            'placed' => ['confirmed', 'cancelled'],
            'confirmed' => ['preparing', 'cancelled'],
            'preparing' => ['ready', 'cancelled'],
            'ready' => ['served'],
            'served' => ['completed'],
        ];

        if (!in_array($next, $validTransitions[$current] ?? [])) {
            throw new \InvalidArgumentException(
                "Invalid status transition from {$current} to {$next}"
            );
        }
    }

    private function generateOrderNumber(): string
    {
        return 'ORD-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -6));
    }
}
```

### Rules

- Extend `BaseService`
- Inject Repository via constructor
- Contain ALL business logic
- Contain ALL validation rules for business operations
- Contain ALL status transition logic
- Throw exceptions for invalid operations (never return error codes)
- Use `readonly` properties where possible

---

## 8. Repository Classes for Data Access

Repositories handle ALL database queries. Services never query the database directly.

### File Naming

```
app/Repositories/Order/OrderRepository.php
app/Repositories/Menu/MenuRepository.php
```

### Structure

```php
<?php

declare(strict_types=1);

namespace App\Repositories\Order;

use App\Models\Order;
use App\Repositories\BaseRepository;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class OrderRepository extends BaseRepository
{
    public function __construct(Order $model)
    {
        parent::__construct($model);
    }

    public function getPaginatedWithRelations(int $perPage = 20): LengthAwarePaginator
    {
        return $this->model->newQuery()
            ->with(['table', 'customer', 'items.menuItem'])
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);
    }

    public function findByOutlet(string $outletId, int $perPage = 20): LengthAwarePaginator
    {
        return $this->model->newQuery()
            ->where('outlet_id', $outletId)
            ->with(['table', 'customer'])
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);
    }

    public function getActiveOrders(string $outletId): \Illuminate\Database\Eloquent\Collection
    {
        return $this->model->newQuery()
            ->where('outlet_id', $outletId)
            ->whereIn('status', ['placed', 'confirmed', 'preparing', 'ready'])
            ->with(['table', 'items.menuItem'])
            ->orderBy('created_at', 'asc')
            ->get();
    }

    public function getOrdersByDateRange(
        string $outletId,
        string $startDate,
        string $endDate
    ): \Illuminate\Database\Eloquent\Collection {
        return $this->model->newQuery()
            ->where('outlet_id', $outletId)
            ->whereBetween('created_at', [$startDate, $endDate])
            ->with(['items'])
            ->get();
    }
}
```

### Rules

- Extend `BaseRepository`
- Inject Model via constructor
- Contain ALL database queries
- Use Query Builder for complex queries
- Use Eloquent relationships for simple queries
- Never contain business logic
- Return collections or paginated results
- Name methods descriptively: `getActiveOrders()`, not `get()`

---

## 9. API Resources for JSON Responses

API Resources format data for API responses. Never return raw Eloquent models.

### File Naming

```
app/Http/Resources/Order/OrderResource.php
app/Http/Resources/Order/OrderItemResource.php
```

### Structure

```php
<?php

declare(strict_types=1);

namespace App\Http\Resources\Order;

use App\Http\Resources\BaseResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrderResource extends BaseResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'order_number' => $this->order_number,
            'outlet_id' => $this->outlet_id,
            'table' => new TableResource($this->whenLoaded('table')),
            'customer' => new CustomerResource($this->whenLoaded('customer')),
            'order_type' => $this->order_type,
            'status' => $this->status,
            'items' => OrderItemResource::collection($this->whenLoaded('items')),
            'subtotal' => $this->subtotal,
            'tax_amount' => $this->tax_amount,
            'discount_amount' => $this->discount_amount,
            'total_amount' => $this->total_amount,
            'notes' => $this->notes,
            'created_by' => $this->created_by,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
```

### Rules

- Extend `BaseResource`
- One Resource per Model
- Use `$this->whenLoaded()` for optional relations
- Return arrays, never objects
- Format dates as ISO 8601: `$this->created_at?->toISOString()`
- Never expose sensitive data (passwords, tokens, internal IDs)

---

## 10. Meaningful Commit Structure

Follow [Conventional Commits](https://www.conventionalcommits.org/) for all git commits.

### Format

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

| Type | Description | Example |
|------|-------------|---------|
| `feat` | New feature | `feat(order): add split bill functionality` |
| `fix` | Bug fix | `fix(kot): correct status transition validation` |
| `refactor` | Code restructure | `refactor(menu): extract modifier logic to service` |
| `test` | Add tests | `test(order): add unit tests for status transitions` |
| `docs` | Documentation | `docs(api): update order endpoint documentation` |
| `chore` | Maintenance | `chore(deps): update Laravel to 12.1` |
| `style` | Code style | `style(auth): fix PSR-12 formatting` |
| `perf` | Performance | `perf(inventory): optimize stock query` |
| `ci` | CI/CD | `ci(actions): add PHPUnit workflow` |

### Examples

```
feat(customer): add loyalty points tracking

- Add earn_points method to CustomerService
- Add redeem_points method to CustomerService
- Add loyalty balance endpoint to API

Closes #42
```

```
fix(order): prevent duplicate order submission

OrderService now checks for existing pending orders before creating new ones.
Returns 409 Conflict if duplicate detected.
```

---

## 11. Consistent Folder Naming

### Directory Rules

| Location | Convention | Example |
|----------|------------|---------|
| `app/Http/Controllers/` | PascalCase, singular | `OrderController`, not `OrdersController` |
| `app/Http/Controllers/Api/V1/` | PascalCase, singular by feature | `Order/`, `Menu/`, `KOT/` |
| `app/Models/` | PascalCase, singular | `Order.php`, not `orders.php` |
| `app/Services/` | PascalCase, singular by feature | `Order/OrderService.php` |
| `app/Repositories/` | PascalCase, singular by feature | `Order/OrderRepository.php` |
| `app/Http/Requests/` | PascalCase, singular by feature | `Order/StoreOrderRequest.php` |
| `app/Http/Resources/` | PascalCase, singular by feature | `Order/OrderResource.php` |
| `app/Policies/` | PascalCase, singular | `OrderPolicy.php` |
| `app/Observers/` | PascalCase, singular | `OrderObserver.php` |
| `app/Events/` | PascalCase, singular | `OrderCreated.php` |
| `app/Listeners/` | PascalCase, singular | `SendOrderConfirmation.php` |
| `app/Notifications/` | PascalCase, singular | `OrderReadyNotification.php` |
| `database/migrations/` | snake_case, timestamped | `2026_07_23_000001_create_orders_table.php` |
| `database/factories/` | PascalCase, singular | `OrderFactory.php` |
| `database/seeders/` | PascalCase, singular | `OrderSeeder.php` |
| `routes/api/` | snake_case, plural | `orders.php`, `menu.php` |

### Full Feature Directory Structure

```
app/
├── Http/
│   ├── Controllers/
│   │   └── Api/
│   │       └── V1/
│   │           └── Order/
│   │               └── OrderController.php
│   ├── Requests/
│   │   └── Order/
│   │       ├── StoreOrderRequest.php
│   │       └── UpdateOrderRequest.php
│   └── Resources/
│       └── Order/
│           ├── OrderResource.php
│           └── OrderItemResource.php
├── Models/
│   ├── Order.php
│   └── OrderItem.php
├── Repositories/
│   └── Order/
│       └── OrderRepository.php
├── Services/
│   └── Order/
│       └── OrderService.php
├── Policies/
│   └── OrderPolicy.php
├── Observers/
│   └── OrderObserver.php
├── Events/
│   ├── OrderCreated.php
│   └── OrderStatusChanged.php
└── Listeners/
    ├── SendOrderNotification.php
    └── DeductInventory.php
```

---

## 12. Integration with Other Modules

### API Prefix Convention

All Restaurant module APIs use the prefix `/api/v1/` with module-specific routes.

When other modules need Restaurant data, they call:
```
GET /api/v1/orders?outlet_id={outlet_id}&status=completed
```

### Shared Data Format

| Field | Format | Example |
|-------|--------|---------|
| IDs | UUID v4 | `550e8400-e29b-41d4-a716-446655440000` |
| Dates | ISO 8601 | `2026-07-23T10:30:00Z` |
| Currency | ISO 4217 | `PHP` |
| Amounts | Decimal(12,2) | `1250.50` |
| Statuses | snake_case | `in_progress`, `needs_cleaning` |

### Response Format

ALL endpoints MUST return:

```json
{
    "success": true,
    "message": "Human readable message",
    "data": {}
}
```

Error responses:

```json
{
    "success": false,
    "message": "Human readable error message",
    "errors": {}
}
```

---

## 13. Forbidden Practices

Never do the following:

| Forbidden | Correct |
|-----------|---------|
| Business logic in controllers | Use Service classes |
| Database queries in controllers | Use Repository classes |
| Raw models in responses | Use API Resources |
| Inline validation in controllers | Use Form Requests |
| Hardcoded values | Use config/env |
| `SELECT *` | Select specific columns |
| N+1 queries | Use `with()` eager loading |
| `dd()` or `dump()` in production code | Use logging |
| `var_dump()` anywhere | Use logging |
| Comments explaining "what" | Write self-documenting code |
| More than 3 levels of nesting | Extract to methods |
| God classes (>300 lines) | Split into focused classes |
| `array_push()` | Use `[]=` syntax |
| `!empty()` for validation | Use Laravel validation rules |

---

## 14. Quality Checklist

Before submitting code, verify:

- [ ] Code follows PSR-12 standard
- [ ] All classes have `declare(strict_types=1)`
- [ ] Models are singular, tables are plural with `rms_` prefix
- [ ] Controllers use resource methods only
- [ ] All validation is in Form Requests
- [ ] All business logic is in Service classes
- [ ] All database queries are in Repository classes
- [ ] All responses use API Resources
- [ ] All responses follow the standard format
- [ ] No hardcoded values (use config/env)
- [ ] No N+1 queries (use eager loading)
- [ ] Soft deletes used instead of hard deletes
- [ ] UUIDs used for all primary keys
- [ ] Audit logging enabled for all models
- [ ] Meaningful commit messages following Conventional Commits

---

*End of Backend Coding Standards*
