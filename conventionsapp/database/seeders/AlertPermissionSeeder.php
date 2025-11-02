<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;
use Spatie\Permission\Models\Role;

class AlertPermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        // Reset cached roles and permissions
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        $guardName = 'sanctum'; // Ensure this matches your API guard

        // Define the new, alert-specific permissions for all relevant modules
        $alertPermissions = [
            // Core Modules
            'receive convention alerts',
            'receive partenaire alerts',
            'receive programme alerts',
            'receive domaine alerts', // For Axes Stratégiques
            'receive projet alerts',
            'receive sousprojet alerts',

            // Marchés & Contrats
            'receive appeloffre alerts',
            'receive marche alerts',
            'receive bon_commande alerts',
            'receive contrat_droit_commun alerts',
            'receive ordres_service alerts',

            // Financial Modules
            'receive versement_cp alerts', // Versements (Conv.)
            'receive versement_pp alerts', // Versements (Proj.)
            'receive engagement alerts',

            // Other Modules
            'receive avenant alerts',
            'receive observation alerts',
            
            // Note: We don't typically create alerts for static data like communes, provinces, secteurs, or admin functions like users/roles.
        ];
        
        $this->command->info('Creating/Verifying all alert-specific permissions...');
        foreach ($alertPermissions as $permissionName) {
            // Use updateOrCreate to prevent duplicates
            Permission::updateOrCreate(
                ['name' => $permissionName, 'guard_name' => $guardName],
                ['name' => $permissionName, 'guard_name' => $guardName]
            );
        }
        $this->command->info('All alert-specific permissions were created successfully.');

        // --- Automatically assign these new permissions to the Admin role ---
        $this->command->info("Assigning new alert permissions to the 'Admin' role...");
        try {
            $adminRole = Role::where('name', 'Admin')->where('guard_name', $guardName)->first();

            if ($adminRole) {
                // This will add the permissions without removing existing ones
                $adminRole->givePermissionTo($alertPermissions);
                $this->command->info("Successfully assigned " . count($alertPermissions) . " alert permissions to the 'Admin' role.");
            } else {
                $this->command->warn("Role 'Admin' not found. Please run RolesAndPermissionsSeeder first or assign permissions manually.");
            }
        } catch (\Exception $e) {
            $this->command->error("Could not assign alert permissions to Admin role. Error: " . $e->getMessage());
        }
        
        // Clear cache again for immediate effect
        app()[PermissionRegistrar::class]->forgetCachedPermissions();
    }
}