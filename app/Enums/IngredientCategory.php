<?php

declare(strict_types=1);

namespace App\Enums;

enum IngredientCategory: string
{
    case Meat = 'Meat';
    case Seafood = 'Seafood';
    case Vegetables = 'Vegetables';
    case Fruits = 'Fruits';
    case DairyAndEggs = 'Dairy & Eggs';
    case Grains = 'Grains';
    case SpicesAndHerbs = 'Spices & Herbs';
    case Condiments = 'Condiments';
    case Pantry = 'Pantry';
    case Beverages = 'Beverages';
    case Other = 'Other';

    public static function values(): array
    {
        return array_map(fn(self $case) => $case->value, self::cases());
    }

    public static function labels(): array
    {
        return [
            self::Meat->value => 'Meat',
            self::Seafood->value => 'Seafood',
            self::Vegetables->value => 'Vegetables',
            self::Fruits->value => 'Fruits',
            self::DairyAndEggs->value => 'Dairy & Eggs',
            self::Grains->value => 'Grains',
            self::SpicesAndHerbs->value => 'Spices & Herbs',
            self::Condiments->value => 'Condiments',
            self::Pantry->value => 'Pantry',
            self::Beverages->value => 'Beverages',
            self::Other->value => 'Other',
        ];
    }

    public static function tryFromNormalized(string $value): ?self
    {
        $normalized = trim($value);
        foreach (self::cases() as $case) {
            if (strcasecmp($case->value, $normalized) === 0) {
                return $case;
            }
        }
        return null;
    }
}