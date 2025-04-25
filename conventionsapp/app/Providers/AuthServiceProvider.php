<?php

namespace App\Providers;

// Add these imports:
use App\Models\User; // <-- Import your User model
use Illuminate\Support\Facades\Gate;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;

class AuthServiceProvider extends ServiceProvider
{
    /**
     * The model to policy mappings for the application.
     *
     * @var array<class-string, class-string>
     */
    protected $policies = [
        // 'App\Models\Model' => 'App\Policies\ModelPolicy',
        // Example: If you create policies later for specific models:
        // 'App\Models\Convention' => 'App\Policies\ConventionPolicy',
        // 'App\Models\Partenaire' => 'App\Policies\PartenairePolicy',
    ];

    /**
     * Register any authentication / authorization services.
     */
    // AuthServiceProvider.php - boot() method
public function boot(): void
{
    \Illuminate\Support\Facades\Log::debug('AuthServiceProvider boot() method is running.'); // <-- Log 1

    $this->registerPolicies();

    Gate::before(function (User $user, $ability) {
        // --- ADD LOGGING ---
        \Illuminate\Support\Facades\Log::debug("Gate::before check running - User ID: {$user->idutilisateur}, Checking Ability: '{$ability}'"); // <-- Log 2
        // Load roles eagerly if potentially not loaded yet when Gate runs
        $user->loadMissing('roles');
        $isAdminCheck = $user->hasRole('Admin', 'sanctum'); // Perform the check
        \Illuminate\Support\Facades\Log::debug("Gate::before - User roles loaded: " . json_encode($user->roles->pluck('name', 'id'))); // <-- Log 3 (See loaded roles)
        \Illuminate\Support\Facades\Log::debug("Gate::before - hasRole('Admin', 'sanctum') result: " . ($isAdminCheck ? 'TRUE' : 'FALSE')); // <-- Log 4 (The crucial check result)
        // --- END LOGGING ---

        return $isAdminCheck ? true : null;
    });
}
}