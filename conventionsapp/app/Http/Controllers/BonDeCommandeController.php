<?php

namespace App\Http\Controllers;

use App\Models\BonDeCommande;
use App\Models\FichierBonCommandeEtContrat; // Import the file model
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Arr;

class BonDeCommandeController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(): JsonResponse
    {
        try {
            $bonsDeCommande = BonDeCommande::with(['marche_public', 'contrat', 'fichiers']) // Eager load files
                ->orderBy('date_emission', 'desc')
                ->get();
            // Use a key like 'bons_de_commande' for clarity in frontend
            return response()->json(['bons_de_commande' => $bonsDeCommande], 200);
        } catch (\Exception $e) {
            Log::error('Error fetching bons de commande: ' . $e->getMessage());
            return response()->json(['failed' => 'Erreur lors de la récupération des bons de commande'], 500);
        }
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'numero_bc' => 'required|string|max:50|unique:bon_de_commande,numero_bc',
            'date_emission' => 'required|date',
            'objet' => 'required|string',
            'montant_total' => 'required|numeric|min:0',
            'fournisseur_nom' => 'required|string|max:255',
            'id_fonctionnaire'=>'nullable|string',
            'mode_paiement' => 'nullable|string|max:50',
            'etat' => ['nullable', Rule::in(['en préparation', 'validé', 'envoyé', 'reçu', 'annulé'])],
            'marche_id' => 'nullable|integer|exists:marche_public,id', // Ensure 'marche' table exists
            'contrat_id' => 'nullable|integer|exists:contrat_droit_commun,id', // Ensure table exists
            'fichiers' => 'nullable|array', // Expect an array of files
            'fichiers.*' => 'file|mimes:pdf,doc,docx,xls,xlsx,jpg,png|max:10240' // Example validation (10MB max)
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $validatedData = $validator->validated();

        DB::beginTransaction();
        try {
            // Create the Bon de Commande record
            $bonDeCommande = BonDeCommande::create($validatedData);

            // Handle File Uploads
            if ($request->hasFile('fichiers')) {
                foreach ($request->file('fichiers') as $file) {
                    $originalName = $file->getClientOriginalName();
                    // Store in 'bc_files/{bc_id}' directory within the public disk
                    $path = $file->store('bc_files/' . $bonDeCommande->id, 'public');

                    // Create file record in the database
                    FichierBonCommandeEtContrat::create([
                        'id_bc' => $bonDeCommande->id,
                        'id_cdc' => null, // File specifically linked to BC here
                        'nom_fichier' => $originalName,
                        'chemin_fichier' => $path,
                        'type_fichier' => $file->getClientMimeType(),
                    ]);
                }
            }

            DB::commit();

            // Reload the model with its files for the response
            $bonDeCommande->load('fichiers');

            return response()->json([
                'success' => 'Bon de commande créé avec succès',
                'bon_de_commande' => $bonDeCommande
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to store bon de commande: ' . $e->getMessage(), ['exception' => $e]);
            return response()->json([
                'failed' => 'Échec de la création du bon de commande.',
                'error_details' => config('app.debug') ? $e->getMessage() : 'Erreur interne du serveur.',
            ], 500);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id): JsonResponse
    {
        try {
            $bonDeCommande = BonDeCommande::with(['marche_public', 'contrat', 'fichiers'])->findOrFail($id);
            return response()->json(['bon_de_commande' => $bonDeCommande], 200);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['failed' => 'Bon de commande non trouvé.'], 404);
        } catch (\Exception $e) {
            Log::error('Error fetching bon de commande ID ' . $id . ': ' . $e->getMessage());
            return response()->json(['failed' => 'Erreur serveur lors de la récupération du bon de commande'], 500);
        }
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        Log::info("[BC UPDATE] Attempting to update Bon De Commande ID: {$id}");
        Log::debug("[BC UPDATE] Raw Request Data:", $request->all());

        try {
            $bonDeCommande = BonDeCommande::findOrFail($id);
        } catch (ModelNotFoundException $e) {
            Log::warning("[BC UPDATE] Bon de commande not found for ID: {$id}");
            return response()->json(['failed' => 'Bon de commande non trouvé pour modification.'], 404);
        }

        $validator = Validator::make($request->all(), [
            'numero_bc' => ['required', 'string', 'max:50', Rule::unique('bon_de_commande', 'numero_bc')->ignore($bonDeCommande->id)],
            'date_emission' => 'required|date_format:Y-m-d', // Ensure frontend sends YYYY-MM-DD
            'objet' => 'required|string',
            'montant_total' => 'required|numeric|min:0',
            'fournisseur_nom' => 'required|string|max:255',
            'mode_paiement' => 'nullable|string|max:50',
            'id_fonctionnaire'=>'nullable|string', // Semicolon-separated string of IDs
            'etat' => ['nullable', Rule::in(['en préparation', 'validé', 'envoyé', 'reçu', 'annulé'])],
            'marche_id' => 'nullable|integer|exists:marche_public,id',
            'contrat_id' => 'nullable|integer|exists:contrat_droit_commun,id',
            'fichiers' => 'nullable|array', // For new files
            'fichiers.*' => 'file|mimes:pdf,doc,docx,xls,xlsx,jpg,jpeg,png|max:10240',
            'fichiers_a_supprimer' => 'nullable', // Can be array or JSON string of IDs
            // If 'fichiers_a_supprimer' is an array from form data (e.g. fichiers_a_supprimer[]=1),
            // then 'fichiers_a_supprimer.*' => 'integer|exists:fichier_bon_commande_et_contrat,id' would be good.
            // If it's a JSON string, we validate after decoding.
            'delete_fichier_joint' => 'nullable|boolean', // For single existing file deletion scenario
        ]);

        if ($validator->fails()) {
            Log::warning("[BC UPDATE] Validation failed for ID {$id}:", $validator->errors()->toArray());
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $validatedData = $validator->validated();
        Log::info("[BC UPDATE] Validation passed for ID {$id}.");
        Log::debug("[BC UPDATE] Validated Data:", $validatedData);


        DB::beginTransaction();
        try {
            // Prepare data for BonDeCommande update (excluding file arrays and special flags)
            $bcDataToUpdate = Arr::except($validatedData, ['fichiers', 'fichiers_a_supprimer', 'delete_fichier_joint']);

            // Handle nullable fields: if not present in $validatedData (because they were empty string from form),
            // they won't be in $bcDataToUpdate. Eloquent update will ignore them, preserving existing DB value.
            // If you want to explicitly set them to NULL if empty, you'd handle that here.
            // Example: $bcDataToUpdate['marche_id'] = $validatedData['marche_id'] ?? null;
            // However, 'nullable|integer' rule + ConvertEmptyStringsToNull middleware should handle this.

            Log::debug("[BC UPDATE] Data for BonDeCommande model update:", $bcDataToUpdate);
            $bonDeCommande->update($bcDataToUpdate);
            Log::info("[BC UPDATE] BonDeCommande main record updated for ID: {$id}.");


            // --- Handle DELETING existing files ---
            $filesToDeleteIdsInput = $request->input('fichiers_a_supprimer'); // This can be an array or JSON string
            Log::debug("[BC UPDATE] Received 'fichiers_a_supprimer' input:", ['raw_input' => $filesToDeleteIdsInput, 'type' => gettype($filesToDeleteIdsInput)]);

            $filesToDeleteIdsArray = [];
            if (is_string($filesToDeleteIdsInput)) {
                $decoded = json_decode($filesToDeleteIdsInput, true);
                if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                    $filesToDeleteIdsArray = $decoded;
                    Log::debug("[BC UPDATE] Decoded 'fichiers_a_supprimer' from JSON string to array:", $filesToDeleteIdsArray);
                } else {
                    Log::warning("[BC UPDATE] 'fichiers_a_supprimer' was a string but not valid JSON. Raw value:", ['value' => $filesToDeleteIdsInput]);
                    // If it might be a single ID as a string, you could try:
                    // if(is_numeric($filesToDeleteIdsInput)) $filesToDeleteIdsArray = [(int)$filesToDeleteIdsInput];
                }
            } elseif (is_array($filesToDeleteIdsInput)) {
                $filesToDeleteIdsArray = $filesToDeleteIdsInput;
                Log::debug("[BC UPDATE] 'fichiers_a_supprimer' was already an array:", $filesToDeleteIdsArray);
            }
            
            // Filter to ensure IDs are integers
            if (!empty($filesToDeleteIdsArray)) {
                $filesToDeleteIdsArray = array_filter(array_map('intval', $filesToDeleteIdsArray), fn($id) => $id > 0);
            }

            if (!empty($filesToDeleteIdsArray)) {
                Log::info("[BC UPDATE] Valid File IDs to delete:", $filesToDeleteIdsArray);
                $filesToDeleteRecords = FichierBonCommandeEtContrat::where('id_bc', $bonDeCommande->id)
                                                                 ->whereIn('id', $filesToDeleteIdsArray) // This is where the error occurred
                                                                 ->get();
                if ($filesToDeleteRecords->isNotEmpty()) {
                    Log::debug("[BC UPDATE] File records found in DB to delete:", $filesToDeleteRecords->pluck('id')->toArray());
                    foreach ($filesToDeleteRecords as $fileRecord) {
                        if ($fileRecord->chemin_fichier) {
                            Storage::disk('public')->delete($fileRecord->chemin_fichier);
                            Log::info("[BC UPDATE] Deleted physical file: {$fileRecord->chemin_fichier}");
                        }
                        $fileRecord->delete();
                        Log::info("[BC UPDATE] Deleted DB record for FichierBonCommandeEtContrat ID: {$fileRecord->id}");
                    }
                } else {
                    Log::warning("[BC UPDATE] No FichierBonCommandeEtContrat records found for the provided IDs to delete belonging to this BC.", ['ids_to_delete' => $filesToDeleteIdsArray]);
                }
            } elseif ($request->filled('fichiers_a_supprimer')) { // It was filled but resulted in empty array (e.g. "[]" or non-numeric)
                 Log::info("[BC UPDATE] 'fichiers_a_supprimer' was provided but resulted in no valid IDs to process.");
            }


            // Handle single file deletion flag (if your form uses this for a primary file)
            if ($request->input('delete_fichier_joint') === '1' || $request->input('delete_fichier_joint') === true) {
                $mainFile = $bonDeCommande->fichiers()->first(); // Example: assuming one primary file or specific logic
                if ($mainFile) {
                    Log::info("[BC UPDATE] Deleting main attached file due to 'delete_fichier_joint' flag. File ID: {$mainFile->id}");
                    if ($mainFile->chemin_fichier) {
                        Storage::disk('public')->delete($mainFile->chemin_fichier);
                    }
                    $mainFile->delete();
                }
            }

            // --- Handle ADDING new files ---
            if ($request->hasFile('fichiers')) {
                Log::info("[BC UPDATE] Processing new file uploads.");
                foreach ($request->file('fichiers') as $file) {
                    if ($file->isValid()) {
                        $originalName = $file->getClientOriginalName();
                        $path = $file->store('bc_files/' . $bonDeCommande->id, 'public');
                        Log::info("[BC UPDATE] Stored new file '{$originalName}' at '{$path}'");
                        FichierBonCommandeEtContrat::create([
                            'id_bc' => $bonDeCommande->id,
                            'id_cdc' => null,
                            'nom_fichier' => $originalName,
                            'chemin_fichier' => $path,
                            'type_fichier' => $file->getClientMimeType(),
                        ]);
                    } else {
                        Log::warning("[BC UPDATE] Received an invalid file upload.");
                    }
                }
            } else {
                Log::info("[BC UPDATE] No new files to upload.");
            }

            DB::commit();
            Log::info("[BC UPDATE] Transaction committed for ID: {$id}");

            $bonDeCommande->refresh()->load(['marche_public', 'contrat', 'fichiers']);
            Log::debug("[BC UPDATE] BonDeCommande after refresh:", $bonDeCommande->toArray());

            return response()->json([
                'success' => 'Bon de commande mis à jour avec succès',
                'bon_de_commande' => $bonDeCommande
            ], 200);

        } catch (Throwable $e) { // Catch Throwable for broader error catching
            DB::rollBack();
            Log::error("[BC UPDATE] Failed to update bon de commande ID {$id}: " . $e->getMessage(), [
                'exception_type' => get_class($e),
                'request_data' => $request->all(), // Log original request for context
                'trace_snippet' => substr($e->getTraceAsString(), 0, 500)
            ]);
            return response()->json([
                'failed' => 'Échec de la mise à jour du bon de commande.',
                'error_details' => config('app.debug') ? $e->getMessage() : 'Erreur interne du serveur.',
             ], 500);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id): JsonResponse
    {
        try {
            $bonDeCommande = BonDeCommande::findOrFail($id);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['failed' => 'Bon de commande non trouvé pour suppression.'], 404);
        }

        DB::beginTransaction();
        try {
            // Find and delete associated files first
            $fichiers = FichierBonCommandeEtContrat::where('id_bc', $bonDeCommande->id)->get();
            foreach ($fichiers as $fichier) {
                // Delete physical file from storage
                 if ($fichier->chemin_fichier) {
                    Storage::disk('public')->delete($fichier->chemin_fichier);
                 }
                // Delete file record from database
                $fichier->delete();
            }

            // Delete the Bon de Commande record
            $bonDeCommande->delete();

            DB::commit();
            return response()->json(['success' => 'Bon de commande et fichiers associés supprimés avec succès'], 200); // Or 204 No Content

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to delete bon de commande ID ' . $id . ': ' . $e->getMessage());
            return response()->json(['failed' => 'Échec de la suppression du bon de commande.'], 500);
        }
    }
}