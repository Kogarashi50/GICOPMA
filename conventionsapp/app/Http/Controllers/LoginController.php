<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use App\Models\User; // Ensure this points to your User model that uses Spatie Permissions


class LoginController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'email'    => 'required|string|email',
            'password' => 'required|string',
        ]);

        $credentials = $request->only('email', 'password');

        if (!Auth::guard('web')->attempt($credentials)) {
            if (!User::where('email', $credentials['email'])->exists()) {
                 throw ValidationException::withMessages([
                    'email' => ["L'adresse e-mail fournie n'existe pas."],
                 ]);
            }
             throw ValidationException::withMessages([
                'password' => ['Les informations d\'identification fournies sont incorrectes.'],
             ]);
        }

        $user = Auth::user(); // Get the authenticated App\Models\User instance

        if (!$user) {
             return response()->json(['message' => 'Erreur lors de la récupération de l\'utilisateur après connexion.'], 500);
        }

        if ($user->status !== 'active') {
             Auth::guard('web')->logout();
             return response()->json([
                'message' => 'Votre compte est inactif ou suspendu. Veuillez contacter l\'administrateur.',
             ], 403);
        }

        // Revoke previous tokens if desired (optional)
        // $user->tokens()->delete();

        $token = $user->createToken('api-token-'.$user->id)->plainTextToken;

        // --- START: Load Roles and Permissions ---
        // Ensure the User model uses the HasRoles trait from Spatie/laravel-permission
        $user->loadMissing('fonctionnaire'); // Load fonctionnaire if needed, like in /user route
        $roles = $user->getRoleNames()->toArray(); // Get role names as an array
        $permissions = $user->getAllPermissions()->pluck('name')->toArray(); // Get permission names as an array

        // Convert user model to array and add roles/permissions
        $userData = $user->toArray();
        $userData['roles'] = $roles;
        $userData['permissions'] = $permissions;
        // --- END: Load Roles and Permissions ---


        // ** Return token AND the user data WITH roles/permissions **
        return response()->json([
            'message' => 'Connexion réussie',
            'token' => $token,
            // 'user' => $user // BEFORE: Sending the raw model object
            'user' => $userData // AFTER: Sending the array with roles/permissions added
        ], 200);
    }

    public function logout(Request $request)
    {
        $user = $request->user();

        if ($user) {
            $user->currentAccessToken()->delete();
             return response()->json(['message' => 'Déconnexion réussie'], 200);
        }

         return response()->json(['message' => 'Aucun utilisateur authentifié'], 401);
    }
}