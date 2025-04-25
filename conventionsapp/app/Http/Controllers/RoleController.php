<?php

namespace App\Http\Controllers;

// --- Core Imports ---
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse; // Added for return type hinting
use Illuminate\Support\Facades\DB;     // For transactions
use Illuminate\Support\Facades\Log;     // For logging
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Database\QueryException;
use Exception;                        // General exceptions

// --- Spatie Imports ---
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar; // For cache reset

class RoleController extends Controller
{
    /**
     * Define the guard name used for permissions.
     * Ensure this matches config/auth.php 'api' guard if using API routes.
     */
    private string $guardName = 'sanctum'; // Or 'web' if using web routes

    /**
     * Display a listing of the roles (primarily for dropdowns).
     * GET /api/roles
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function index(): JsonResponse
    {
        // Authorization handled by route middleware
        Log::info("Fetching roles list for dropdowns.");
        try {
            // Select only necessary fields and order
            $roles = Role::select(['id', 'name', 'created_at'])
                         ->where('guard_name', $this->guardName) // Ensure correct guard
                         ->orderBy('name', 'asc')
                         ->get();

            // Key name 'roles' matches frontend expectations in some examples
            return response()->json(['roles' => $roles]);

        } catch (Exception $e) {
            Log::error("Error fetching roles list: " . $e->getMessage());
            return response()->json(['message' => 'Erreur lors de la récupération des rôles.'], 500);
        }
    }

    /**
     * Store a newly created role in storage.
     * POST /api/roles
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function store(Request $request): JsonResponse
    {
        // Authorization handled by route middleware
        Log::info("Attempting to store new role...");
        Log::debug("Raw request data (store role):", $request->all());

        try {
            // 1. Validate Input
            $validatedData = $request->validate([
                'name' => [
                    'required', 'string', 'max:255',
                    Rule::unique('roles', 'name')->where('guard_name', $this->guardName)
                ],
                'permissions' => 'present|array', // Ensure key exists, can be empty
                'permissions.*' => ['string', Rule::exists('permissions', 'name')->where('guard_name', $this->guardName)]
            ], [
                 // Custom French Messages
                 'name.required' => 'Le nom du rôle est obligatoire.',
                 'name.unique' => 'Ce nom de rôle existe déjà.',
                 'permissions.present' => 'La liste des permissions (même vide) doit être fournie.',
                 'permissions.*.exists' => 'Une ou plusieurs permissions sélectionnées sont invalides.',
            ]);
            Log::info('Validation successful (store role).');

            // 2. Create Role and Assign Permissions within Transaction
            $role = null;
            DB::beginTransaction();
            Log::info('DB Transaction started (store role).');

            try {
                $role = Role::create([
                    'name' => $validatedData['name'],
                    'guard_name' => $this->guardName
                ]);
                Log::info("Role created: ID {$role->id}, Name: {$role->name}");

                // Assign permissions if provided
                if (!empty($validatedData['permissions'])) {
                    // Filter out any potential empty strings just in case
                    $permissionsToSync = array_filter($validatedData['permissions']);
                    if (!empty($permissionsToSync)) {
                        $role->syncPermissions($permissionsToSync);
                        Log::info("Synced " . count($permissionsToSync) . " permissions to role ID {$role->id}.");
                    } else {
                         Log::info("No valid permissions provided to sync for role ID {$role->id}.");
                    }
                } else {
                     Log::info("No permissions provided to sync for role ID {$role->id}.");
                }

                DB::commit();
                Log::info('DB Transaction committed (store role).');

                // Reset permission cache after changes
                app()[PermissionRegistrar::class]->forgetCachedPermissions();

            } catch (Exception $dbException) {
                 DB::rollBack();
                 Log::error('DB ERROR during role creation/permission sync:', ['message' => $dbException->getMessage()]);
                 throw $dbException; // Re-throw to be caught by outer catch
            }

            // 3. Return Success Response
            $role->load('permissions:id,name'); // Load permissions for the response
            return response()->json([
                'message' => 'Rôle créé avec succès!',
                'role' => $role
            ], 201); // 201 Created status code

        // --- Catch Blocks ---
        } catch (ValidationException $e) {
            Log::error('Validation failed (store role):', ['errors' => $e->errors()]);
            return response()->json(['message' => 'Données invalides.', 'errors' => $e->errors()], 422);
        } catch (Exception $e) {
             Log::error('GENERAL ERROR (store role):', ['message' => $e->getMessage()]);
             return response()->json([
                 "message" => "Échec de la création du rôle.",
                 "error_details" => $e->getMessage() // Provide details for debugging
                ], 500);
        }
    }

    /**
     * Display the specified role with its permissions.
     * GET /api/roles/{role}
     *
     * @param  \Spatie\Permission\Models\Role $role (Route Model Binding)
     * @return \Illuminate\Http\JsonResponse
     */
    public function show(Role $role): JsonResponse
    {
        // Authorization handled by route middleware
        Log::info("Fetching details for role ID: {$role->id}");

        // Ensure the role belongs to the correct guard if necessary (though route model binding might handle this)
        if ($role->guard_name !== $this->guardName) {
             Log::warning("Attempted to access role ID {$role->id} with incorrect guard.");
             // Depending on policy, might throw AuthorizationException or just return 404/403
             return response()->json(['message' => 'Rôle non trouvé ou accès non autorisé.'], 404);
        }

        try {
            // Eager load permissions, selecting only necessary fields
            $role->load('permissions:id,name');
            Log::info("Successfully loaded role ID {$role->id} with " . $role->permissions->count() . " permissions.");
            return response()->json(['role' => $role]);
        } catch (Exception $e) {
             Log::error("Error fetching role details (ID: {$role->id}): " . $e->getMessage());
             return response()->json(['message' => 'Erreur lors de la récupération du rôle.'], 500);
        }
    }

