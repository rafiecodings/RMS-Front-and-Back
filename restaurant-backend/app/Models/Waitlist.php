<?php

declare(strict_types=1);

namespace App\Models;

class Waitlist extends BaseModel
{
    protected $fillable = ['guest_name', 'guest_phone', 'party_size', 'status', 'notes'];

    protected function casts(): array
    {
        return ['party_size' => 'integer'];
    }

    public function getTable(): string
    {
        return 'waitlist';
    }
}
