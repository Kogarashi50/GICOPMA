<?php

namespace App\Http\Controllers;

// Models
use App\Models\ContratDroitCommun;
use App\Models\FichierBonCommandeEtContrat;

// Facades and Classes
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\File; // Use File facade for directory/file operations
// Removed: use Illuminate\Support\Facades\Storage; // No longer needed for storing/deleting public files
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Auth; // If using authentication
use Illuminate\Support\Str;
use Illuminate\Http\JsonResponse;
use Throwable;
use Illuminate\Database\Eloquent\ModelNotFoundException;

class ContratDroitCommunController extends Controller
{
    // *** Define path relative to the *public* directory root ***
    protected $filePathPrefix = 'uploads/contrats_cdc_files'; // Store under public/uploads/...

    /**
     * Add public URL to file records based on public path.
     */
    protected function addUrlToFichiers($fichiers): void // Return void as we modify in place
    {
        if (!$fichiers || !is_iterable($fichiers)) {
            return;
        }
        $appBaseUrl = rtrim(config('app.url', 'http://localhost:8000'), '/');
        foreach ($fichiers as $fichier) {
            if ($fichier && !empty($fichier->chemin_fichier)) {
                // Assumes chemin_fichier is stored relative to public root
                // e.g., uploads/contrats_cdc_files/file.pdf
                $fichier->url = $appBaseUrl . '/' . ltrim($fichier->chemin_fichier, '/');
            } else if ($fichier) {
                $fichier->url = null;
            }
        }
    }

    public function index(): JsonResponse
    {
        try {
            Log::info("Fetching list of Contrats Droit Commun (Direct Public Path)...");
            $contrats = ContratDroitCommun::with(['fichiers'])
                ->withCount(['bonsDeCommande', 'fichiers'])
                ->orderBy('date_signature', 'desc')
                ->get();

            $contrats->each(function ($contrat) {
                $this->addUrlToFichiers($contrat->fichiers); // Add URLs
            });

            Log::info("Successfully fetched Contrats Droit Commun list.");
            return response()->json(['contrats' => $contrats], 200);

        } catch (\Exception $e) {
            Log::error('Error fetching Contrats Droit Commun: ' . $e->getMessage());
            return response()->json(['message' => 'Erreur lors de la récupération des contrats.'], 500);
        }
    }

