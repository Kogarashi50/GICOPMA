<?php

namespace App\Http\Controllers;

use App\Models\MaitreOuvrageDelegue;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class MaitreOuvrageDelegueController extends Controller
{
    /**
     * Display a listing of maîtres d'ouvrage délégués.
     * GET /api/maitre-ouvrage-delegue
     */
    public function index(): JsonResponse
    {
        Log::info('Récupération de tous les maîtres d\'ouvrage délégués...');
        try {
            $maitresOuvrageDelegues = MaitreOuvrageDelegue::orderBy('nom', 'asc')->get();
            Log::info('Récupération réussie de ' . $maitresOuvrageDelegues->count() . ' maîtres d\'ouvrage délégués.');
            return response()->json(['maitres_ouvrage_delegues' => $maitresOuvrageDelegues]);
        } catch (\Exception $e) {
            Log::error('Erreur lors de la récupération des maîtres d\'ouvrage délégués:', ['message' => $e->getMessage()]);
            return response()->json(['message' => 'Erreur serveur lors de la récupération des maîtres d\'ouvrage délégués.'], 500);
        }
    }

    /**
     * Get maîtres d'ouvrage délégués formatted for dropdowns.
     * GET /api/maitre-ouvrage-delegue/options
     */
    public function getOptions(): JsonResponse
    {
        Log::info("Fetching Maître d'ouvrage délégué options for dropdown...");
        try {
            $maitresOuvrageDelegues = MaitreOuvrageDelegue::select(['id', 'nom', 'description'])
                ->orderBy('nom', 'asc')
                ->get();
            
            $options = $maitresOuvrageDelegues->map(function ($mod) {
                $label = $mod->nom;
                if (!empty($mod->description)) {
                    $label .= ' - ' . \Illuminate\Support\Str::limit($mod->description, 60, '...');
                }
                return ['value' => $mod->id, 'label' => $label];
            });
            
            Log::info("Returning " . $options->count() . " Maître d'ouvrage délégué options.");
            return response()->json($options, 200);
        } catch (\Exception $e) {
            Log::error('Error fetching Maître d\'ouvrage délégué options: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return response()->json(['message' => 'Erreur chargement options maîtres d\'ouvrage délégués.'], 500);
        }
    }

    /**
     * Store a newly created maître d'ouvrage délégué.
     * POST /api/maitre-ouvrage-delegue
     */
    public function store(Request $request): JsonResponse
    {
        Log::info('Requête de création de maître d\'ouvrage délégué reçue...');
        Log::debug('Données brutes:', $request->all());

        try {
            $validatedData = $request->validate([
                'nom' => 'required|string|max:255|unique:maitre_ouvrage_delegue,nom',
                'description' => 'nullable|string|max:1000',
                'contact' => 'nullable|string|max:255',
                'email' => 'nullable|email|max:255',
                'telephone' => 'nullable|string|max:50',
                'adresse' => 'nullable|string|max:500',
            ], [
                'required' => 'Le champ :attribute est obligatoire.',
                'string' => 'Le champ :attribute doit être une chaîne.',
                'max' => 'Le champ :attribute ne doit pas dépasser :max caractères.',
                'unique' => 'Ce nom de maître d\'ouvrage délégué existe déjà.',
                'email' => 'Le champ :attribute doit être une adresse email valide.',
            ]);

            Log::info('Validation réussie (store maître d\'ouvrage délégué).');
            
            $maitreOuvrageDelegue = MaitreOuvrageDelegue::create($validatedData);
            Log::info("Maître d'ouvrage délégué créé: ID {$maitreOuvrageDelegue->id}");

            return response()->json([
                "success" => "Maître d'ouvrage délégué ajouté!",
                "message" => "Maître d'ouvrage délégué ajouté avec succès!",
                "maitre_ouvrage_delegue" => $maitreOuvrageDelegue
            ], 201);

        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::error('Échec validation (store maître d\'ouvrage délégué):', ['errors' => $e->errors()]);
            return response()->json(['message' => 'Données invalides.', 'errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            Log::error('ERREUR GÉNÉRALE (store maître d\'ouvrage délégué):', ['message' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            return response()->json(["message" => "Échec de la création du maître d'ouvrage délégué.", "error_details" => config('app.debug') ? $e->getMessage() : null], 500);
        }
    }

    /**
     * Display the specified maître d'ouvrage délégué.
     * GET /api/maitre-ouvrage-delegue/{id}
     */
    public function show(MaitreOuvrageDelegue $maitreOuvrageDelegue): JsonResponse
    {
        $maitreOuvrageDelegueId = $maitreOuvrageDelegue->id;
        Log::info("API: Requête pour détails Maître d'ouvrage délégué ID: {$maitreOuvrageDelegueId}");
        try {
            return response()->json(['maitre_ouvrage_delegue' => $maitreOuvrageDelegue], 200);
        } catch (\Exception $e) {
            Log::error("API: Erreur récupération détaillée Maître d'ouvrage délégué ID {$maitreOuvrageDelegueId}: " . $e->getMessage(), ['exception' => $e]);
            return response()->json(['message' => 'Erreur serveur lors de la récupération des détails.'], 500);
        }
    }

    /**
     * Update the specified maître d'ouvrage délégué.
     * PUT /api/maitre-ouvrage-delegue/{id}
     */
    public function update(Request $request, MaitreOuvrageDelegue $maitreOuvrageDelegue): JsonResponse
    {
        Log::info("Requête MAJ reçue pour Maître d'ouvrage délégué ID {$maitreOuvrageDelegue->id}...");
        Log::debug('Données brutes MAJ (maître d\'ouvrage délégué):', $request->all());

        try {
            $validatedData = $request->validate([
                'nom' => 'required|string|max:255|unique:maitre_ouvrage_delegue,nom,' . $maitreOuvrageDelegue->id,
                'description' => 'nullable|string|max:1000',
                'contact' => 'nullable|string|max:255',
                'email' => 'nullable|email|max:255',
                'telephone' => 'nullable|string|max:50',
                'adresse' => 'nullable|string|max:500',
            ], [
                'required' => 'Le champ :attribute est obligatoire.',
                'string' => 'Le champ :attribute doit être une chaîne.',
                'max' => 'Le champ :attribute ne doit pas dépasser :max caractères.',
                'unique' => 'Ce nom de maître d\'ouvrage délégué existe déjà.',
                'email' => 'Le champ :attribute doit être une adresse email valide.',
            ]);

            Log::info('Validation réussie (update maître d\'ouvrage délégué).');
            
            $maitreOuvrageDelegue->update($validatedData);
            Log::info("Maître d'ouvrage délégué MAJ: ID {$maitreOuvrageDelegue->id}");

            return response()->json([
                'success' => 'Maître d\'ouvrage délégué Modifié!',
                'message' => 'Maître d\'ouvrage délégué modifié avec succès!',
                'maitre_ouvrage_delegue' => $maitreOuvrageDelegue
            ], 200);

        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::error('Échec validation (update maître d\'ouvrage délégué):', ['errors' => $e->errors()]);
            return response()->json(['message' => 'Données invalides.', 'errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            Log::error('ERREUR GÉNÉRALE (update maître d\'ouvrage délégué):', ['message' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            return response()->json(["message" => "Échec de la modification du maître d'ouvrage délégué.", "error_details" => config('app.debug') ? $e->getMessage() : null], 500);
        }
    }

    /**
     * Remove the specified maître d'ouvrage délégué.
     * DELETE /api/maitre-ouvrage-delegue/{id}
     */
    public function destroy(MaitreOuvrageDelegue $maitreOuvrageDelegue): JsonResponse
    {
        Log::info("Tentative suppression Maître d'ouvrage délégué ID: {$maitreOuvrageDelegue->id}...");
        
        try {
            // Check if maître d'ouvrage délégué is used in any conventions
            $conventionsCount = $maitreOuvrageDelegue->conventions()->count();
            if ($conventionsCount > 0) {
                Log::warning("Maître d'ouvrage délégué ID: {$maitreOuvrageDelegue->id} est utilisé dans {$conventionsCount} convention(s).");
                return response()->json(['message' => 'Impossible de supprimer ce maître d\'ouvrage délégué car il est utilisé dans des conventions.'], 409);
            }

            $maitreOuvrageDelegue->delete();
            Log::info("Maître d'ouvrage délégué ID: {$maitreOuvrageDelegue->id} supprimé.");

            return response()->json(['success' => 'Maître d\'ouvrage délégué Supprimé!', 'message' => 'Suppression réussie.'], 200);
        } catch (\Exception $e) {
            Log::error('ERREUR GÉNÉRALE durant la suppression (Maître d\'ouvrage délégué):', ['id' => $maitreOuvrageDelegue->id, 'message' => $e->getMessage()]);
            return response()->json(['message' => 'Erreur serveur lors de la tentative de suppression.', 'error_details' => config('app.debug') ? $e->getMessage() : null], 500);
        }
    }
}
