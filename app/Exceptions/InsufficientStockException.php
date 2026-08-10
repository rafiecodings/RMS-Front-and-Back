<?php

declare(strict_types=1);

namespace App\Exceptions;

use RuntimeException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

class InsufficientStockException extends RuntimeException implements HttpExceptionInterface
{
    public function __construct(
        private readonly array $insufficient,
        string $message = 'Insufficient stock for one or more ingredients.',
    ) {
        parent::__construct($message, 422);
    }

    public function getInsufficient(): array
    {
        return $this->insufficient;
    }

    public function getStatusCode(): int
    {
        return 422;
    }

    public function getHeaders(): array
    {
        return [];
    }
}
