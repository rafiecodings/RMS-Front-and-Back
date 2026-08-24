<?php

declare(strict_types=1);

namespace App\Services\Forecasting;

class InsufficientHistoryException extends \RuntimeException
{
    public function __construct(string $message = 'insufficient_history')
    {
        parent::__construct($message);
    }
}
