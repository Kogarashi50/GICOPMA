<?php

namespace App\Http;

// --- Keep necessary imports ---
use Illuminate\Foundation\Http\Kernel as HttpKernel;

class Kernel extends HttpKernel
{
    /**
     * The application's global HTTP middleware stack.
     * Run during every request. Keep this minimal.
     *
     * @var array<int, class-string|string>
     */
    protected $middleware = [
        // TrustProxies should usually be first if behind a load balancer/proxy
        \App\Http\Middleware\TrustProxies::class,

        // CORS handling is often global
         \Fruitcake\Cors\HandleCors::class, // Or \Illuminate\Http\Middleware\HandleCors::class in L11+

        // Standard Laravel global middleware
        \App\Http\Middleware\PreventRequestsDuringMaintenance::class,
        \Illuminate\Foundation\Http\Middleware\ValidatePostSize::class,
        // \App\Http\Middleware\TrimStrings::class,
        // \Illuminate\Foundation\Http\Middleware\ConvertEmptyStringsToNull::class,
    ];

    /**
     * The application's route middleware groups.
     *
     * @var array<string, array<int, class-string|string>>
     */
    protected $middlewareGroups = [
        'web' => [
            // Standard Web middleware (Stateful: sessions, cookies, CSRF)
            \App\Http\Middleware\EncryptCookies::class,
            \Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse::class,
            \Illuminate\Session\Middleware\StartSession::class,
            // \Illuminate\Session\Middleware\AuthenticateSession::class, // Often used with sessions, include if needed
            \Illuminate\View\Middleware\ShareErrorsFromSession::class,
            \App\Http\Middleware\VerifyCsrfToken::class,
            \Illuminate\Routing\Middleware\SubstituteBindings::class,
            // --- DO NOT include generic 'auth' or custom 'IsAdmin' here ---
            // Apply auth middleware directly to routes/controllers in web.php that need it
        ],

        'api' => [
            // Standard API middleware (Stateless: throttling, bindings)
            // FOR TOKEN AUTH: Ensure NO session, cookie, CSRF, or EnsureFrontendRequestsAreStateful middleware here
            \Illuminate\Routing\Middleware\ThrottleRequests::class . ':api', // Use correct alias 'api' for throttling
            \Illuminate\Routing\Middleware\SubstituteBindings::class,
            \App\Http\Middleware\CacheApiResponse::class,
        ],
    ];

    /**
     * The application's middleware aliases.
     * Aliases may be assigned to groups or used individually.
     *
     * @var array<string, class-string|string>
     */
    protected $routeMiddleware = [
        // Default Auth middleware (used by auth:sanctum etc.)
        'auth' => \App\Http\Middleware\Authenticate::class,

        // Standard Laravel Aliases
        'auth.basic' => \Illuminate\Auth\Middleware\AuthenticateWithBasicAuth::class,
        'cache.headers' => \Illuminate\Http\Middleware\SetCacheHeaders::class,
        'can' => \Illuminate\Auth\Middleware\Authorize::class, // Maps to Gate/Policies
        'guest' => \App\Http\Middleware\RedirectIfAuthenticated::class,
        'password.confirm' => \Illuminate\Auth\Middleware\RequirePassword::class,
        'signed' => \Illuminate\Routing\Middleware\ValidateSignature::class,
        'throttle' => \Illuminate\Routing\Middleware\ThrottleRequests::class,
        'verified' => \Illuminate\Auth\Middleware\EnsureEmailIsVerified::class,

        // Spatie Permission Aliases (Auto-discovery SHOULD handle this, but explicitly listing doesn't hurt)
        'role' => \Spatie\Permission\Middleware\RoleMiddleware::class,
        'permission' => \Spatie\Permission\Middleware\PermissionMiddleware::class,
        'role_or_permission' => \Spatie\Permission\Middleware\RoleOrPermissionMiddleware::class,

        // --- REMOVE your custom IsAdmin alias ---
        // 'IsAdmin' => \App\Http\Middleware\IsAdmin::class,
    ];
}