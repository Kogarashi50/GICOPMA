<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;
class PermissionsSeeder extends Seeder
{
 
    public function run()
    {
        app()[PermissionRegistrar::class]->forgetCachedPermissions(); // Clear cache before seeding
        $guard = 'web'; // Use 'web' guard, as Sanctum token auth typically authenticates against the 'web' guard's provider

        // Define ALL permissions needed
        Permission::firstOrCreate(['name' => 'list_conventions', 'guard_name' => $guard]);
        Permission::firstOrCreate(['name' => 'view_convention', 'guard_name' => $guard]);
        Permission::firstOrCreate(['name' => 'create_conventions', 'guard_name' => $guard]);
        Permission::firstOrCreate(['name' => 'update_conventions', 'guard_name' => $guard]);
        Permission::firstOrCreate(['name' => 'delete_conventions', 'guard_name' => $guard]);

        Permission::firstOrCreate(['name' => 'list_partenaires', 'guard_name' => $guard]);
        Permission::firstOrCreate(['name' => 'create_partenaires', 'guard_name' => $guard]);
        Permission::firstOrCreate(['name' => 'view_partenaire', 'guard_name' => $guard]);
        Permission::firstOrCreate(['name' => 'update_partenaires', 'guard_name' => $guard]);
        Permission::firstOrCreate(['name' => 'delete_partenaires', 'guard_name' => $guard]);

        // Add permissions for ALL other resources mentioned in your api.php routes
        Permission::firstOrCreate(['name' => 'manage_chantiers', 'guard_name' => $guard]);
        Permission::firstOrCreate(['name' => 'manage_programmes', 'guard_name' => $guard]);
        // ... etc ...
        Permission::firstOrCreate(['name' => 'view_dashboard', 'guard_name' => $guard]);
        Permission::firstOrCreate(['name' => 'view_documents', 'guard_name' => $guard]);

        // Add user management permissions if using permission middleware for users
        // Permission::firstOrCreate(['name' => 'list_users', 'guard_name' => $guard]);
        // Permission::firstOrCreate(['name' => 'create_users', 'guard_name' => $guard]);
        // Permission::firstOrCreate(['name' => 'view_users', 'guard_name' => $guard]);
        // Permission::firstOrCreate(['name' => 'update_users', 'guard_name' => $guard]);
        // Permission::firstOrCreate(['name' => 'delete_users', 'guard_name' => $guard]);

}
}