<?php

namespace App\Http\Controllers;

// --- Core Imports ---
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

// --- Spatie Imports ---
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

// --- Model Imports for Alert Subscriptions ---
use App\Models\AlertSubscription;
use App\Models\AlertType;

class RoleController extends Controller
{
    /**
     * Define the guard name used for permissions.
     */
    private string $guardName = 'sanctum';

    /**
     * Display a listing of the roles.
     * GET /api/roles
     */
    public function index(): JsonResponse
    {
        Log::info("Fetching roles list.");
        try {
            $roles = Role::select(['id', 'name', 'created_at'])
                         ->where('guard_name', $this->guardName)
                         ->orderBy('name', 'asc')
                         ->get();

            return response()->json(['roles' => $roles]);
        } catch (Exception $e) {
            Log::error("Error fetching roles list: " . $e->getMessage());
            return response()->json(['message' => 'Erreur lors de la récupération des rôles.'], 500);
        }
    }

    /**
     * Store a newly created role in storage.
     * POST /api/roles
     */
    public function store(Request $request): JsonResponse
    {
        Log::info("Attempting to store new role with subscriptions...");
        Log::debug("Raw request data (store role):", $request->all());

        try {
            $validatedData = $request->validate([
                'name' => ['required', 'string', 'max:255', Rule::unique('roles', 'name')->where('guard_name', $this->guardName)],
                'permissions' => 'present|array',
                'permissions.*' => ['string', Rule::exists('permissions', 'name')->where('guard_name', $this->guardName)],
                'alert_type_ids' => 'present|array',
                'alert_type_ids.*' => ['integer', Rule::exists('alert_types', 'id')],
            ], [
                 'name.required' => 'Le nom du rôle est obligatoire.',
                 'name.unique' => 'Ce nom de rôle existe déjà.',
                 'permissions.present' => 'La liste des permissions (même vide) doit être fournie.',
                 'permissions.*.exists' => 'Une ou plusieurs permissions sélectionnées sont invalides.',
                 'alert_type_ids.present' => 'La liste des types d\'alerte (même vide) doit être fournie.',
                 'alert_type_ids.*.exists' => 'Un ou plusieurs types d\'alerte sélectionnés sont invalides.',
            ]);
            Log::info('Validation successful (store role).');

            $role = null;
            DB::beginTransaction();
            Log::info('DB Transaction started (store role).');

            try {
                $role = Role::create(['name' => $validatedData['name'], 'guard_name' => $this->guardName]);
                Log::info("Role created: ID {$role->id}, Name: {$role->name}");

                // Sync Permissions
                if (!empty($validatedData['permissions'])) {
                    $role->syncPermissions(array_filter($validatedData['permissions']));
                    Log::info("Synced " . count($validatedData['permissions']) . " permissions to role ID {$role->id}.");
                }

                // Sync Alert Subscriptions
                if (isset($validatedData['alert_type_ids'])) {
                    $subscriptions = [];
                    foreach ($validatedData['alert_type_ids'] as $alertTypeId) {
                        $subscriptions[] = ['role_id' => $role->id, 'alert_type_id' => $alertTypeId];
                    }
                    if (!empty($subscriptions)) {
                        AlertSubscription::insert($subscriptions);
                        Log::info("Synced " . count($subscriptions) . " alert subscriptions to role ID {$role->id}.");
                    }
                }

                DB::commit();
                Log::info('DB Transaction committed (store role).');

                app()[PermissionRegistrar::class]->forgetCachedPermissions();

            } catch (Exception $dbException) {
                 DB::rollBack();
                 Log::error('DB ERROR during role creation/sync:', ['message' => $dbException->getMessage()]);
                 throw $dbException; // Re-throw to be caught by outer catch
            }

            // Load all necessary data for the response
            $roleWithData = $this->getRoleWithData($role);

            return response()->json(['message' => 'Rôle créé avec succès!', 'role' => $roleWithData], 201);

        } catch (ValidationException $e) {
            Log::error('Validation failed (store role):', ['errors' => $e->errors()]);
            return response()->json(['message' => 'Données invalides.', 'errors' => $e->errors()], 422);
        } catch (Exception $e) {
             Log::error('GENERAL ERROR (store role):', ['message' => $e->getMessage()]);
             return response()->json(["message" => "Échec de la création du rôle.", "error_details" => $e->getMessage()], 500);
        }
    }

    /**
     * Display the specified role with its permissions and subscriptions.
     * GET /api/roles/{role}
     */
    public function show(Role $role): JsonResponse
    {
        Log::info("Fetching details for role ID: {$role->id}");
        if ($role->guard_name !== $this->guardName) {
             return response()->json(['message' => 'Rôle non trouvé.'], 404);
        }
        try {
            $roleWithData = $this->getRoleWithData($role);
            return response()->json(['role' => $roleWithData]);
        } catch (Exception $e) {
             Log::error("Error fetching role details (ID: {$role->id}): " . $e->getMessage());
             return response()->json(['message' => 'Erreur lors de la récupération du rôle.'], 500);
        }
    }

