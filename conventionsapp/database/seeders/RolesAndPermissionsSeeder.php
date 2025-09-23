<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;
use Illuminate\Support\Facades\Log;
use Exception;

class RolesAndPermissionsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $guardName = 'sanctum'; // Ensure this matches your config/auth.php API guard

        // Reset cached roles and permissions
        app()[PermissionRegistrar::class]->forgetCachedPermissions();
        $this->command->info('Permission cache cleared.');

        // --- Define Permissions (Removed 'view details' permissions) ---
        $permissions = [
            // Dashboard
            'view dashboard',
            // Conventions
            'view conventions', 'create conventions', 'update conventions', 'delete conventions', // 'view convention details' REMOVED
            // Partenaires
            'view partenaires', 'create partenaires', 'update partenaires', 'delete partenaires', // 'view partenaire details' REMOVED
            'view partenaire summary',
            // Chantiers
            'view chantiers', 'create chantiers', 'update chantiers', 'delete chantiers',
            // Programmes
            'view programmes', 'create programmes', 'update programmes', 'delete programmes',
            // Domaines
            'view domaines', 'create domaines', 'update domaines', 'delete domaines',
            // Projets
            'view projets', 'create projets', 'update projets', 'delete projets',
            // SousProjets
            'view sousprojets', 'create sousprojets', 'update sousprojets', 'delete sousprojets',
             // Communes
            'view communes', 'create communes', 'update communes', 'delete communes',
             // Marches (General)
            'view marches', 'create marches', 'update marches', 'delete marches',
            'download fichiers',
             // Provinces
            'view provinces', 'create provinces', 'update provinces', 'delete provinces',
             // Engagements (Keep existing ones for EngagementController if still used)
            'view engagements', 'create engagements', 'update engagements', 'delete engagements',
             // Bon de Commande
            'view bon_commande', 'create bon_commande', 'update bon_commande', 'delete bon_commande',
             // Contrat Droit Commun
            'view contrat_droit_commun', 'create contrat_droit_commun', 'update contrat_droit_commun', 'delete contrat_droit_commun',
            // Avenants
            'view avenants', 'create avenants', 'update avenants', 'delete avenants',
            // Versements CP (Keep existing for VersementCPController if still used)
            'view versements_cp', 'create versements_cp', 'update versements_cp', 'delete versements_cp',

            // --- Other Permissions ---
            // Ordres de Service
            'view ordres_service', 'create ordres_service', 'update ordres_service', 'delete ordres_service',
            // Engagements Financiers (If distinct from 'engagements')
            'view engagements_financiers', 'create engagements_financiers', 'update engagements_financiers', 'delete engagements_financiers',
            // Versements PP (If distinct from 'versements_cp')
            'view versements_pp', 'create versements_pp', 'update versements_pp', 'delete versements_pp',
            // Reporting
            'download report',

            // --- Permissions for AppelOffre (Removed 'view details') ---
            'view appeloffres',         // For index & show methods
            'create appeloffres',       // For store method
            'update appeloffres',       // For update method
            'delete appeloffres',       // For destroy method
            // 'view appeloffre details',  // REMOVED
            // --------------------------------------

            // --- Admin Area Permissions ---
            'manage users', // Full CRUD for Users
            'manage roles', // Full CRUD for Roles/Permissions
            'view history',
        ];

        // --- Create Permissions ---
        $this->command->info('Creating/Verifying permissions...');
        foreach ($permissions as $permissionName) {
            try {
                 Permission::firstOrCreate(['name' => $permissionName, 'guard_name' => $guardName]);
            } catch (Exception $e) {
                $this->command->error("Error creating/verifying permission '$permissionName': " . $e->getMessage());
                 Log::error("Failed to ensure permission '{$permissionName}' for guard '{$guardName}'. Error: " . $e->getMessage());
            }
        }
        $this->command->info('Permissions created/verified.');


        // --- Define Roles (Removed 'Viewer') ---
        $this->command->info('Creating/Verifying Roles...');
        $adminRole = null;
        try {
            $adminRole = Role::firstOrCreate(['name' => 'Admin', 'guard_name' => $guardName]);
            // Consider adding other roles like 'Editor' if needed here
        } catch (Exception $e) {
             $this->command->error("Error creating/verifying roles: " . $e->getMessage());
             Log::error("Failed to create/verify roles. Error: " . $e->getMessage());
             return; // Stop seeding if roles can't be created
        }
        $this->command->info('Role created/verified (Admin).'); // Updated message


        // --- Assign Permissions to ADMIN Role ---
        $this->command->info('Assigning all permissions to Admin role...');
        try {
            // Fetch all permissions for the specified guard AFTER they have been created/verified
            $allPermissions = Permission::where('guard_name', $guardName)->pluck('name');
            if ($adminRole) {
                $adminRole->syncPermissions($allPermissions);
                $this->command->info('All permissions (' . $allPermissions->count() . ') synced to Admin role.');
            } else {
                $this->command->error("Role 'Admin' not found. Cannot assign permissions.");
                Log::error("Admin role object is null, cannot assign permissions.");
            }
        } catch (Exception $e) {
            $this->command->error("Error assigning permissions to Admin role: " . $e->getMessage());
            Log::error("Failed assigning permissions to Admin role. Error: " . $e->getMessage());
        }


        // --- VIEWER Role Assignment Block REMOVED ---


        // --- USER CREATION / ROLE ASSIGNMENT REMOVED ---
        $this->command->info('Skipping user creation/assignment in this seeder.');


        // --- Final Steps ---
        app()[PermissionRegistrar::class]->forgetCachedPermissions();
        $this->command->info('Permission cache cleared again for immediate effect.');
        $this->command->info('Roles and Permissions definition/assignment finished.');
        $this->command->warn('-----------------------------------------------------------');
        $this->command->warn("REMEMBER: Ensure Gate::before is setup in AuthServiceProvider if relying on it for Admin full access.");
        $this->command->warn("REMEMBER: Assign the 'Admin' role to your existing users manually or via the application UI/another seeder."); // Updated warning
        $this->command->warn('-----------------------------------------------------------');
    }
}