    /**
     * Update the specified role in storage.
     * PUT /api/roles/{role}
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Spatie\Permission\Models\Role $role (Route Model Binding)
     * @return \Illuminate\Http\JsonResponse
     */
    public function update(Request $request, Role $role): JsonResponse
    {
        // Authorization handled by route middleware
        Log::info("Attempting to update role ID: {$role->id}...");
        Log::debug("Raw request data (update role):", $request->all());

        // Ensure the role belongs to the correct guard
        if ($role->guard_name !== $this->guardName) {
             Log::warning("Attempted to update role ID {$role->id} with incorrect guard.");
             return response()->json(['message' => 'Rôle non trouvé ou accès non autorisé.'], 404);
        }

        // Optional: Prevent editing the 'Admin' role name or permissions (add stricter checks if needed)
        if ($role->name === 'Admin' && $request->input('name') !== 'Admin') {
            Log::warning("Attempt blocked to rename 'Admin' role.");
            return response()->json(['message' => 'Impossible de renommer le rôle Administrateur.'], 403);
        }

        try {
            // 1. Validate Input
            $validatedData = $request->validate([
                'name' => [
                    'required', 'string', 'max:255',
                    Rule::unique('roles', 'name')->where('guard_name', $this->guardName)->ignore($role->id)
                ],
                'permissions' => 'present|array',
                'permissions.*' => ['string', Rule::exists('permissions', 'name')->where('guard_name', $this->guardName)]
            ], [ /* Custom French Messages */
                 'name.required' => 'Le nom du rôle est obligatoire.',
                 'name.unique' => 'Ce nom de rôle existe déjà.',
                 'permissions.present' => 'La liste des permissions (même vide) doit être fournie.',
                 'permissions.*.exists' => 'Une ou plusieurs permissions sélectionnées sont invalides.',
            ]);
            Log::info('Validation successful (update role).');

            // 2. Update Role and Sync Permissions within Transaction
            DB::beginTransaction();
            Log::info('DB Transaction started (update role).');
            try {
                // Update role name
                $role->update(['name' => $validatedData['name']]);
                Log::info("Role name updated for ID {$role->id}.");

                // Sync permissions
                // Filter out any potential empty strings just in case
                $permissionsToSync = array_filter($validatedData['permissions']);
                Log::debug("Validated permissions array received:", $validatedData['permissions'] ?? ['*** permissions key not found in validatedData ***']);

    // Log the array AFTER filtering (this is what gets passed)
    Log::debug("Permissions array being passed to syncPermissions:", $permissionsToSync);
                $role->syncPermissions($permissionsToSync);
                Log::info("Synced " . count($permissionsToSync) . " permissions for role ID {$role->id}.");


                DB::commit();
                Log::info('DB Transaction committed (update role).');

                // Reset permission cache after changes
                app()[PermissionRegistrar::class]->forgetCachedPermissions();

            } catch (Exception $dbException) {
                DB::rollBack();
                Log::error('DB ERROR during role update/permission sync:', ['id' => $role->id, 'message' => $dbException->getMessage()]);
                throw $dbException; // Re-throw
            }

            // 3. Return Success Response
            $role->load('permissions:id,name'); // Reload fresh permissions
            return response()->json([
                'message' => 'Rôle modifié avec succès!',
                'role' => $role
            ]);

        // --- Catch Blocks ---
        } catch (ValidationException $e) {
            Log::error('Validation failed (update role):', ['id' => $role->id, 'errors' => $e->errors()]);
            return response()->json(['message' => 'Données invalides.', 'errors' => $e->errors()], 422);
        } catch (Exception $e) {
            Log::error('GENERAL ERROR (update role):', ['id' => $role->id, 'message' => $e->getMessage()]);
             return response()->json([
                 "message" => "Échec de la modification du rôle.",
                 "error_details" => $e->getMessage()
                ], 500);
        }
    }