    public function store(Request $request): JsonResponse
    {
        Log::info("--- ContratCDC Store Request Received (Direct Public Path) ---");
        // --- Validation (Keep as is) ---
        $validator = Validator::make($request->all(), [
            'numero_contrat' => ['required', 'string', 'max:50', Rule::unique('contrat_droit_commun', 'numero_contrat')],
            'objet' => 'required|string',
            'fournisseur_nom' => 'required|string|max:255',
            'date_signature' => 'required|date_format:Y-m-d',
            'montant_total' => 'required|numeric|min:0',
            'duree_contrat' => 'nullable|string|max:100',
            'type_contrat' => 'nullable|string|max:100',
            'mode_paiement' => 'nullable|string|max:50',
            'observations' => 'nullable|string',
            'id_fonctionnaire' => 'nullable|string',
            'fichiers' => 'nullable|array',
            'fichiers.*' => 'nullable|file|mimes:pdf,doc,docx,xls,xlsx,jpg,png|max:10240',
        ], [ /* ... your messages ... */ ]);

        if ($validator->fails()) {
            Log::warning("Validation failed for store Contrat CDC: ", $validator->errors()->toArray());
            return response()->json(['message' => 'Erreurs de validation.', 'errors' => $validator->errors()], 422);
        }
        Log::info("Contrat CDC store validation passed.");

        DB::beginTransaction();
        try {
            $validatedData = $validator->validated();
            $filesToCleanupOnError = []; // Store ABSOLUTE paths for cleanup

            // Create Contrat (keep as is)
            $contrat = ContratDroitCommun::create([
                'numero_contrat' => $validatedData['numero_contrat'],
                'objet' => $validatedData['objet'],
                'fournisseur_nom' => $validatedData['fournisseur_nom'],
                'date_signature' => $validatedData['date_signature'],
                'montant_total' => $validatedData['montant_total'],
                'duree_contrat' => $validatedData['duree_contrat'] ?? null,
                'type_contrat' => $validatedData['type_contrat'] ?? null,
                'mode_paiement' => $validatedData['mode_paiement'] ?? null,
                'observations' => $validatedData['observations'] ?? null,
                'id_fonctionnaire' => $validatedData['id_fonctionnaire'] ?? null,
            ]);
            Log::info("Contrat CDC record created in DB.", ['id' => $contrat->id]);

            // *** MODIFIED File Handling ***
            if ($request->hasFile('fichiers')) {
                $targetDirAbsolute = public_path($this->filePathPrefix); // Absolute path in /public

                // Ensure directory exists
                 if (!File::isDirectory($targetDirAbsolute)) {
                     Log::info("Dossier public cible '{$targetDirAbsolute}' inexistant, création...");
                     if (!File::makeDirectory($targetDirAbsolute, 0775, true, true)) {
                         throw new \Exception("Impossible de créer le dossier de stockage public: {$targetDirAbsolute}");
                     }
                      Log::info("Dossier public cible créé.");
                 } elseif (!File::isWritable($targetDirAbsolute)) {
                      throw new \Exception("Permissions écriture manquantes pour dossier public: {$targetDirAbsolute}");
                 }

                Log::info("Processing uploaded files for Contrat CDC {$contrat->id} into public path...");
                foreach ($request->file('fichiers') as $index => $file) {
                    if ($file && $file->isValid()) {
                        $originalName = $file->getClientOriginalName();
                        $extension = $file->getClientOriginalExtension();
                        $uniqueName = uniqid('cdc_') . '_' . time() . '.' . $extension;

                        // Move the file to the *absolute* public path
                        $file->move($targetDirAbsolute, $uniqueName);
                        $absoluteFilePath = $targetDirAbsolute . DIRECTORY_SEPARATOR . $uniqueName; // Use DIRECTORY_SEPARATOR
                        $filesToCleanupOnError[] = $absoluteFilePath; // Store absolute path for potential cleanup

                        // Store the path *relative* to the public directory root
                        $relativePath = ltrim($this->filePathPrefix . '/' . $uniqueName, '/'); // Ensure consistent forward slash

                        FichierBonCommandeEtContrat::create([
                            'id_cdc' => $contrat->id,
                            'id_bc' => null,
                            'nom_fichier' => $originalName,
                            'chemin_fichier' => $relativePath, // Store relative public path
                            'type_fichier' => $file->getClientMimeType(),
                            'date_ajout' => now(),
                        ]);
                        Log::info("Stored file #{$index} for Contrat CDC {$contrat->id}.", ['relative_path' => $relativePath, 'original_name' => $originalName]);
                    } else {
                        Log::warning("Uploaded file #{$index} is invalid or missing for Contrat CDC {$contrat->id}.", ['original_name' => $file ? $file->getClientOriginalName() : 'N/A']);
                    }
                }
            }
            // *** END MODIFIED File Handling ***

            DB::commit();
            Log::info("Contrat CDC creation transaction committed.", ['id' => $contrat->id]);

            $contrat->load('fichiers');
            $this->addUrlToFichiers($contrat->fichiers); // Add URLs based on public path

            return response()->json([
                'message' => 'Contrat créé avec succès.',
                'contrat_droit_commun' => $contrat
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Error creating Contrat CDC: " . $e->getMessage(), ['trace' => $e->getTraceAsString()]);

            // --- Cleanup stored files on error using File facade and absolute paths ---
            if (!empty($filesToCleanupOnError)) {
                Log::warning("Rolling back transaction, cleaning up stored files from public path.", ['files' => $filesToCleanupOnError]);
                foreach ($filesToCleanupOnError as $filePath) {
                    try { if (File::exists($filePath)) File::delete($filePath); }
                    catch (\Exception $deleteEx) { Log::error("Failed to cleanup file during rollback: {$filePath}", ['exception' => $deleteEx]); }
                }
            }
            // ---

             if (str_contains(strtolower($e->getMessage()), 'duplicate entry')) {
                 return response()->json(['message' => 'Erreur: Le numéro de contrat existe déjà.'], 409);
             }
             if (str_contains($e->getMessage(), 'Impossible de créer le dossier') || str_contains($e->getMessage(), 'Permissions écriture manquantes')) {
                 return response()->json(['message' => $e->getMessage()], 500); // Use specific directory error
             }
            return response()->json(['message' => 'Erreur interne lors de la création du contrat.'], 500);
        }
    }

    public function show($id): JsonResponse
    {
        Log::info("Attempting to show Contrat CDC ID: {$id} (Direct Public Path)");
        try {
            $contratDroitCommun = ContratDroitCommun::with(['fichiers'])->findOrFail($id);
            $this->addUrlToFichiers($contratDroitCommun->fichiers); // Add URLs based on public path

            Log::info("Found and prepared Contrat CDC ID: {$id}");
            return response()->json(['contrat_droit_commun' => $contratDroitCommun]);

        } catch (ModelNotFoundException $e) {
            Log::warning("Contrat CDC not found for ID [show]: {$id}");
            return response()->json(['message' => 'Contrat non trouvé.'], 404);
        } catch (\Exception $e) {
            Log::error("Error fetching Contrat CDC ID {$id}: " . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return response()->json(['message' => 'Erreur lors du chargement du contrat.'], 500);
        }
    }

    public function update(Request $request, $id): JsonResponse
    {
        Log::info("Attempting to update Contrat CDC ID: {$id} (Direct Public Path)");
        try {
            $contratDroitCommun = ContratDroitCommun::findOrFail($id);
            Log::info("Found Contrat CDC for update, ID: {$id}");

            // --- Validation (Keep as is) ---
            $validator = Validator::make($request->all(), [
                'numero_contrat' => ['required', 'string', 'max:50', Rule::unique('contrat_droit_commun')->ignore($contratDroitCommun->id)],
                 'objet' => 'required|string',
                 'fournisseur_nom' => 'required|string|max:255',
                 'date_signature' => 'required|date_format:Y-m-d',
                 'montant_total' => 'required|numeric|min:0',
                 'duree_contrat' => 'nullable|string|max:100',
                 'type_contrat' => 'nullable|string|max:100',
                 'mode_paiement' => 'nullable|string|max:50',
                 'observations' => 'nullable|string',
                 'id_fonctionnaire' => 'nullable|string',
                 'fichiers' => 'nullable|array',
                 'fichiers.*' => 'nullable|sometimes|file|mimes:pdf,doc,docx,xls,xlsx,jpg,png|max:10240',
                 'fichiers_to_delete' => 'nullable|array',
                 'fichiers_to_delete.*' => ['integer', Rule::exists('fichier_bon_commande_et_contrat', 'id')->where('id_cdc', $id)],
            ], [ /* ... validation messages ... */ ]);

            if ($validator->fails()) {
                Log::warning("Validation failed for update Contrat CDC ID {$id}: ", $validator->errors()->toArray());
                return response()->json(['message' => 'Erreurs de validation.', 'errors' => $validator->errors()], 422);
            }
            Log::info("Contrat CDC update validation passed.", ['id' => $id]);

            DB::beginTransaction();
            try {
                $validatedData = $validator->validated();
                $filesToDeleteAfterCommit = []; // Store ABSOLUTE paths for physical deletion
                $filesToCleanupOnError = [];    // Store ABSOLUTE paths of NEW files for rollback

                // Update main data (keep as is)
                $contratDroitCommun->update(collect($validatedData)->except(['fichiers', 'fichiers_to_delete'])->toArray());
                Log::info("Updated Contrat CDC main data.", ['id' => $id]);

                // --- Handle File Deletions ---
                if (!empty($validatedData['fichiers_to_delete'])) {
                    Log::info("Processing files marked for deletion.", ['ids' => $validatedData['fichiers_to_delete']]);
                    $filesToDelete = FichierBonCommandeEtContrat::where('id_cdc', $contratDroitCommun->id)
                                        ->whereIn('id', $validatedData['fichiers_to_delete'])
                                        ->get();
                    foreach ($filesToDelete as $fileRecord) {
                        if ($fileRecord->chemin_fichier) {
                            $absolutePath = public_path($fileRecord->chemin_fichier); // Convert relative public path to absolute
                            if ($absolutePath && File::exists($absolutePath)) { // Check existence before adding
                                $filesToDeleteAfterCommit[] = $absolutePath;
                            } else {
                                Log::warning("File path for deletion not found or invalid: " . ($absolutePath ?? $fileRecord->chemin_fichier));
                            }
                        }
                        $fileRecord->delete();
                        Log::info("Deleted file record from DB.", ['file_record_id' => $fileRecord->id]);
                    }
                }

                // --- Handle New File Uploads (Modified) ---
                if ($request->hasFile('fichiers')) {
                     $targetDirAbsolute = public_path($this->filePathPrefix);
                     if (!File::isDirectory($targetDirAbsolute)) {
                         if (!File::makeDirectory($targetDirAbsolute, 0775, true, true)) { throw new \Exception("Impossible de créer le dossier de stockage public: {$targetDirAbsolute}"); }
                     } elseif (!File::isWritable($targetDirAbsolute)) {
                         throw new \Exception("Permissions écriture manquantes pour dossier public: {$targetDirAbsolute}");
                     }
                     Log::info("Processing new uploaded files for update...");
                    foreach ($request->file('fichiers') as $index => $file) {
                        if ($file && $file->isValid()) {
                            $originalName = $file->getClientOriginalName();
                            $extension = $file->getClientOriginalExtension();
                            $uniqueName = uniqid('cdc_') . '_' . time() . '.' . $extension;

                            // Move to absolute public path
                            $file->move($targetDirAbsolute, $uniqueName);
                            $absoluteFilePath = $targetDirAbsolute . DIRECTORY_SEPARATOR . $uniqueName;
                            $filesToCleanupOnError[] = $absoluteFilePath; // For rollback

                            // Store relative public path
                            $relativePath = ltrim($this->filePathPrefix . '/' . $uniqueName, '/');

                            FichierBonCommandeEtContrat::create([
                                'id_cdc' => $contratDroitCommun->id,
                                'id_bc' => null,
                                'nom_fichier' => $originalName,
                                'chemin_fichier' => $relativePath, // Store relative public path
                                'type_fichier' => $file->getClientMimeType(),
                                'date_ajout' => now(),
                            ]);
                             Log::info("Stored new file #{$index} for update.", ['relative_path' => $relativePath, 'original_name' => $originalName]);
                        } else {
                             Log::warning("Uploaded file #{$index} for update is invalid or missing.", ['original_name' => $file ? $file->getClientOriginalName() : 'N/A']);
                        }
                    }
                }
                // --- END MODIFIED File Handling ---

                DB::commit();
                Log::info("Successfully committed update transaction for Contrat CDC ID: {$id}");

                // --- Physically delete old files AFTER commit ---
                if (!empty($filesToDeleteAfterCommit)) {
                    Log::info("Performing physical deletion of marked files.", ['files' => $filesToDeleteAfterCommit]);
                    foreach ($filesToDeleteAfterCommit as $filePath) {
                        try { if (File::exists($filePath)) File::delete($filePath); }
                        catch (\Exception $deleteEx) { Log::error("Failed to delete file post-commit: {$filePath}", ['exception' => $deleteEx]); }
                    }
                }
                // ---

                $contratDroitCommun->load('fichiers');
                $this->addUrlToFichiers($contratDroitCommun->fichiers); // Add URLs

                return response()->json([
                    'message' => 'Contrat mis à jour avec succès.',
                    'contrat_droit_commun' => $contratDroitCommun
                ]);

            } catch (\Exception $e) {
                DB::rollBack();
                Log::error("Error during DB transaction for update Contrat CDC ID {$id}: " . $e->getMessage(), ['trace' => $e->getTraceAsString()]);

                // --- Cleanup newly uploaded files on transaction error ---
                if (!empty($filesToCleanupOnError)) {
                     Log::warning("Rolling back update transaction, cleaning up newly stored files.", ['files' => $filesToCleanupOnError]);
                     foreach ($filesToCleanupOnError as $filePath) {
                         try { if (File::exists($filePath)) File::delete($filePath); }
                         catch (\Exception $deleteEx) { Log::error("Failed to cleanup new file during update rollback: {$filePath}", ['exception' => $deleteEx]); }
                     }
                }
                // ---

                if (str_contains(strtolower($e->getMessage()), 'duplicate entry')) {
                     return response()->json(['message' => 'Erreur: Le numéro de contrat existe déjà pour un autre contrat.'], 409);
                 }
                 if (str_contains($e->getMessage(), 'Impossible de créer le dossier') || str_contains($e->getMessage(), 'Permissions écriture manquantes')) {
                     return response()->json(['message' => $e->getMessage()], 500);
                 }
                return response()->json(['message' => 'Erreur interne lors de la mise à jour.'], 500);
            }

        } catch (ModelNotFoundException $e) {
            Log::warning("Contrat CDC not found for update, ID: {$id}");
            return response()->json(['message' => 'Contrat non trouvé pour la mise à jour.'], 404);
        } catch (\Exception $e) {
             Log::error("Error preparing update for Contrat CDC ID {$id}: " . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
             return response()->json(['message' => 'Erreur interne.'], 500);
        }
    }


    public function destroy($id): JsonResponse
    {
        Log::info("Attempting to delete Contrat CDC ID: {$id} (Direct Public Path)");
        try {
            $contratDroitCommun = ContratDroitCommun::with('fichiers')->findOrFail($id);
            Log::info("Found Contrat CDC for deletion, ID: {$id}", ['file_count' => $contratDroitCommun->fichiers->count()]);

            // Get absolute paths for physical deletion later
            $absolutePathsToDelete = $contratDroitCommun->fichiers
                ->pluck('chemin_fichier')
                ->filter()
                ->map(fn($relativePath) => public_path($relativePath)) // Convert to absolute
                ->all();

            DB::beginTransaction();
            try {
                // Delete related file records first
                $contratDroitCommun->fichiers()->delete();
                Log::info("Deleted file records associated with Contrat CDC ID: {$id}");

                // Delete the Contrat itself
                $contratDroitCommun->delete();
                Log::info("Deleted Contrat CDC record from DB.", ['id' => $id]);

                DB::commit();
                Log::info("Successfully committed delete transaction for Contrat CDC ID: {$id}");

                // --- Physically delete files AFTER successful commit ---
                if (!empty($absolutePathsToDelete)) {
                    Log::info("Performing physical deletion of associated files.", ['files' => $absolutePathsToDelete]);
                    foreach ($absolutePathsToDelete as $filePath) {
                        try { if ($filePath && File::exists($filePath)) File::delete($filePath); } // Check path validity
                        catch (\Exception $deleteEx) { Log::error("Failed to delete file post-commit: {$filePath}", ['exception' => $deleteEx]); }
                    }
                }
                // ---

                return response()->json(['message' => 'Contrat et fichiers associés supprimés avec succès.']);

            } catch (\Exception $e) {
                DB::rollBack();
                Log::error("Error during DB transaction for delete Contrat CDC ID {$id}: " . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
                if (str_contains(strtolower($e->getMessage()), 'foreign key constraint')) {
                     return response()->json(['message' => 'Impossible de supprimer ce contrat car il est lié à d\'autres enregistrements (ex: Bons de Commande).'], 409);
                 }
                return response()->json(['message' => 'Erreur lors de la suppression du contrat.'], 500);
            }

        } catch (ModelNotFoundException $e) {
            Log::warning("Contrat CDC not found for deletion, ID: {$id}");
            return response()->json(['message' => 'Contrat non trouvé pour la suppression.'], 404);
        } catch (\Exception $e) {
             Log::error("Error preparing delete for Contrat CDC ID {$id}: " . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
             return response()->json(['message' => 'Erreur interne.'], 500);
        }
    }
}