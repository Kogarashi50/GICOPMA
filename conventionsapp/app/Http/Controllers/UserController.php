<?php

namespace App\Http\Controllers;

// Core Laravel & Model Imports
use App\Models\User;
use App\Models\Fonctionnaire;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse; // <-- For type hinting
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;     // <-- For getOptions DB::raw
use Illuminate\Support\Facades\Hash;   // <-- Needed for updatePassword
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password; // <-- Needed for updatePassword validation
use Spatie\Permission\Models\Role; // <-- For role handling
use Exception; // General exception handling


class UserController extends Controller
{
    private $guardName = 'sanctum'; // Or your relevant API guard name

    /**
     * Display a listing of the resource.
     * GET /users
     */
    public function index(): JsonResponse
    {
        // Authorization assumed handled by route middleware
        try {
            // Eager load necessary relationships
            $users = User::with(['fonctionnaire', 'roles:id,name'])->latest()->get();
            return response()->json(['users' => $users], 200);

        } catch (Exception $e) {
            Log::error('Error fetching users: ' . $e->getMessage());
            return response()->json(['message' => 'Erreur lors de la récupération des utilisateurs.'], 500);
        }
    }

    /**
     * Store a newly created resource in storage.
     * POST /users
     */
    public function store(Request $request): JsonResponse
    {
        // Authorization assumed handled by route middleware

        $data = $request->validate([
            'email' => [
                'required','string','email','max:255',
                Rule::unique('users', 'email')
            ],
            // Use Password rule for better validation during creation
            'password' => ['required', 'string', Password::min(8), /* Add other rules like ->mixedCase() if needed */],
            'status' => [
                'required','string', Rule::in(['active', 'inactive', 'suspended'])
            ],
            'fonctionnaire_id' => [
                'required', 'integer', Rule::exists('fonctionnaires', 'id'),
                // Consider if 'fonctionnaire_id' should also be unique on the users table
                // Rule::unique('users', 'fonctionnaire_id')
            ],
            'role' => [
                'required', 'string',
                Rule::exists('roles', 'name')->where('guard_name', $this->guardName)
            ]
        ]);

        try {
            $user = User::create([
                'email' => $data['email'],
                'password' => $data['password'], // Hashing handled by User model mutator/observer
                'fonctionnaire_id' => $data['fonctionnaire_id'],
                'status' => $data['status'],
            ]);

            // Assign the validated role
            $user->syncRoles([$data['role']]); // syncRoles is safe and ensures only this role

            $user->load(['fonctionnaire', 'roles:id,name']); // Load relationships for the response

            return response()->json([
                'message' => 'Utilisateur créé avec Succès.',
                'user' => $user
            ], 201);

        } catch (Exception $e) {
            Log::error('Failed to create user: ' . $e->getMessage());
            return response()->json(['message' => 'Erreur lors de la création de l\'utilisateur.'], 500);
        }
    }