    /**
     * Remove the specified role from storage.
     * DELETE /api/roles/{role}
     *
     * @param  \Spatie\Permission\Models\Role $role (Route Model Binding)
     * @return \Illuminate\Http\JsonResponse
     */
    public function destroy(Role $role): JsonResponse
    {
        // Authorization handled by route middleware
        Log::info("Attempting to delete role ID: {$role->id}, Name: {$role->name}...");

        // Ensure the role belongs to the correct guard
        if ($role->guard_name !== $this->guardName) {
             Log::warning("Attempt blocked to delete role ID {$role->id} with incorrect guard.");
             return response()->json(['message' => 'Rôle non trouvé ou accès non autorisé.'], 404);
        }

        // Basic safety check: prevent deleting core roles
        if (in_array($role->name, ['Admin', 'Viewer'])) { // Add other protected roles if needed
            Log::warning("Attempt blocked to delete protected role: '{$role->name}'.");
            return response()->json(['message' => "Impossible de supprimer le rôle protégé '{$role->name}'."], 403); // Forbidden
        }

        DB::beginTransaction();
        Log::info('DB Transaction started (delete role).');
        try {
            // Permissions are detached automatically by the package/database relationship setup
            $role->delete();
            Log::info("Role deleted from database: ID {$role->id}");
            DB::commit();
            Log::info('DB Transaction committed (delete role).');

            // Reset permission cache after changes
            app()[PermissionRegistrar::class]->forgetCachedPermissions();

            return response()->json(['message' => 'Rôle supprimé avec succès.'], 200); // Or 204 No Content

        } catch (QueryException $qe) {
             DB::rollBack();
             // Check for foreign key constraint errors (users might still have this role)
             if ($qe->errorInfo[1] == 1451) { // MySQL FK violation code
                 Log::warning("Failed to delete role ID {$role->id} due to FK constraint (likely assigned to users).");
                 return response()->json(['message' => 'Impossible de supprimer le rôle car il est toujours assigné à des utilisateurs.'], 409); // Conflict
             }
             Log::error('DB ERROR during role delete:', ['id' => $role->id, 'message' => $qe->getMessage()]);
             return response()->json(['message' => 'Erreur base de données lors de la suppression du rôle.'], 500);
        } catch (Exception $e) {
            DB::rollBack();
            Log::error('GENERAL ERROR (delete role):', ['id' => $role->id, 'message' => $e->getMessage()]);
            return response()->json(['message' => 'Erreur lors de la suppression du rôle.'], 500);
        }
    }
}