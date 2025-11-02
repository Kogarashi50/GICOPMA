<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Support\Facades\Cache;

class CacheApiResponse
{
    public function handle($request, Closure $next)
    {
        // Only cache GET requests (safe)
        if ($request->method() !== 'GET') {
            return $next($request);
        }

        // Make a unique cache key from URL + query
        $key = 'api_cache:' . md5($request->fullUrl());

        // If cached → return cached response
        if (Cache::has($key)) {
            return response(Cache::get($key))
                ->header('X-Cache', 'HIT');
        }

        // Otherwise process and store response
        $response = $next($request);

        // Cache only successful JSON responses
        if ($response->status() === 200) {
            Cache::put($key, $response->getContent(), 300); // cache for 5 mins
        }

        return $response->header('X-Cache', 'MISS');
    }
}