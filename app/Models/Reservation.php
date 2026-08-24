<?php

declare(strict_types=1);

namespace App\Models;

class Reservation extends BaseModel
{
    protected $fillable = [
        'customer_id', 'table_id', 'reservation_number', 'guest_name',
        'guest_phone', 'guest_email', 'party_size', 'reservation_date',
        'reservation_time', 'status', 'source', 'special_requests',
        'cancellation_reason',
    ];

    protected function casts(): array
    {
        return [
            'party_size' => 'integer',
            'reservation_date' => 'datetime',
        ];
    }

    public function getTable(): string
    {
        return 'reservations';
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function table()
    {
        return $this->belongsTo(Table::class);
    }
}
