<?php

namespace App\Providers;

use Illuminate\Support\Facades\Route; // <-- Make sure this is imported
use Illuminate\Support\ServiceProvider;
// Add other necessary imports
use Illuminate\Routing\Router;
use Spatie\Permission\Middleware\PermissionMiddleware;
use Spatie\Permission\Middleware\RoleMiddleware;
use Spatie\Permission\Middleware\RoleOrPermissionMiddleware;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // ... registration logic
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(Router $router): void
    {
        $router->aliasMiddleware('role', RoleMiddleware::class);
        $router->aliasMiddleware('permission', PermissionMiddleware::class); // <<<< Force registration
        $router->aliasMiddleware('role_or_permission', RoleOrPermissionMiddleware::class);
        // --- End Manual Registration ---


        // --- Load Routes (Keep this) ---
        Route::middleware('api')
             ->prefix('api')
             ->group(base_path('routes/api.php'));

        Route::middleware('web')
             ->group(base_path('routes/web.php'));


    }
}