<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

/**
 * Clamps pagination query parameters to safe ranges BEFORE controllers run.
 *
 * Without this, values like ?page=-1&per_page=99999 reach Laravel's paginator
 * and database LIMIT clauses: negative values cause SQL syntax errors (500 on
 * SQLite/PostgreSQL), and uncapped per_page allows full-table dumps.
 */
class SanitizePagination
{
    public function handle(Request $request, Closure $next)
    {
        if ($request->has('per_page')) {
            $perPage = (int) $request->query('per_page');
            $request->merge(['per_page' => min(100, max(1, $perPage))]);
        }

        if ($request->has('page')) {
            $page = (int) $request->query('page');
            if ($page < 1) {
                $request->merge(['page' => 1]);
            }
        }

        return $next($request);
    }
}
