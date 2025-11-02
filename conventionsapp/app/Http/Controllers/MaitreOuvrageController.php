<?php

namespace App\Http\Controllers;

use App\Models\MaitreOuvrage;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class MaitreOuvrageController extends Controller
{
    /**
     * Display a listing of maîtres d'ouvrage.
     * GET /api/maitre-ouvrage
     */
    public function index(): JsonResponse
    {
        Log::info('Récupération de tous les maîtres d\'ouvrage...');
        try {
            $maitresOuvrage = MaitreOuvrage::orderBy('nom', 'asc')->get();
            Log::info('Récupération réussie de ' . $maitresOuvrage->count() . ' maîtres d\'ouvrage.');
            return response()->json(['maitres_ouvrage' => $maitresOuvrage]);
        } catch (\Exception $e) {
            Log::error('Erreur lors de la récupération des maîtres d\'ouvrage:', ['message' => $e->getMessage()]);
            return response()->json(['message' => 'Erreur serveur lors de la récupération des maîtres d\'ouvrage.'], 500);
        }
    }

    /**
     * Get maîtres d'ouvrage formatted for dropdowns.
     * GET /api/maitre-ouvrage/options
     */
    public function getOptions(): JsonResponse
    {
        Log::info("Fetching Maître d'ouvrage options for dropdown...");
        try {
            $maitresOuvrage = MaitreOuvrage::select(['id', 'nom', 'description'])
                ->orderBy('nom', 'asc')
                ->get();
            
            $options = $maitresOuvrage->map(function ($mo) {
                $label = $mo->nom;
                if (!empty($mo->description)) {
                    $label .= ' - ' . \Illuminate\Support\Str::limit($mo->description, 60, '...');
                }
                return ['value' => $mo->id, 'label' => $label];
            });
            
            Log::info("Returning " . $options->count() . " Maître d'ouvrage options.");
            return response()->json($options, 200);
        } catch (\Exception $e) {
            Log::error('Error fetching Maître d\'ouvrage options: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return response()->json(['message' => 'Erreur chargement options maîtres d\'ouvrage.'], 500);
        }
    }

    /**
     * Store a newly created maître d'ouvrage.
     * POST /api/maitre-ouvrage
     */
    public function store(Request $request): JsonResponse
    {
        Log::info('Requête de création de maître d\'ouvrage reçue...');
        Log::debug('Données brutes:', $request->all());

        try {
            $validatedData = $request->validate([
                'nom' => 'required|string|max:255|unique:maitre_ouvrage,nom',
                'description' => 'nullable|string|max:1000',
                'contact' => 'nullable|string|max:255',
                'email' => 'nullable|email|max:255',
                'telephone' => 'nullable|string|max:50',
                'adresse' => 'nullable|string|max:500',
            ], [
                'required' => 'Le champ :attribute est obligatoire.',
                'string' => 'Le champ :attribute doit être une chaîne.',
                'max' => 'Le champ :attribute ne doit pas dépasser :max caractères.',
                'unique' => 'Ce nom de maître d\'ouvrage existe déjà.',
                'email' => 'Le champ :attribute doit être une adresse email valide.',
            ]);

            Log::info('Validation réussie (store maître d\'ouvrage).');
            
            $maitreOuvrage = MaitreOuvrage::create($validatedData);
            Log::info("Maître d'ouvrage créé: ID {$maitreOuvrage->id}");

            return response()->json([
                "success" => "Maître d'ouvrage ajouté!",
                "message" => "Maître d'ouvrage ajouté avec succès!",
                "maitre_ouvrage" => $maitreOuvrage
            ], 201);

        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::error('Échec validation (store maître d\'ouvrage):', ['errors' => $e->errors()]);
            return response()->json(['message' => 'Données invalides.', 'errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            Log::error('ERREUR GÉNÉRALE (store maître d\'ouvrage):', ['message' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            return response()->json(["message" => "Échec de la création du maître d'ouvrage.", "error_details" => config('app.debug') ? $e->getMessage() : null], 500);
        }
    }

    /**
     * Display the specified maître d'ouvrage.
     * GET /api/maitre-ouvrage/{id}
     */
    public function show(MaitreOuvrage $maitreOuvrage): JsonResponse
    {
        $maitreOuvrageId = $maitreOuvrage->id;
        Log::info("API: Requête pour détails Maître d'ouvrage ID: {$maitreOuvrageId}");
        try {
            return response()->json(['maitre_ouvrage' => $maitreOuvrage], 200);
        } catch (\Exception $e) {
            Log::error("API: Erreur récupération détaillée Maître d'ouvrage ID {$maitreOuvrageId}: " . $e->getMessage(), ['exception' => $e]);
            return response()->json(['message' => 'Erreur serveur lors de la récupération des détails.'], 500);
        }
    }

    /**
     * Update the specified maître d'ouvrage.
     * PUT /api/maitre-ouvrage/{id}
     */
    public function update(Request $request, MaitreOuvrage $maitreOuvrage): JsonResponse
    {
        Log::info("Requête MAJ reçue pour Maître d'ouvrage ID {$maitreOuvrage->id}...");
        Log::debug('Données brutes MAJ (maître d\'ouvrage):', $request->all());

        try {
            $validatedData = $request->validate([
                'nom' => 'required|string|max:255|unique:maitre_ouvrage,nom,' . $maitreOuvrage->id,
                'description' => 'nullable|string|max:1000',
                'contact' => 'nullable|string|max:255',
                'email' => 'nullable|email|max:255',
                'telephone' => 'nullable|string|max:50',
                'adresse' => 'nullable|string|max:500',
            ], [
                'required' => 'Le champ :attribute est obligatoire.',
                'string' => 'Le champ :attribute doit être une chaîne.',
                'max' => 'Le champ :attribute ne doit pas dépasser :max caractères.',
                'unique' => 'Ce nom de maître d\'ouvrage existe déjà.',
                'email' => 'Le champ :attribute doit être une adresse email valide.',
            ]);

            Log::info('Validation réussie (update maître d\'ouvrage).');
            
            $maitreOuvrage->update($validatedData);
            Log::info("Maître d'ouvrage MAJ: ID {$maitreOuvrage->id}");

            return response()->json([
                'success' => 'Maître d\'ouvrage Modifié!',
                'message' => 'Maître d\'ouvrage modifié avec succès!',
                'maitre_ouvrage' => $maitreOuvrage
            ], 200);

        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::error('Échec validation (update maître d\'ouvrage):', ['errors' => $e->errors()]);
            return response()->json(['message' => 'Données invalides.', 'errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            Log::error('ERREUR GÉNÉRALE (update maître d\'ouvrage):', ['message' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            return response()->json(["message" => "Échec de la modification du maître d'ouvrage.", "error_details" => config('app.debug') ? $e->getMessage() : null], 500);
        }
    }

    /**
     * Remove the specified maître d'ouvrage.
     * DELETE /api/maitre-ouvrage/{id}
     */
    public function destroy(MaitreOuvrage $maitreOuvrage): JsonResponse
    {
        Log::info("Tentative suppression Maître d'ouvrage ID: {$maitreOuvrage->id}...");
        
        try {
            // Check if maître d'ouvrage is used in any conventions
            $conventionsCount = $maitreOuvrage->conventions()->count();
            if ($conventionsCount > 0) {
                Log::warning("Maître d'ouvrage ID: {$maitreOuvrage->id} est utilisé dans {$conventionsCount} convention(s).");
                return response()->json(['message' => 'Impossible de supprimer ce maître d\'ouvrage car il est utilisé dans des conventions.'], 409);
            }

            $maitreOuvrage->delete();
            Log::info("Maître d'ouvrage ID: {$maitreOuvrage->id} supprimé.");

            return response()->json(['success' => 'Maître d\'ouvrage Supprimé!', 'message' => 'Suppression réussie.'], 200);
        } catch (\Exception $e) {
            Log::error('ERREUR GÉNÉRALE durant la suppression (Maître d\'ouvrage):', ['id' => $maitreOuvrage->id, 'message' => $e->getMessage()]);
            return response()->json(['message' => 'Erreur serveur lors de la tentative de suppression.', 'error_details' => config('app.debug') ? $e->getMessage() : null], 500);
        }
    }
}