    /**
     * Update the specified role in storage.
     * PUT /api/roles/{role}
     */
    public function update(Request $request, Role $role): JsonResponse
    {
        Log::info("Attempting to update role ID: {$role->id}...");
        if ($role->guard_name !== $this->guardName) {
             return response()->json(['message' => 'Rôle non trouvé.'], 404);
        }
        
        try {
            $validatedData = $request->validate([
                'name' => ['required', 'string', 'max:255', Rule::unique('roles', 'name')->where('guard_name', $this->guardName)->ignore($role->id)],
                'permissions' => 'present|array',
                'permissions.*' => ['string', Rule::exists('permissions', 'name')->where('guard_name', $this->guardName)],
                'alert_type_ids' => 'present|array',
                'alert_type_ids.*' => ['integer', Rule::exists('alert_types', 'id')],
            ]);
            Log::info('Validation successful (update role).');

            DB::beginTransaction();
            Log::info('DB Transaction started (update role).');
            try {
                $role->update(['name' => $validatedData['name']]);
                
                // Sync Permissions
                $role->syncPermissions(array_filter($validatedData['permissions']));
                Log::info("Synced permissions for role ID {$role->id}.");

                // Sync Alert Subscriptions
                if (isset($validatedData['alert_type_ids'])) {
                    // Delete old and insert new subscriptions
                    AlertSubscription::where('role_id', $role->id)->delete();
                    
                    $subscriptions = collect($validatedData['alert_type_ids'])->map(function ($alertTypeId) use ($role) {
                        return ['role_id' => $role->id, 'alert_type_id' => $alertTypeId];
                    });

                    if ($subscriptions->isNotEmpty()) {
                        AlertSubscription::insert($subscriptions->all());
                    }
                    Log::info("Synced " . $subscriptions->count() . " alert subscriptions for role ID {$role->id}.");
                }

                DB::commit();
                Log::info('DB Transaction committed (update role).');

                app()[PermissionRegistrar::class]->forgetCachedPermissions();

            } catch (Exception $dbException) {
                DB::rollBack();
                Log::error('DB ERROR during role update/sync:', ['id' => $role->id, 'message' => $dbException->getMessage()]);
                throw $dbException;
            }

            // Reload all fresh data for the response
            $roleWithData = $this->getRoleWithData($role->fresh());

            return response()->json(['message' => 'Rôle modifié avec succès!', 'role' => $roleWithData]);

        } catch (ValidationException $e) {
            Log::error('Validation failed (update role):', ['id' => $role->id, 'errors' => $e->errors()]);
            return response()->json(['message' => 'Données invalides.', 'errors' => $e->errors()], 422);
        } catch (Exception $e) {
            Log::error('GENERAL ERROR (update role):', ['id' => $role->id, 'message' => $e->getMessage()]);
             return response()->json(["message" => "Échec de la modification du rôle.", "error_details" => $e->getMessage()], 500);
        }
    }

    /**
     * Remove the specified role from storage.
     * DELETE /api/roles/{role}
     */
    public function destroy(Role $role): JsonResponse
    {
        Log::info("Attempting to delete role ID: {$role->id}, Name: {$role->name}...");

        if ($role->guard_name !== $this->guardName) {
             Log::warning("Attempt blocked to delete role ID {$role->id} with incorrect guard.");
             return response()->json(['message' => 'Rôle non trouvé ou accès non autorisé.'], 404);
        }

        if (in_array($role->name, ['Admin'])) {
            Log::warning("Attempt blocked to delete protected role: '{$role->name}'.");
            return response()->json(['message' => "Impossible de supprimer le rôle protégé '{$role->name}'."], 403);
        }

        DB::beginTransaction();
        try {
            // Associated alert subscriptions will be deleted via database cascade or manually if needed
            AlertSubscription::where('role_id', $role->id)->delete();
            $role->delete();
            
            DB::commit();
            Log::info("Role and its alert subscriptions deleted successfully for ID: {$role->id}");

            app()[PermissionRegistrar::class]->forgetCachedPermissions();

            return response()->json(['message' => 'Rôle supprimé avec succès.'], 200);

        } catch (\Illuminate\Database\QueryException $qe) {
             DB::rollBack();
             if ($qe->errorInfo[1] == 1451) {
                 Log::warning("Failed to delete role ID {$role->id} due to FK constraint (assigned to users).");
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

    /**
     * Helper method to load role with permissions and alert subscriptions.
     */
    protected function getRoleWithData(Role $role): Role
    {
        $role->load('permissions:id,name');
        // Manually attach subscription IDs to the role object for the frontend
        $role->alert_type_ids = AlertSubscription::where('role_id', $role->id)->pluck('alert_type_id')->toArray();
        return $role;
    }
}