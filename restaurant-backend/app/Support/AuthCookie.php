<?php

declare(strict_types=1);

namespace App\Support;

use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Cookie;

class AuthCookie
{
    public static function isSecure(): bool
    {
        $sessionSecure = config('session.secure');
        if ($sessionSecure !== null && $sessionSecure !== '') {
            return filter_var($sessionSecure, FILTER_VALIDATE_BOOLEAN);
        }
        return app()->isProduction();
    }

    public static function make(string $token, int $minutes): Cookie
    {
        return cookie('auth_token', $token, $minutes, '/', null, self::isSecure(), true, false, 'Lax');
    }

    public static function forget(): Cookie
    {
        return cookie('auth_token', '', -3600, '/', null, self::isSecure(), true, false, 'Lax');
    }

    public static function roleCookie(string $role, int $maxAge = 604800): Cookie
    {
        return cookie('rms_role', $role, $maxAge / 60, '/', null, self::isSecure(), false, false, 'Lax');
    }

    public static function forgetRole(): Cookie
    {
        return cookie('rms_role', '', -3600, '/', null, self::isSecure(), false, false, 'Lax');
    }
}