    /**
     * Display the specified resource.
     * GET /users/{user}
     */
    public function show(User $user): JsonResponse
    {
        // Authorization assumed handled by route middleware
        try {
            // Ensure relationships are loaded
            $user->loadMissing(['fonctionnaire', 'roles:id,name']);
            // Return the user model (Laravel converts to JSON)
            return response()->json($user, 200);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['message' => 'Utilisateur non trouvé.'], 404);
        } catch (Exception $e) {
            Log::error("Error fetching user {$user->id}: " . $e->getMessage());
            return response()->json(['message' => 'Erreur serveur.'], 500);
        }
    }

    /**
     * Update the specified resource in storage.
     * PUT/PATCH /users/{user}
     */
    public function update(Request $request, User $user): JsonResponse
    {
        // Authorization assumed handled by route middleware

        $data = $request->validate([
            'email' => [
                'required','string','email','max:255',
                Rule::unique('users', 'email')->ignore($user->id)
            ],
            // Password is optional on update, but validate if provided
            'password' => ['nullable', 'string', Password::min(8)],
            'status' => [
                'required','string', Rule::in(['active', 'inactive', 'suspended'])
            ],
            'fonctionnaire_id' => [
                'required', 'integer', Rule::exists('fonctionnaires', 'id'),
                // Rule::unique('users', 'fonctionnaire_id')->ignore($user->id) // Optional uniqueness check
            ],
            'role' => [
                'required', 'string',
                Rule::exists('roles', 'name')->where('guard_name', $this->guardName)
            ]
        ]);

        try {
            // Use DB transaction for atomicity (updating user + roles)
            DB::beginTransaction();

            $user->email = $data['email'];
            $user->fonctionnaire_id = $data['fonctionnaire_id'];
            $user->status = $data['status'];

            // Only update password if a non-empty value was provided
            if (!empty($data['password'])) {
                $user->password = $data['password']; // Hashing handled by model
            }

            $user->save(); // Save user details

            // Sync the role (replaces existing roles with the new one)
            $user->syncRoles([$data['role']]);

            DB::commit();

            $user->load(['fonctionnaire', 'roles:id,name']); // Reload relationships for response

            return response()->json([
                'message' => 'Utilisateur modifié avec Succès.',
                'user' => $user
            ], 200);

        } catch (Exception $e) {
            DB::rollBack();
            Log::error("Failed to update user {$user->id}: " . $e->getMessage());
            return response()->json(['message' => 'Erreur lors de la modification de l\'utilisateur.'], 500);
        }
    }

    /**
     * Remove the specified resource from storage.
     * DELETE /users/{user}
     */
    public function destroy(User $user): JsonResponse
    {
        // Authorization assumed handled by route middleware

        // Prevent users from deleting themselves
        if (Auth::id() == $user->id) {
           return response()->json(['message' => 'Vous ne pouvez pas supprimer votre propre compte.'], 403);
        }

       try {
           // Roles should detach automatically if using standard Spatie setup
           $user->delete(); // Assumes SoftDeletes trait is used if needed
           return response()->json(['message' => 'Utilisateur Supprimé avec Succès.'], 200); // 200 or 204

       } catch (Exception $e) {
            Log::error("Failed to delete user {$user->id}: " . $e->getMessage());
            // Catch specific DB exceptions if needed (e.g., foreign key constraints if not soft deleting)
            return response()->json(['message' => 'Erreur lors de la suppression de l\'utilisateur.'], 500);
       }
    }

    /**
     * Update the authenticated user's password.
     * POST /user/password (Example route)
     */
    public function updatePassword(Request $request): JsonResponse
    {
        $user = Auth::user(); // Get the currently authenticated user
        if (!$user) {
             return response()->json(['message' => 'Utilisateur non authentifié.'], 401);
        }

        // --- Validation ---
        $validatedData = $request->validate([
            // 'current_password' rule checks against the authenticated user's current hashed password
            'old_password' => ['required', 'string', 'current_password'],

            // 'confirmed' requires a matching 'new_password_confirmation' field in the request
            'new_password' => [
                'required',
                'string',
                Password::min(8), // Enforce minimum length
                    // ->mixedCase() // Optionally add more rules
                    // ->numbers()
                    // ->symbols(),
                'confirmed' // Must match new_password_confirmation field name
            ],
        ]);

        // --- Update Password ---
        // Use Hash facade (ensure 'use Illuminate\Support\Facades\Hash;' is imported)
        $user->password = Hash::make($validatedData['new_password']);
        $user->save();

        // --- Return Success Response ---
        return response()->json(['message' => 'Mot de passe mis à jour avec succès.'], 200);

        // Note: Laravel handles 422 response automatically on validation failure.
    }

    /**
     * Get users formatted for dropdown options.
     * GET /users/options (Example route)
     */
    public function getOptions(): JsonResponse
    {
        try {
            // Use Eloquent with join for cleaner syntax
            $users = User::query()
                ->leftJoin('fonctionnaires', 'users.fonctionnaire_id', '=', 'fonctionnaires.id')
                ->select(
                    'users.id as value', // Select user ID as 'value'
                    'users.email',       // Select email as fallback label
                    DB::raw("CONCAT_WS(' ', fonctionnaires.prenom, fonctionnaires.nom) AS label_name") // Concatenate names as 'label_name'
                )
                // ->where('users.status', 'active') // Optional: Filter only active users
                ->orderBy('label_name', 'asc')      // Order by the concatenated name
                ->get();

            // Format for react-select { value, label }
            $options = $users->map(function ($user) {
                // Use the concatenated name if available, otherwise use email
                $label = trim($user->label_name) ?: $user->email;
                return [
                    'value' => $user->value, // Already selected as 'value'
                    'label' => $label
                ];
            });

            return response()->json($options); // Return the formatted array directly

        } catch (\Exception $e) {
            Log::error('Error fetching user options for dropdown: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['message' => 'Erreur serveur lors de la récupération des utilisateurs.'], 500);
        }
    }

}