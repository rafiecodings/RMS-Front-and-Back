<?php

if (!function_exists('format_currency')) {
    function format_currency(float $amount, string $currency = 'PHP'): string
    {
        return $currency . ' ' . number_format($amount, 2);
    }
}

if (!function_exists('generate_reference_number')) {
    function generate_reference_number(string $prefix = 'RMS'): string
    {
        return $prefix . '-' . strtoupper(uniqid());
    }
}

if (!function_exists('calculate_vat')) {
    function calculate_vat(float $amount, float $rate = 0.12): array
    {
        $vat = $amount * $rate;
        $total = $amount + $vat;

        return [
            'subtotal' => $amount,
            'vat_rate' => $rate,
            'vat_amount' => round($vat, 2),
            'total' => round($total, 2),
        ];
    }
}

if (!function_exists('calculate_discount')) {
    function calculate_discount(float $amount, float $discountValue, string $type = 'percentage'): float
    {
        if ($type === 'percentage') {
            return round($amount * ($discountValue / 100), 2);
        }
        return min($discountValue, $amount);
    }
}

if (!function_exists('generate_kot_number')) {
    function generate_kot_number(): string
    {
        return 'KOT-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -6));
    }
}

if (!function_exists('generate_invoice_number')) {
    function generate_invoice_number(): string
    {
        return 'INV-' . \Illuminate\Support\Str::uuid();
    }
}
