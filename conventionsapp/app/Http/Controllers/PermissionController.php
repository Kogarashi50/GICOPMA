<?php

namespace App\Http\Controllers;
use Illuminate\Support\Facades\Log;

use Illuminate\Http\Request;
use Spatie\Permission\Models\Permission;

class PermissionController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        try {
            // Fetch all permissions for the relevant guard
            $guardName = 'sanctum'; // Or get from config
            $permissions = Permission::where('guard_name', $guardName)
                                    ->orderBy('name')
                                    ->select('id', 'name') // Select needed fields
                                    ->get();

            // --- Group Permissions by Resource (for frontend display) ---
            $groupedPermissions = [];
            foreach ($permissions as $permission) {
                // Extract resource name (e.g., "conventions" from "view conventions")
                // This is a basic split, might need refinement based on your naming
                $parts = explode(' ', $permission->name, 2);
                $action = $parts[0];
                $resource = count($parts) > 1 ? ucfirst(str_replace('_', ' ', $parts[1])) : 'Administration'; // Group single words like 'dashboard' or 'manage_users'

                 // Handle multi-word resources like 'convention details' or 'bon commande'
                 if (str_contains($permission->name, 'convention details')) $resource = 'Conventions';
                 else if (str_contains($permission->name, 'partenaire details')) $resource = 'Partenaires';
                 else if (str_contains($permission->name, 'bon_commande')) $resource = 'Bon de Commande';
                 else if (str_contains($permission->name, 'contrat_droit_commun')) $resource = 'Contrat Droit Commun';
                 else if (str_contains($permission->name, 'dashboard')) $resource = 'Dashboard';
                 else if (str_contains($permission->name, 'fichiers')) $resource = 'Fichiers';
                 else if (str_contains($permission->name, 'users')) $resource = 'Utilisateurs';
                 else if (str_contains($permission->name, 'roles')) $resource = 'Rôles';
                 // Add more specific groupings if needed

                if (!isset($groupedPermissions[$resource])) {
                    $groupedPermissions[$resource] = [];
                }
                // Store the full permission object or just the name/id
                $groupedPermissions[$resource][] = ['id' => $permission->id, 'name' => $permission->name];
            }
            // Sort groups alphabetically by resource name
             ksort($groupedPermissions);

            return response()->json(['permissionsGrouped' => $groupedPermissions]);

        } catch (\Exception $e) {
            Log::error("Error fetching permissions list: " . $e->getMessage());
            return response()->json(['message' => 'Erreur lors de la récupération des permissions.'], 500);
        }
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        //
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        //
    }
}
