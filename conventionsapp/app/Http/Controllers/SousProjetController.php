<?php

namespace App\Http\Controllers;

use App\Models\SousProjet; // Use the SousProjet model
use App\Models\Projet;     // Needed for validation checks
use App\Models\Province;   // Needed for validation checks
use App\Models\Commune;    // Needed for validation checks
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\Rule;
use Illuminate\Database\Eloquent\ModelNotFoundException; // Needed for firstOrFail

class SousProjetController extends Controller
{
    /**
     * Display a listing of the resource.
     * MERGED: Kept Code 1's structure (identical to Code 2).
     */
    public function index(): JsonResponse
    {
        try {
            $sousprojets = SousProjet::with(['projet', 'province', 'commune'])
                ->orderBy('created_at', 'desc')
                ->get();
            return response()->json(['sousprojets' => $sousprojets], 200);
        } catch (\Exception $e) {
            Log::error('Error fetching sousprojets: ' . $e->getMessage());
            // Using Code 1's error message structure
            return response()->json(['failed' => 'Erreur lors de la récupération des sous projets', 'error_details' => config('app.debug') ? $e->getMessage() : null], 500);
        }
    }

    /**
     * Store a newly created resource in storage.
     * MERGED: Using Code 1's structure with merged validation (more nullable fields from Code 2, id_fonctionnaire from Code 1).
     */
    public function store(Request $request): JsonResponse
    {
        Log::info('Attempting to store new sousprojet.');
        Log::debug('Store request data:', $request->all());

        // Merged Validation: Prioritizing nullable from Code 2, stricter limits from Code 1, id_fonctionnaire from Code 1
        $validatedData = $request->validate([
            'Code_Sous_Projet' => 'required|string|max:255|unique:sous_projet,Code_Sous_Projet',
            'Nom_Projet' => 'required|string|max:65535',
            'ID_Projet_Maitre' => ['required', Rule::exists('projet', 'Code_Projet')],
            'Id_Province' => ['required', Rule::exists('province', 'Id')],
            'Id_Commune' => ['nullable', Rule::exists('commune', 'Id')], // Merged: nullable from Code 2
            'Observations' => 'nullable|string',
            'Etat_Avan_Physi' => 'nullable|numeric|min:0|max:100', // Merged: nullable from Code 2, limits from Code 1
            'Etat_Avan_Finan' => 'nullable|numeric|min:0|max:100', // Merged: nullable from Code 2, limits from Code 1
            'Estim_Initi' => 'nullable|numeric|min:0', // Merged: nullable from Code 2, min:0 from Code 1
            'Secteur' => 'nullable|string|max:255', // Merged: nullable from Code 2, max:255 from Code 1
            'Localite' => 'nullable|string|max:255', // Merged: max:255 from Code 1
            'Centre' => 'nullable|string|max:255',   // Merged: max:255 from Code 1
            'Site' => 'nullable|string|max:255',     // Merged: max:255 from Code 1
            'Surface' => 'nullable|numeric|min:0',  // Merged: min:0 from Code 1
            'Lineaire' => 'nullable|numeric|min:0', // Merged: min:0 from Code 1
            'Status' => 'nullable|string|max:255',   // Merged: nullable from Code 2, max:255 from Code 1
            'Douars_Desservis' => 'nullable|string',
            'Financement' => 'nullable|string',
            'Nature_Intervention' => 'nullable|string',
            'Benificiaire' => 'nullable|string',
            'id_fonctionnaire'=>'nullable|string', // Merged: Included from Code 1
        ], [
            // Add custom messages if needed
            'Code_Sous_Projet.required' => 'Le code du sous-projet est obligatoire.',
            'Code_Sous_Projet.unique' => 'Ce code de sous-projet existe déjà.',
            'Nom_Projet.required' => 'Le nom du sous-projet est obligatoire.',
            'ID_Projet_Maitre.required' => 'Le projet maître est obligatoire.',
            'Id_Province.required' => 'La province est obligatoire.',
            'exists' => 'La valeur sélectionnée pour :attribute est invalide.',
            'numeric' => 'Le champ :attribute doit être numérique.',
            'min' => 'Le champ :attribute doit être au moins :min.',
            'max' => [
                'numeric' => 'Le champ :attribute ne doit pas dépasser :max.',
                'string' => 'Le champ :attribute ne doit pas dépasser :max caractères.'
            ],
        ]);

        try {
            Log::debug('Validated data for store:', $validatedData);
            $sousProjet = SousProjet::create($validatedData);
            Log::info('SousProjet created successfully with Code: ' . $sousProjet->Code_Sous_Projet);

            // Using Code 1's success response structure
            return response()->json([
                'success' => 'Sous-projet créé avec succès',
                'sousprojet' => $sousProjet->load(['projet', 'province', 'commune']) // Load relations for response
            ], 201);

        } catch (\Exception $e) {
             // Using Code 1's detailed error handling
             Log::error('Failed to store sousprojet: ' . $e->getMessage(), [
                 'exception' => $e,
                 'data' => $validatedData
             ]);
             return response()->json([
                 'failed' => 'Échec de la création du sous-projet',
                 'error_details' => config('app.debug') ? $e->getMessage() : 'Erreur interne du serveur.',
                 'trace' => config('app.debug') ? $e->getTraceAsString() : null,
             ], 500);
        }
    }

