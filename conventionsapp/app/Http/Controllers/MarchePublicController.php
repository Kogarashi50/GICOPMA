<?php

namespace App\Http\Controllers;

// Models
use App\Models\MarchePublic;
use App\Models\Lot;
use App\Models\FichierJoint;
use App\Models\Convention; // Make sure this is the correct Convention model if needed

// Facades and Classes
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\File; // Use File facade for directory/file operations
use Illuminate\Support\Str;         // For generating random strings, UUIDs etc.
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Support\Arr;
use Illuminate\Validation\ValidationException; // For specific exception handling
use Exception; // General Exception
use Throwable; // Catch broader errors

class MarchePublicController extends Controller
{
    // ASSUMPTION: Route-level middleware handles authorization

    /**
     * Display a listing of the resource.
     * GET /api/marches-publics
     * Modified to generate public URLs manually.
     */
    public function index(Request $request)
    {
        Log::info('Fetching Marchés Publics list (Direct Public Storage - Manual URL)...');
        try {
            $conventionRelationshipName = 'convention';
            $conventionTitleField = 'Intitule';
            $appelOffreRelationshipName = 'appelOffre';
            $appelOffreNumeroField = 'numero';

            $query = MarchePublic::with([
                'lots.fichiersJoints',
                'fichiersJointsGeneraux',
                "{$conventionRelationshipName}:id,{$conventionTitleField}",
                "{$appelOffreRelationshipName}:id,{$appelOffreNumeroField}"
            ]);

            // Sorting Logic (remains the same)
            $sortField = $request->query('sort', 'created_at');
            $sortDirection = $request->query('direction', 'desc');
            $allowedSorts = ['numero_marche', 'intitule', 'type_marche', 'statut', 'created_at', 'date_notification'];
            if (in_array($sortField, $allowedSorts)) {
                $query->orderBy($sortField, $sortDirection);
            } else { $query->orderBy('created_at', 'desc'); }

            // Searching Logic (remains the same)
            if ($search = $request->query('search')) {
                 $query->where(function($q) use ($search, $conventionRelationshipName, $appelOffreRelationshipName, $appelOffreNumeroField , $conventionTitleField) {
                    $q->where('numero_marche', 'like', "%{$search}%")
                      ->orWhere('intitule', 'like', "%{$search}%")
                      ->orWhere('attributaire', 'like', "%{$search}%");
                    $q->orWhereHas($conventionRelationshipName, function ($subQuery) use ($search, $conventionTitleField) { $subQuery->where($conventionTitleField, 'like', "%{$search}%"); });
                    $q->orWhereHas($appelOffreRelationshipName, function ($subQuery) use ($search, $appelOffreNumeroField) { $subQuery->where($appelOffreNumeroField, 'like', "%{$search}%"); });
                });
            }

            // Fetch Data
            $marches = $query->get();
            Log::info('Successfully fetched ' . $marches->count() . ' marchés publics.');

            // --- Add Public URLs Manually --- <<< MODIFIED HERE
            $appBaseUrl = rtrim(config('app.url', 'http://localhost:8000'), '/');
            $marches->each(function ($marche) use ($appBaseUrl) {
                 // General files
                 if ($marche->relationLoaded('fichiersJointsGeneraux')) {
                     $marche->fichiersJointsGeneraux->each(function($fichier) use ($appBaseUrl) {
                         $fichier->url = $fichier->chemin_fichier ? "{$appBaseUrl}/" . ltrim($fichier->chemin_fichier, '/') : null; // Manual URL
                     });
                 }
                 // Lot files
                  if ($marche->relationLoaded('lots')) {
                     $marche->lots->each(function($lot) use ($appBaseUrl) {
                         if($lot->relationLoaded('fichiersJoints')) {
                             $lot->fichiersJoints->each(function($fichier) use ($appBaseUrl) {
                                 $fichier->url = $fichier->chemin_fichier ? "{$appBaseUrl}/" . ltrim($fichier->chemin_fichier, '/') : null; // Manual URL
                             });
                         }
                     });
                  }
            });
            // --- End Add Public URLs ---

            return response()->json(['marches_publics' => $marches]);

        } catch (Exception $e) {
            Log::error("Error fetching Marchés Publics list: " . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return response()->json(['message' => 'Erreur serveur lors de la récupération des marchés.'], 500);
        }
    }


    /**
     * Store MarchePublic, related Lots, and Files (Lot & General) using direct public storage.
     * POST /api/marches-publics
     * URLs added manually to response.
     */
    public function store(Request $request)
    {
        Log::info('--- MarchePublic Store Request Received (Direct Public Storage - Manual URL) ---');
        // Validation remains the same...
        $validator = Validator::make($request->all(), [
            'numero_marche' => 'required|string|max:50|unique:marche_public,numero_marche',
            'intitule' => 'required|string',
            'type_marche' => ['required', Rule::in(['Travaux', 'Fournitures', 'Services','Etudes'])],
            'procedure_passation' => 'required|string|max:100',
            'mode_passation' => 'required|string|max:100',
            'budget_previsionnel' => 'nullable|numeric|min:0',
            'montant_attribue' => 'nullable|numeric|min:0',
            'source_financement' => 'nullable|string|max:255',
            'attributaire' => 'nullable|string',
            'date_publication' => 'nullable|date_format:Y-m-d',
            'date_limite_offres' => 'nullable|date_format:Y-m-d|after_or_equal:date_publication',
            'date_notification' => 'nullable|date_format:Y-m-d|after_or_equal:date_limite_offres',
            'date_debut_execution' => 'nullable|date_format:Y-m-d|after_or_equal:date_notification',
            'duree_marche' => 'nullable|integer|min:0',
            'statut' => ['nullable', Rule::in(['En préparation', 'En cours', 'Terminé', 'Résilié'])],
            'id_convention' => ['nullable', 'integer', Rule::exists('convention', 'id')],
            'ref_appelOffre' => ['nullable', 'integer', Rule::exists('appel_offre', 'id')],
            'date_ouverture_plis' => 'nullable|date_format:Y-m-d',
            'date_fin_ouverture' => 'nullable|date_format:Y-m-d',
            'avancement_physique' => 'nullable|numeric',
            'avancement_financier' => 'nullable|numeric',
            'date_engagement_tresorerie' => 'nullable|date_format:Y-m-d',
            'lots_data' => 'nullable|string',
            'lot_files' => 'nullable|array',
            'lot_files.*' => 'nullable|array',
            'lot_files.*.*' => ['nullable','file','mimes:pdf,doc,docx,xls,xlsx,jpg,jpeg,png,dwg,zip,rar','max:20480'],
            'general_files' => 'nullable|array',
            'general_files.*' => ['nullable','file','mimes:pdf,doc,docx,xls,xlsx,jpg,jpeg,png,dwg,zip,rar','max:20480'],
            'id_fonctionnaire' => 'nullable|string',
        ]);
        if ($validator->fails()) { /* ... handle validation error ... */ return response()->json(['message' => 'Erreurs de validation.', 'errors' => $validator->errors()], 422); }

        // Prepare Data & Decode JSON (remains the same)
        $marcheData = $request->except(['lots_data', 'lot_files', 'general_files', '_method']);
        $marcheData['statut'] = $request->input('statut', 'En préparation');
        $lotsInputData = [];
        $lotsString = $request->input('lots_data');
        if ($lotsString) { /* Decode JSON as before */
            $decodedLots = json_decode($lotsString, true);
            if (json_last_error() !== JSON_ERROR_NONE) { return response()->json(['message' => 'Erreurs de validation.', 'errors' => ['lots_data' => ['Format JSON invalide. (' . json_last_error_msg() . ')']]], 422); }
            if (!is_array($decodedLots)) { return response()->json(['message' => 'Erreurs de validation.', 'errors' => ['lots_data' => ['Les données des lots doivent être une liste (array).']]], 422); }
            $lotsInputData = $decodedLots;
        }

        $storedLotFilePathsRelative = [];
        $storedGeneralFilePathsRelative = [];

        DB::beginTransaction();
        try {
            // Create Marche Public (remains the same)
            $marche = MarchePublic::create($marcheData);

            // Create Lots and Attach Lot Files (remains the same)
            $uploadedLotFiles = $request->file('lot_files', []);
            foreach ($lotsInputData as $index => $lotInput) {
                // ... (lot creation logic is identical) ...
                if (Arr::first(Arr::only($lotInput, ['numero_lot', 'objet', 'montant_attribue', 'attributaire']), fn ($v) => $v !== null && $v !== '') !== null || isset($uploadedLotFiles[$index])) {
                    $newLot = $marche->lots()->create(Arr::only($lotInput, ['numero_lot', 'objet', 'montant_attribue', 'attributaire']));
                    if (isset($uploadedLotFiles[$index]) && is_array($uploadedLotFiles[$index])) {
                         $targetDirRelative = 'uploads/lots/' . $newLot->id;
                         $targetDirAbsolute = public_path($targetDirRelative);
                         if (!File::isDirectory($targetDirAbsolute)) File::makeDirectory($targetDirAbsolute, 0775, true, true);
                         if (!File::isWritable($targetDirAbsolute)) throw new Exception("Lot directory not writable: {$targetDirAbsolute}");
                         foreach ($uploadedLotFiles[$index] as $fileKey => $file) {
                            if ($file instanceof \Illuminate\Http\UploadedFile && $file->isValid()) {
                                // ... (file move and FichierJoint creation is identical) ...
                                $originalName = $file->getClientOriginalName(); $mimeType = $file->getClientMimeType() ?: 'application/octet-stream';
                                $safeOriginalName = preg_replace('/[^A-Za-z0-9\._-]/', '_', $originalName); $generatedFilename = date('Ymd-His') . '_' . Str::random(5) . '_' . $safeOriginalName;
                                $file->move($targetDirAbsolute, $generatedFilename);
                                $storedRelativePublicPath = $targetDirRelative . '/' . $generatedFilename;
                                $storedLotFilePathsRelative[] = $storedRelativePublicPath;
                                FichierJoint::create([ 'marche_id' => $marche->id, 'lot_id' => $newLot->id, 'nom_fichier' => $originalName, 'chemin_fichier' => $storedRelativePublicPath, 'type_fichier' => $mimeType ]);
                            }
                        }
                    }
                }
            }

            // Handle General File Uploads (remains the same)
            $uploadedGeneralFiles = $request->file('general_files', []);
            if (!empty($uploadedGeneralFiles)) {
                 $targetDirRelative = 'uploads/marches/' . $marche->id;
                 $targetDirAbsolute = public_path($targetDirRelative);
                 if (!File::isDirectory($targetDirAbsolute)) File::makeDirectory($targetDirAbsolute, 0775, true, true);
                 if (!File::isWritable($targetDirAbsolute)) throw new Exception("General Marche directory not writable: {$targetDirAbsolute}");
                 foreach ($uploadedGeneralFiles as $fileKey => $file) {
                    if ($file instanceof \Illuminate\Http\UploadedFile && $file->isValid()) {
                        // ... (file move and FichierJoint creation is identical) ...
                        $originalName = $file->getClientOriginalName(); $mimeType = $file->getClientMimeType() ?: 'application/octet-stream';
                        $safeOriginalName = preg_replace('/[^A-Za-z0-9\._-]/', '_', $originalName); $generatedFilename = date('Ymd-His') . '_' . Str::random(5) . '_' . $safeOriginalName;
                        $file->move($targetDirAbsolute, $generatedFilename);
                        $storedRelativePublicPath = $targetDirRelative . '/' . $generatedFilename;
                        $storedGeneralFilePathsRelative[] = $storedRelativePublicPath;
                        FichierJoint::create([ 'marche_id' => $marche->id, 'lot_id' => null, 'nom_fichier' => $originalName, 'chemin_fichier' => $storedRelativePublicPath, 'type_fichier' => $mimeType ]);
                    }
                 }
            }

            DB::commit();

            // Load relations for response
            $marche->load('lots.fichiersJoints', 'fichiersJointsGeneraux', 'convention', 'appelOffre');

            // --- Add Public URLs Manually to response --- <<< MODIFIED HERE
            $appBaseUrl = rtrim(config('app.url', 'http://localhost:8000'), '/');
             // Add URLs to the loaded Eloquent models *before* converting to array
             if ($marche->relationLoaded('fichiersJointsGeneraux')) {
                 $marche->fichiersJointsGeneraux->each(fn($f) => $f->url = $f->chemin_fichier ? "{$appBaseUrl}/" . ltrim($f->chemin_fichier, '/') : null);
             }
             if ($marche->relationLoaded('lots')) {
                 $marche->lots->each(function($lot) use ($appBaseUrl) {
                     if($lot->relationLoaded('fichiersJoints')) {
                         $lot->fichiersJoints->each(fn($f) => $f->url = $f->chemin_fichier ? "{$appBaseUrl}/" . ltrim($f->chemin_fichier, '/') : null);
                     }
                 });
             }
             $responseData = $marche->toArray(); // Now convert to array
             // --- End Add Public URLs ---

            return response()->json(['message' => 'Marché, lots et fichiers créés avec succès.', 'marche_public' => $responseData], 201);

        } catch (Throwable $e) {
             DB::rollBack();
             Log::error("Error creating Marche Public (Direct Public): " . $e->getMessage() . "\nTrace: " . $e->getTraceAsString());
             // Cleanup logic remains the same...
            $allStoredRelativePaths = array_unique(array_merge($storedLotFilePathsRelative, $storedGeneralFilePathsRelative));
            foreach ($allStoredRelativePaths as $relativePath) { /* ... cleanup ... */ }
            $statusCode = ($e instanceof ValidationException) ? 422 : 500;
            return response()->json(['message' => 'Erreur serveur lors de la création.', /* ... */ ], $statusCode);
        }
    }


    /**
     * Display the specified resource.
     * GET /api/marches-publics/{marches_public}
     * Modified to generate public URLs manually.
     */
    public function show(MarchePublic $marches_public)
    {
        Log::info("Fetching MarchePublic ID: {$marches_public->id} (Direct Public Storage - Manual URL)...");
        try {
             $marches_public->load(['lots.fichiersJoints', 'fichiersJointsGeneraux', 'convention', 'appelOffre']);

              // --- Add Public URLs Manually --- <<< MODIFIED HERE
             $appBaseUrl = rtrim(config('app.url', 'http://localhost:8000'), '/');
             // General files
             if ($marches_public->relationLoaded('fichiersJointsGeneraux')) {
                 $marches_public->fichiersJointsGeneraux->each(function($fichier) use ($appBaseUrl) {
                     $fichier->url = $fichier->chemin_fichier ? "{$appBaseUrl}/" . ltrim($fichier->chemin_fichier, '/') : null; // Manual URL
                 });
             }
             // Lot files
             if ($marches_public->relationLoaded('lots')) {
                 $marches_public->lots->each(function($lot) use ($appBaseUrl) {
                     if($lot->relationLoaded('fichiersJoints')) {
                         $lot->fichiersJoints->each(function($fichier) use ($appBaseUrl) {
                             $fichier->url = $fichier->chemin_fichier ? "{$appBaseUrl}/" . ltrim($fichier->chemin_fichier, '/') : null; // Manual URL
                         });
                     }
                 });
             }
             // --- End Add Public URLs ---

            return response()->json(['marche_public' => $marches_public]);
        } catch (Exception $e) {
             Log::error("Error fetching MarchePublic ID {$marches_public->id}: " . $e->getMessage());
             return response()->json(['message' => 'Erreur serveur.'], 500);
        }
    }


    /**
     * Update the specified resource in storage including lots and files (Lot & General) using direct public storage.
     * POST /api/marches-publics/{marches_public} (with _method=PUT)
     * URLs added manually to response.
     */
    public function update(Request $request, MarchePublic $marches_public)
    {
        Log::info("--- MarchePublic Update Request Received for ID: {$marches_public->id} (Direct Public Storage - Manual URL) ---");
        // Validation remains the same...
        $validator = Validator::make($request->all(), [ /* ... rules ... */ ]);
        if ($validator->fails()) { /* ... handle validation error ... */ return response()->json(['message' => 'Erreurs de validation.', 'errors' => $validator->errors()], 422); }

        // Prepare Data & Decode JSON (remains the same)
        $marcheData = $request->except(['lots_data', 'lot_files', 'general_files', '_method', 'general_fichiers_to_delete_ids']);
        $lotsInputData = []; /* Decode lots_data */
        $generalFilesToDeleteIds = []; /* Decode general_fichiers_to_delete_ids */
        // ... (decoding logic remains the same) ...

        $newlyCreatedFilePathsRelative = [];
        $pathsToDeletePhysicallyRelative = [];

        // Collect Files to Delete (remains the same)
        // ... (logic to populate $pathsToDeletePhysicallyRelative is identical) ...

        DB::beginTransaction();
        try {
            // Update Marche Public Data (remains the same)
            $marches_public->update($marcheData);

            // Handle Deletion of FichierJoint DB Records (remains the same)
            // ... (logic to delete based on $generalFilesToDeleteIds and lots_data['fichiers_to_delete'] is identical) ...

            // Sync Lots (Update/Create/Delete) (remains the same)
            // ... (logic to delete old lots, update existing, create new is identical) ...

            // Process NEW Lot File Uploads (remains the same)
            // ... (logic to move new lot files is identical) ...

            // Handle NEW General File Uploads (remains the same)
            // ... (logic to move new general files is identical) ...

            DB::commit();

            // Delete Queued OLD Physical Files AFTER Commit (remains the same)
            // ... (logic to delete files from $uniquePathsToDelete is identical) ...

            // Reload relations for response
            $marches_public->load('lots.fichiersJoints', 'fichiersJointsGeneraux', 'convention', 'appelOffre');

            // --- Add Public URLs Manually to response --- <<< MODIFIED HERE
             $appBaseUrl = rtrim(config('app.url', 'http://localhost:8000'), '/');
             // Add URLs to the loaded Eloquent models *before* converting to array
             if ($marches_public->relationLoaded('fichiersJointsGeneraux')) {
                 $marches_public->fichiersJointsGeneraux->each(fn($f) => $f->url = $f->chemin_fichier ? "{$appBaseUrl}/" . ltrim($f->chemin_fichier, '/') : null);
             }
             if ($marches_public->relationLoaded('lots')) {
                 $marches_public->lots->each(function($lot) use ($appBaseUrl) {
                     if($lot->relationLoaded('fichiersJoints')) {
                         $lot->fichiersJoints->each(fn($f) => $f->url = $f->chemin_fichier ? "{$appBaseUrl}/" . ltrim($f->chemin_fichier, '/') : null);
                     }
                 });
             }
             $responseData = $marches_public->toArray(); // Now convert to array
             // --- End Add Public URLs ---

            return response()->json(['message' => 'Marché, lots et fichiers mis à jour.', 'marche_public' => $responseData]);

        } catch (Throwable $e) {
            DB::rollBack();
            Log::error("Error updating Marche Public ID {$marches_public->id} (Direct Public): " . $e->getMessage() . "\nTrace: " . $e->getTraceAsString());
            // Cleanup logic remains the same...
            foreach ($newlyCreatedFilePathsRelative as $relativePath) { /* ... cleanup ... */ }
            $statusCode = ($e instanceof ValidationException) ? 422 : 500;
            return response()->json([ /* ... error response ... */ ], $statusCode);
        }
    }


    /**
     * Remove the specified resource from storage using direct public storage.
     * DELETE /api/marches-publics/{marches_public}
     * Corrected path collection.
     */
    public function destroy(MarchePublic $marches_public)
    {
        Log::info("--- MarchePublic Destroy Request Received for ID: {$marches_public->id} (Direct Public Storage) ---");
        $pathsToDeletePhysicallyRelative = [];

        DB::beginTransaction();
        try {
            // Collect all relative public file paths BEFORE deleting records
            Log::info("Collecting public file paths for deletion...");
            // Lot files
            foreach ($marches_public->lots as $lot) {
                foreach ($lot->fichiersJoints as $fichier) {
                    // --- Correction: Collect the relative path, not the asset URL ---
                    if ($fichier->chemin_fichier) $pathsToDeletePhysicallyRelative[] = $fichier->chemin_fichier;
                }
            }
            // General files (Query directly for safety)
            $generalFiles = FichierJoint::where('marche_id', $marches_public->id)->whereNull('lot_id')->pluck('chemin_fichier')->filter()->toArray();
            $pathsToDeletePhysicallyRelative = array_merge($pathsToDeletePhysicallyRelative, $generalFiles);

            $uniquePathsToDelete = array_unique($pathsToDeletePhysicallyRelative); // Contains relative paths like 'uploads/...'
            Log::info("Collected " . count($uniquePathsToDelete) . " unique relative public file paths to delete.");

            // Define directory paths (remains the same)
            $generalMarcheDirRelative = 'uploads/marches/' . $marches_public->id;
            $lotDirRelatives = $marches_public->lots()->pluck('id')->map(fn($id) => 'uploads/lots/' . $id)->toArray();

            // Delete MarchePublic record (remains the same)
            Log::info("Deleting MarchePublic record ID: {$marches_public->id}...");
            $deleted = $marches_public->delete();

            if ($deleted) {
                DB::commit();
                Log::info("Destroy transaction committed (Direct Public Storage).");

                // Delete files from PUBLIC storage AFTER successful commit (remains the same)
                Log::info("Attempting deletion of associated physical public files...");
                $deletedStorageCount = 0;
                foreach ($uniquePathsToDelete as $relativePath) { // Use the collected relative paths
                    $absolutePath = public_path($relativePath); // Get absolute path from relative path
                    try {
                        if ($relativePath && File::exists($absolutePath)) {
                            if (File::delete($absolutePath)) { $deletedStorageCount++; /* log success */ }
                            else { /* log failure */ }
                        } else { /* log not found */ }
                    } catch (Exception $storageEx) { /* log exception */ }
                }
                Log::info("Completed public storage deletion phase. Deleted {$deletedStorageCount} files.");

                // Attempt to delete EMPTY directories (remains the same)
                 foreach ($lotDirRelatives as $lotDirRel) { /* ... delete empty dir ... */ }
                 $generalMarcheDirAbs = public_path($generalMarcheDirRelative); /* ... delete empty dir ... */

                return response()->json(['message' => 'Marché et fichiers associés supprimés avec succès.'], 200);
            } else {
                 DB::rollBack(); /* ... handle DB delete failure ... */
                 return response()->json(['message' => 'La suppression (DB) a échoué.'], 500);
            }
        } catch (Throwable $e) {
             DB::rollBack(); /* ... handle general error ... */
             return response()->json(['message' => 'Erreur serveur lors de la suppression.', /* ... */ ], 500);
        }
    }

} // End of Controller Class