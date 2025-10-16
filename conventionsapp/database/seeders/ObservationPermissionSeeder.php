<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;

class ObservationPermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        // Reset cached roles and permissions to ensure they are fresh
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        // Define the permissions for the "Observations" module
        $permissions = [
            'view observations',
            'create observations',
            'update observations',
            'delete observations',
        ];

        // Create the permissions
        foreach ($permissions as $permissionName) {
            // Use updateOrCreate to prevent duplicates if the seeder is run multiple times.
            // This version does NOT include the 'group_name' column, which fixes the error.
            Permission::updateOrCreate(
                [
                    'name' => $permissionName,
                    'guard_name' => 'sanctum' // Ensure this matches your API guard
                ]
            );
        }

        $this->command->info('Observations permissions were created successfully.');
    }
}