    /**
     * Display the specified resource.
     * MERGED: Kept Code 1's structure (identical to Code 2). Added ModelNotFoundException catch.
     */
    public function show(string $id): JsonResponse
    {
        Log::info('Fetching sousprojet with Code: ' . $id);
        try {
            // Use firstOrFail for cleaner not found handling
            $sousprojet = SousProjet::where('Code_Sous_Projet', $id)
                                    ->with(['projet', 'province', 'commune']) // Eager load
                                    ->firstOrFail();

            Log::info('SousProjet found with Code: ' . $id);
            return response()->json(['sousprojet' => $sousprojet], 200);

        } catch (ModelNotFoundException $e) {
            Log::warning('SousProjet not found with Code: ' . $id);
            // Mimicking Code 1's 404 response
            return response()->json(['error' => 'Sous Projet n\'existe pas.'], 404);
        }
        catch (\Exception $e) {
            Log::error('Error fetching sousprojet Code ' . $id . ': ' . $e->getMessage());
            // Using Code 1's error message structure
            return response()->json(['failed' => 'Erreur serveur lors de la récupération du sous projet', 'error_details' => config('app.debug') ? $e->getMessage() : null], 500);
        }
    }

    /**
     * Update the specified resource in storage.
     * MERGED: Using Code 1's structure (firstOrFail) with merged validation (more nullable fields from Code 2, id_fonctionnaire from Code 1).
     */
    public function update(Request $request, string $id): JsonResponse // $id is Code_Sous_Projet
    {
        Log::info('Attempting to update sousprojet with Code: ' . $id);
        Log::debug('Update request data:', $request->all());

        try {
            // Find the existing model first
            $sousprojet = SousProjet::where('Code_Sous_Projet', $id)->firstOrFail();

            // Merged Validation (Similar to store, but no unique check on Code_Sous_Projet)
            $validatedData = $request->validate([
                // 'Code_Sous_Projet' => 'sometimes|required|string|max:255|unique:sous_projet,Code_Sous_Projet,' . $sousprojet->Code_Sous_Projet . ',Code_Sous_Projet', // Usually PK is not updatable
                'Nom_Projet' => 'required|string|max:65535',
                'ID_Projet_Maitre' => ['required', Rule::exists('projet', 'Code_Projet')],
                'Id_Province' => ['required', Rule::exists('province', 'Id')],
                'Id_Commune' => ['nullable', Rule::exists('commune', 'Id')], // Merged: nullable
                'Observations' => 'nullable|string',
                'Etat_Avan_Physi' => 'nullable|numeric|min:0|max:100', // Merged: nullable
                'Etat_Avan_Finan' => 'nullable|numeric|min:0|max:100', // Merged: nullable
                'Estim_Initi' => 'nullable|numeric|min:0', // Merged: nullable, min:0
                'Secteur' => 'nullable|string|max:255', // Merged: nullable, max:255
                'Localite' => 'nullable|string|max:255', // Merged: max:255
                'Centre' => 'nullable|string|max:255',   // Merged: max:255
                'Site' => 'nullable|string|max:255',     // Merged: max:255
                'Surface' => 'nullable|numeric|min:0',  // Merged: min:0
                'Lineaire' => 'nullable|numeric|min:0', // Merged: min:0
                'Status' => 'nullable|string|max:255',   // Merged: nullable, max:255
                'Douars_Desservis' => 'nullable|string',
                'Financement' => 'nullable|string',
                'Nature_Intervention' => 'nullable|string',
                'Benificiaire' => 'nullable|string',
                'id_fonctionnaire'=>'nullable|string', // Merged: Included from Code 1
            ], [
                 // Add custom messages if needed
                'Nom_Projet.required' => 'Le nom du sous-projet est obligatoire.',
                'ID_Projet_Maitre.required' => 'Le projet maître est obligatoire.',
                'Id_Province.required' => 'La province est obligatoire.',
                'exists' => 'La valeur sélectionnée pour :attribute est invalide.',
                'numeric' => 'Le champ :attribute doit être numérique.',
                'min' => 'Le champ :attribute doit être au moins :min.',
                'max' => [
                    'numeric' => 'Le champ :attribute ne doit pas dépasser :max.',
                    'string' => 'Le champ :attribute ne doit pas dépasser :max caractères.'
                ],
            ]);

            Log::debug('Validated data for update:', $validatedData);

            // Use the update method on the found model instance
            $updated = $sousprojet->update($validatedData);

            if ($updated) {
                Log::info('SousProjet updated successfully with Code: ' . $id);
                // Using Code 1's success response style (but returning updated model)
                return response()->json([
                    'success' => 'Sous-projet mis à jour avec succès',
                    'sousprojet' => $sousprojet->fresh()->load(['projet', 'province', 'commune']) // Get fresh data with relations
                ], 200);
            } else {
                 // This case is less likely with ->update() unless no changes were made or an event prevented saving
                 Log::warning('SousProjet update returned false for Code: ' . $id . '. No changes might have been made.');
                 return response()->json(['message' => 'Aucune modification détectée ou échec de la mise à jour.'], 304); // 304 Not Modified or 400
            }
        } catch (ModelNotFoundException $e) {
            Log::warning('SousProjet not found for update with Code: ' . $id);
            return response()->json(['failed' => 'Sous-projet non trouvé'], 404);
        } catch (\Illuminate\Validation\ValidationException $e) {
             Log::error('Validation failed during sousprojet update (Code: ' . $id . '): ', $e->errors());
            return response()->json(['errors' => $e->errors()], 422); // Return validation errors
        } catch (\Exception $e) {
             Log::error('Failed to update sousprojet (Code: ' . $id . '): ' . $e->getMessage(), [
                 'exception' => $e,
                 'data_attempted' => $request->all() // Log raw request data on general failure
             ]);
             // Using Code 1's detailed error response style
             return response()->json([
                'failed' => 'Échec de la mise à jour du sous-projet',
                'error_details' => config('app.debug') ? $e->getMessage() : 'Erreur interne du serveur.',
                'trace' => config('app.debug') ? $e->getTraceAsString() : null,
            ], 500);
        }
    }

