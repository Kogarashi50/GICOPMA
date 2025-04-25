<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

// --- Correct Import for Role & Permission Models ---
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
// --- CORRECT Import for PermissionRegistrar ---
use Spatie\Permission\PermissionRegistrar; 
class RolesSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        app()[PermissionRegistrar::class]->forgetCachedPermissions();
        $guard = 'web'; // Match guard name used in PermissionsSeeder

        // Create roles BY NAME
        $roleAdmin = Role::firstOrCreate(['name' => 'Admin', 'guard_name' => $guard]);
        $roleEditor = Role::firstOrCreate(['name' => 'Editor', 'guard_name' => $guard]);
        $roleViewer = Role::firstOrCreate(['name' => 'Viewer', 'guard_name' => $guard]);

        // Assign permissions to roles (Ensure permissions exist first!)
        // Example assignments - ADJUST THESE TO YOUR NEEDS
        $roleAdmin->syncPermissions(Permission::where('guard_name', $guard)->pluck('name')->toArray()); // Give Admin all permissions

        $roleEditor->syncPermissions([
            'list_conventions', 'view_convention', 'create_conventions', 'update_conventions',
            'list_partenaires', 'view_partenaire', 'create_partenaires', 'update_partenaires',
            'view_dashboard', 'view_documents',
            // Add other specific permissions for Editor
        ]);

        $roleViewer->syncPermissions([
            'list_conventions', 'view_convention',
            'list_partenaires', 'view_partenaire',
            'view_dashboard', 'view_documents',
             // Add other view-only permissions
        ]);}
}