    /**
     * Remove the specified resource from storage.
     * MERGED: Kept Code 1's structure (identical to Code 2), including FK checks.
     * Note: Disabling FK checks is generally discouraged. Consider cascade deletes or manual dependency deletion.
     */
    public function destroy(string $id): JsonResponse // $id is Code_Sous_Projet
    {
        Log::info('Attempting to delete sousprojet with Code: ' . $id);

        // Note: Wrapping DB::statement in try...finally might be safer
        // to ensure checks are always re-enabled.
        try {
             $sousprojet = SousProjet::where('Code_Sous_Projet', $id)->first();

             DB::statement('SET FOREIGN_KEY_CHECKS=0;'); // Pattern from original code

             if (!$sousprojet) {
                 DB::statement('SET FOREIGN_KEY_CHECKS=1;');
                 Log::warning('SousProjet not found for deletion with Code: ' . $id);
                 return response()->json(['failed' => 'non trouve'], 404); // Mimicking original response
             }

            $deleted = SousProjet::where('Code_Sous_Projet', $id)->delete();

            DB::statement('SET FOREIGN_KEY_CHECKS=1;');

            if ($deleted) {
                Log::info('SousProjet deleted successfully with Code: ' . $id);
                return response()->json(['success' => 'done done'], 200); // Mimicking original response
            } else {
                // This might happen if the record was deleted between the find and delete calls (race condition)
                Log::warning('SousProjet deletion returned 0 for Code: ' . $id . '. Record might already be deleted.');
                return response()->json(['failed' => 'non trouve ou déjà supprimé'], 404); // Adjusted message
            }
        } catch (\Illuminate\Database\QueryException $qe) {
            // Catch specific DB errors, like foreign key constraints if checks were enabled
             Log::error('DB Error deleting sousprojet (Code: ' . $id . '): ' . $qe->getMessage());
             try { DB::statement('SET FOREIGN_KEY_CHECKS=1;'); } catch (\Exception $dbEx) { Log::error('Failed to re-enable FK checks on DB error: ' . $dbEx->getMessage()); }
             if (str_contains($qe->getMessage(), '1451')) { // Check for foreign key constraint
                 return response()->json(['failed' => 'Impossible de supprimer : Le sous-projet est lié à d\'autres données.'], 409); // 409 Conflict
             }
             return response()->json(['failed' => 'Erreur base de données'], 500);
        } catch (\Exception $e) {
            Log::error('Failed to delete sousprojet (Code: ' . $id . '): ' . $e->getMessage());
            try { DB::statement('SET FOREIGN_KEY_CHECKS=1;'); } catch (\Exception $dbEx) { Log::error('Failed to re-enable FK checks on general error: ' . $dbEx->getMessage()); }
            // Mimicking original response, but providing more context if debug is on
            return response()->json([
                'failed' => 'process shut down', // Mimicking original
                'error_details' => config('app.debug') ? $e->getMessage() : null
            ], 400); // Original used 400, could arguably be 500
        }
    }
}