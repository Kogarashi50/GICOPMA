<?php

namespace App\Http\Controllers;

// Models
use App\Models\MarchePublic;
use App\Models\Lot;
use App\Models\FichierJoint;
use App\Models\Convention; // Make sure this is the correct Convention model if needed
use App\Models\Projet;       // <-- 1. IMPORT PROJET
use App\Models\SousProjet; 
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
use Illuminate\Database\QueryException; 
use Exception; // General Exception
use Throwable; // Catch broader errors
use Illuminate\Http\JsonResponse;

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
                 'projectable' ,
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
     /**
     * Store MarchePublic, related Lots, and Files (Lot & General) using direct public storage.
     * POST /api/marches-publics
     * CORRECTED to handle general file metadata properly.
     */
    public function store(Request $request)
    {
        Log::info('--- MarchePublic Store Request Received (Direct Public Storage - Manual URL) ---');
        
        $validator = Validator::make($request->all(), [
            'numero_marche' => 'required|string|max:50|unique:marche_public,numero_marche',
            'intitule' => 'required|string',
            'type_marche' => ['required', 'string'],
            'procedure_passation' => 'required|string|max:100',
            'mode_passation' => 'required|string',
            'budget_previsionnel' => 'nullable|numeric|min:0',
            'montant_attribue' => 'nullable|numeric|min:0',
            'source_financement' => 'nullable|string|max:255',
            'attributaire' => 'nullable|string',
            'date_publication' => 'nullable|date_format:Y-m-d',
            'date_limite_offres' => 'nullable|date_format:Y-m-d|after_or_equal:date_publication',
            'date_notification' => 'nullable|date_format:Y-m-d|after_or_equal:date_limite_offres',
            'date_debut_execution' => 'nullable|date_format:Y-m-d|after_or_equal:date_notification',
            'duree_marche' => 'nullable|integer|min:0',
            'projectable' => ['nullable', 'string', 'regex:/^(projet|sous-projet)_[a-zA-Z0-9-]+$/'],
            'statut' => ['nullable', Rule::in(['En préparation', 'En cours', 'Terminé', 'Résilié'])],
            'id_convention' => ['nullable', 'integer', Rule::exists('conventions', 'id')], // Good practice to add exists rule
            'ref_appelOffre' => ['nullable', 'integer', Rule::exists('appel_offre', 'id')],
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

        if ($validator->fails()) {
            return response()->json(['message' => 'Erreurs de validation.', 'errors' => $validator->errors()], 422);
        }

        $marcheData = $request->except(['lots_data', 'lot_files', 'general_files', '_method', 'projectable']);
        $marcheData['statut'] = $request->input('statut', 'En préparation');
        $lotsInputData = [];
        $lotsString = $request->input('lots_data');
        if ($lotsString) {
            $decodedLots = json_decode($lotsString, true);
            if (json_last_error() !== JSON_ERROR_NONE) { return response()->json(['message' => 'Erreurs de validation.', 'errors' => ['lots_data' => ['Format JSON invalide.']]], 422); }
            if (!is_array($decodedLots)) { return response()->json(['message' => 'Erreurs de validation.', 'errors' => ['lots_data' => ['Les données des lots doivent être une liste (array).']]], 422); }
            $lotsInputData = $decodedLots;
        }

        $storedFilePathsRelative = [];

        DB::beginTransaction();
        try {
            if ($request->filled('projectable')) {
                [$type, $id] = explode('_', $request->input('projectable'));
                $modelClass = $type === 'projet' ? Projet::class : SousProjet::class;
                $marcheData['projectable_type'] = $modelClass;
                $marcheData['projectable_id'] = $id;
            }
            $marche = MarchePublic::create($marcheData);

            // Create Lots and Attach Lot Files
            $uploadedLotFiles = $request->file('lot_files', []);
            foreach ($lotsInputData as $index => $lotInput) {
                if (Arr::first(Arr::only($lotInput, ['numero_lot', 'objet', 'montant_attribue', 'attributaire']), fn ($v) => $v !== null && $v !== '') !== null || isset($uploadedLotFiles[$index])) {
                    $newLot = $marche->lots()->create(Arr::only($lotInput, ['numero_lot', 'objet', 'montant_attribue', 'attributaire']));
                    if (isset($uploadedLotFiles[$index]) && is_array($uploadedLotFiles[$index])) {
                         $targetDirRelative = 'uploads/lots/' . $newLot->id;
                         $targetDirAbsolute = public_path($targetDirRelative);
                         File::makeDirectory($targetDirAbsolute, 0775, true, true);
                         
                         foreach ($uploadedLotFiles[$index] as $fileKey => $file) {
                            if ($file instanceof \Illuminate\Http\UploadedFile && $file->isValid()) {
                                $originalName = $file->getClientOriginalName();
                                $safeOriginalName = preg_replace('/[^A-Za-z0-9\._-]/', '_', $originalName);
                                $generatedFilename = date('Ymd-His') . '_' . Str::random(5) . '_' . $safeOriginalName;
                                $file->move($targetDirAbsolute, $generatedFilename);
                                $storedRelativePublicPath = $targetDirRelative . '/' . $generatedFilename;
                                $storedFilePathsRelative[] = $storedRelativePublicPath;

                                FichierJoint::create([
                                    'marche_id' => $marche->id,
                                    'lot_id' => $newLot->id,
                                    'nom_fichier' => $originalName,
                                    'intitule' => $request->input("intitule_lot.{$index}.{$fileKey}", $originalName),
                                    'categorie' => $request->input("categorie_lot.{$index}.{$fileKey}", 'autre'),
                                    'chemin_fichier' => $storedRelativePublicPath,
                                    'type_fichier' => $file->getClientMimeType() ?: 'application/octet-stream'
                                ]);
                            }
                        }
                    }
                }
            }

            // Handle General File Uploads
            $uploadedGeneralFiles = $request->file('general_files', []);
            if (!empty($uploadedGeneralFiles)) {
                 $targetDirRelative = 'uploads/marches/' . $marche->id;
                 $targetDirAbsolute = public_path($targetDirRelative);
                 File::makeDirectory($targetDirAbsolute, 0775, true, true);
                 
                 foreach ($uploadedGeneralFiles as $fileKey => $file) {
                    if ($file instanceof \Illuminate\Http\UploadedFile && $file->isValid()) {
                        $originalName = $file->getClientOriginalName();
                        $safeOriginalName = preg_replace('/[^A-Za-z0-9\._-]/', '_', $originalName);
                        $generatedFilename = date('Ymd-His') . '_' . Str::random(5) . '_' . $safeOriginalName;
                        $file->move($targetDirAbsolute, $generatedFilename);
                        $storedRelativePublicPath = $targetDirRelative . '/' . $generatedFilename;
                        $storedFilePathsRelative[] = $storedRelativePublicPath;

                        // --- THIS BLOCK IS NOW CORRECTED ---
                        FichierJoint::create([
                            'marche_id' => $marche->id,
                            'lot_id' => null,
                            'nom_fichier' => $originalName,
                            'intitule' => $request->input("intitule_general.{$fileKey}", $originalName),
                            'categorie' => $request->input("categorie_general.{$fileKey}", 'autre'),
                            'chemin_fichier' => $storedRelativePublicPath,
                            'type_fichier' => $file->getClientMimeType() ?: 'application/octet-stream'
                        ]);
                    }
                 }
            }

            DB::commit();

            $marche->load('lots.fichiersJoints', 'fichiersJointsGeneraux', 'convention', 'appelOffre', 'projectable');
            
            // Add URLs manually for the response
            $appBaseUrl = rtrim(config('app.url', 'http://localhost:8000'), '/');
            $marche->fichiersJointsGeneraux->each(fn($f) => $f->url = $f->chemin_fichier ? "{$appBaseUrl}/" . ltrim($f->chemin_fichier, '/') : null);
            $marche->lots->each(function($lot) use ($appBaseUrl) {
                $lot->fichiersJoints->each(fn($f) => $f->url = $f->chemin_fichier ? "{$appBaseUrl}/" . ltrim($f->chemin_fichier, '/') : null);
            });

            return response()->json(['message' => 'Marché, lots et fichiers créés avec succès.', 'marche_public' => $marche], 201);

        } catch (Throwable $e) {
             DB::rollBack();
             Log::error("Error creating Marche Public: " . $e->getMessage() . "\nTrace: " . $e->getTraceAsString());
             
             // Cleanup any files that were physically created before the crash
             foreach ($storedFilePathsRelative as $relativePath) {
                $absolutePath = public_path($relativePath);
                if (File::exists($absolutePath)) {
                    File::delete($absolutePath);
                }
             }
            
             return response()->json(['message' => 'Erreur serveur lors de la création.'], 500);
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
             $marches_public->load(['lots.fichiersJoints', 'fichiersJointsGeneraux', 'convention', 'appelOffre', 
                'projectable']);

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
        Log::info("--- MarchePublic Update Request Received for ID: {$marches_public->id} (Direct Public Storage - Manual URL - FIXED) ---");
        Log::debug('Update Request - Raw Data:', $request->all()); // Log raw data first

        // --- Validation Rules ---
        $validationRules = [
            'numero_marche' => ['required','string','max:50', Rule::unique('marche_public','numero_marche')->ignore($marches_public->id)],
            'intitule' => 'required|string',
            'type_marche' => ['required'],
            'procedure_passation' => 'nullable|string|max:100', // Make required if needed
            'mode_passation' => 'nullable|string', // Make required if needed
            'budget_previsionnel' => 'nullable|numeric|min:0',
            'projectable' => ['nullable', 'string', 'regex:/^(projet|sous-projet)_[a-zA-Z0-9-]+$/'],
            'montant_attribue' => 'nullable|numeric|min:0',
            'source_financement' => 'nullable|string|max:255',
            'attributaire' => 'nullable|string',
            'date_publication' => 'nullable|date_format:Y-m-d',
            'date_limite_offres' => 'nullable|date_format:Y-m-d|after_or_equal:date_publication',
            'date_notification' => 'nullable|date_format:Y-m-d|after_or_equal:date_limite_offres',
            'date_debut_execution' => 'nullable|date_format:Y-m-d|after_or_equal:date_notification',
            'duree_marche' => 'nullable|integer|min:0',
            'statut' => ['nullable', Rule::in(['En préparation', 'En cours', 'Terminé', 'Résilié'])],
            'id_convention' => ['nullable', 'integer'],
            'ref_appelOffre' => ['nullable', 'integer', Rule::exists('appel_offre', 'id')],
            'avancement_physique' => 'nullable|numeric|min:0|max:100',
            'avancement_financier' => 'nullable|numeric|min:0|max:100',
            'date_engagement_tresorerie' => 'nullable|date_format:Y-m-d',
            'lots_data' => 'nullable|string',
            'lot_files' => 'nullable|array',
            'lot_files.*' => 'nullable|array', // Array for each lot index
            'lot_files.*.*' => ['nullable','file','mimes:pdf,doc,docx,xls,xlsx,jpg,jpeg,png,dwg,zip,rar','max:20480'], // Files within each lot index
            'general_files' => 'nullable|array',
            'general_files.*' => ['nullable','file','mimes:pdf,doc,docx,xls,xlsx,jpg,jpeg,png,dwg,zip,rar','max:20480'],
            'general_fichiers_to_delete_ids' => 'nullable|string',
            'id_fonctionnaire' => 'nullable|string',
        ];
        $validator = Validator::make($request->all(), $validationRules);
        if ($validator->fails()) {
             Log::error("Update validation failed (Laravel) for ID {$marches_public->id}:", $validator->errors()->toArray());
             return response()->json(['message' => 'Erreurs de validation.', 'errors' => $validator->errors()], 422);
        }
        Log::info("Update validation passed (Laravel) for ID: {$marches_public->id}");
        $validatedData = $validator->validated(); // Use validated data

        // --- Prepare Data & Decode JSON ---
        $marcheUpdateData = Arr::except($validatedData, [
            'lots_data', 'lot_files', 'general_files',
            'general_fichiers_to_delete_ids', '_method',
            'projectable'  // _method is handled by Laravel routing
        ]);
        Log::debug('Update Request - Marche Data Prepared:', $marcheUpdateData);

        // Decode lots_data
        $lotsInputData = [];
        $lotsString = $validatedData['lots_data'] ?? null; // Use validated data
        if ($lotsString) {
            $decodedLots = json_decode($lotsString, true);
            if (json_last_error() !== JSON_ERROR_NONE) { Log::error('Update Request - Invalid JSON for lots_data.'); return response()->json(['message'=>'Erreurs de validation.', 'errors'=>['lots_data'=>['Format JSON invalide.']]], 422); }
            if (!is_array($decodedLots)) { Log::error('Update Request - Decoded lots_data is not an array.'); return response()->json(['message'=>'Erreurs de validation.', 'errors'=>['lots_data'=>['Doit être une liste.']]], 422); }
            $lotsInputData = $decodedLots;
            Log::debug('Update Request - Decoded lots_data:', ['count' => count($lotsInputData)]);
        }

        // Decode general_fichiers_to_delete_ids
        $generalFilesToDeleteIds = [];
        $generalFilesToDeleteIdsJson = $validatedData['general_fichiers_to_delete_ids'] ?? null; // Use validated data
        if ($generalFilesToDeleteIdsJson) {
            $decodedIds = json_decode($generalFilesToDeleteIdsJson, true);
            if (json_last_error() !== JSON_ERROR_NONE) { Log::error('Update Request - Invalid JSON for general_fichiers_to_delete_ids.'); return response()->json(['message'=>'Erreurs de validation.', 'errors'=>['general_fichiers_to_delete_ids'=>['Format JSON invalide.']]], 422); }
            if (!is_array($decodedIds)) { Log::error('Update Request - Decoded general_fichiers_to_delete_ids is not an array.'); return response()->json(['message'=>'Erreurs de validation.', 'errors'=>['general_fichiers_to_delete_ids'=>['Doit être une liste d\'IDs.']]], 422); }
            $generalFilesToDeleteIds = $decodedIds;
            Log::debug('Update Request - Decoded general_fichiers_to_delete_ids:', $generalFilesToDeleteIds);
        }

        // --- Tracking Arrays ---
        $newlyCreatedFilePathsRelative = []; // Track NEW relative paths for rollback
        $pathsToDeletePhysicallyRelative = []; // Track OLD relative paths for deletion on commit

        // --- Collect Paths of Files Marked for Deletion (BEFORE Transaction) ---
         Log::debug('Update Request - Collecting file paths marked for deletion...');
         $fichierJointIdsToDelete = []; // Collect DB IDs too

         // General Files marked by ID
         if (!empty($generalFilesToDeleteIds)) {
             $generalFilesToDelete = FichierJoint::where('marche_id', $marches_public->id) ->whereNull('lot_id') ->whereIn('id', $generalFilesToDeleteIds)->get(['id', 'chemin_fichier']);
             $pathsToDeletePhysicallyRelative = array_merge($pathsToDeletePhysicallyRelative, $generalFilesToDelete->pluck('chemin_fichier')->filter()->all());
             $fichierJointIdsToDelete = array_merge($fichierJointIdsToDelete, $generalFilesToDelete->pluck('id')->all());
         }

         // Lot Files marked by ID within lots_data
         $lotFileDeleteClauses = [];
         foreach ($lotsInputData as $lotData) {
             if (is_array($lotData) && !empty($lotData['id']) && !empty($lotData['fichiers_to_delete']) && is_array($lotData['fichiers_to_delete'])) {
                 $lotId = $lotData['id'];
                 $lotFilesToDeleteIds = $lotData['fichiers_to_delete'];
                 if (!empty($lotFilesToDeleteIds)) {
                     $lotFilesToDelete = FichierJoint::where('lot_id', $lotId)->whereIn('id', $lotFilesToDeleteIds)->get(['id', 'chemin_fichier']);
                     $pathsToDeletePhysicallyRelative = array_merge($pathsToDeletePhysicallyRelative, $lotFilesToDelete->pluck('chemin_fichier')->filter()->all());
                     $fichierJointIdsToDelete = array_merge($fichierJointIdsToDelete, $lotFilesToDelete->pluck('id')->all());
                 }
             }
         }
         // --- End Collect Marked Files ---


        DB::beginTransaction();
        Log::info("Update transaction started for ID: {$marches_public->id}");
        try {
             if ($request->filled('projectable')) {
                [$type, $id] = explode('_', $request->input('projectable'));
                $modelClass = $type === 'projet' ? Projet::class : SousProjet::class;
                $marcheUpdateData['projectable_type'] = $modelClass;
                $marcheUpdateData['projectable_id'] = $id;
            } else {
                // If the field is submitted but empty, unset the relationship
                $marcheUpdateData['projectable_type'] = null;
                $marcheUpdateData['projectable_id'] = null;
            }
            // --- Update Marche Public Data ---
            Log::debug('Update Request - Updating MarchePublic model...');
            $marches_public->update($marcheUpdateData); // Use filtered data
            Log::info("MarchePublic record updated.");

            // --- Handle Deletion of FichierJoint DB Records ---
            if (!empty($fichierJointIdsToDelete)) {
                 $uniqueIdsToDelete = array_unique($fichierJointIdsToDelete);
                 Log::debug('Update Request - Deleting FichierJoint DB records by ID:', $uniqueIdsToDelete);
                 $deletedDbCount = FichierJoint::whereIn('id', $uniqueIdsToDelete)->delete();
                 Log::info("Deleted {$deletedDbCount} FichierJoint DB records based on request IDs.");
            }

            // --- Sync Lots (Update/Create/Delete) ---
            Log::debug('Update Request - Syncing Lots...');
            $existingLotIds = $marches_public->lots()->pluck('id')->toArray();
            $inputLotDataById = collect($lotsInputData)->keyBy('id'); // Key by existing ID for easier lookup
            $inputLotIds = $inputLotDataById->keys()->filter()->toArray(); // Get IDs provided in input

            // 1. Lots to Delete
            $lotsToDeleteIds = array_diff($existingLotIds, $inputLotIds);
            if (!empty($lotsToDeleteIds)) {
                Log::info("Lots to delete (not in input):", $lotsToDeleteIds);
                // *** IMPORTANT: Collect paths of files associated with these DELETED lots ***
                $filesFromDeletedLots = FichierJoint::whereIn('lot_id', $lotsToDeleteIds)->pluck('chemin_fichier')->filter()->toArray();
                $pathsToDeletePhysicallyRelative = array_merge($pathsToDeletePhysicallyRelative, $filesFromDeletedLots);
                Log::debug("Added paths from deleted lots for physical deletion:", $filesFromDeletedLots);

                // Now delete the Lot records (assuming FichierJoint cascade delete is set up, otherwise delete FichierJoints first)
                // If no cascade: FichierJoint::whereIn('lot_id', $lotsToDeleteIds)->delete();
                $deletedLotCount = Lot::whereIn('id', $lotsToDeleteIds)->delete();
                Log::info("Deleted {$deletedLotCount} Lot records no longer present in input.");
            }

            // 2. Update Existing / Create New Lots
            $uploadedLotFiles = $request->file('lot_files', []); // Get uploaded files keyed by index
            Log::debug('Update Request - Uploaded Lot Files structure:', array_keys($uploadedLotFiles)); // See keys

            foreach ($lotsInputData as $index => $lotData) { // Iterate using original index
                if (!is_array($lotData)) { Log::warning("Skipping invalid lot data at index {$index}."); continue; }

                $lotDataFiltered = Arr::only($lotData, ['numero_lot', 'objet', 'montant_attribue', 'attributaire']);
                $lotId = $lotData['id'] ?? null;
                $currentLot = null;

                if ($lotId && in_array($lotId, $existingLotIds)) {
                    // Update Existing Lot
                    Log::debug("Updating existing Lot ID {$lotId} at index {$index}...");
                    $currentLot = Lot::find($lotId); // Assumes lot exists because we checked existingLotIds
                    if ($currentLot) {
                        $currentLot->update($lotDataFiltered);
                        Log::info("Updated Lot ID: {$currentLot->id}");
                    } else { Log::error("Consistency error: Lot ID {$lotId} not found despite being in existingLotIds."); continue; }
                } else {
                    // Create New Lot (only if it has data OR new files for its index)
                    if (Arr::first($lotDataFiltered, fn($v) => $v !== null && $v !== '') !== null || isset($uploadedLotFiles[$index])) {
                        Log::debug("Creating new Lot from data at index {$index}...");
                        $currentLot = $marches_public->lots()->create($lotDataFiltered);
                        Log::info("Created new Lot ID: {$currentLot->id}");
                    } else {
                        Log::debug("Skipping creation of empty new Lot at index {$index}.");
                        continue; // Skip to next lot in input
                    }
                }

                // --- Process NEW Lot File Uploads for this specific lot (using original index) ---
                if ($currentLot && isset($uploadedLotFiles[$index]) && is_array($uploadedLotFiles[$index])) {
                     Log::info("Processing NEW files for Lot ID {$currentLot->id} from input index {$index}");
                     $targetDirRelative = 'uploads/lots/' . $currentLot->id;
                     $targetDirAbsolute = public_path($targetDirRelative);
                     // Ensure directory exists
                     if (!File::isDirectory($targetDirAbsolute)) { if (!File::makeDirectory($targetDirAbsolute, 0775, true, true)) throw new Exception("Cannot create lot directory update: {$targetDirAbsolute}"); }
                     if (!File::isWritable($targetDirAbsolute)) throw new Exception("Lot directory update not writable: {$targetDirAbsolute}");

                     foreach ($uploadedLotFiles[$index] as $fileKey => $file) {
                         if ($file instanceof \Illuminate\Http\UploadedFile && $file->isValid()) {
                             $originalName = $file->getClientOriginalName(); $mimeType = $file->getClientMimeType() ?: 'application/octet-stream';
                             $safeOriginalName = preg_replace('/[^A-Za-z0-9\._-]/', '_', $originalName); $generatedFilename = date('Ymd-His') . '_' . Str::random(5) . '_' . $safeOriginalName;
                             Log::debug("Moving NEW lot file '{$originalName}' to '{$targetDirAbsolute}/{$generatedFilename}'");
                             try {
                                 $file->move($targetDirAbsolute, $generatedFilename); // MOVE to public path
                                 $storedRelativePublicPath = $targetDirRelative . '/' . $generatedFilename;
                                 $newlyCreatedFilePathsRelative[] = $storedRelativePublicPath; // Track for rollback
                                 Log::info("New lot file moved to public: {$storedRelativePublicPath}");
                                 // Create DB record for the new file
                                 FichierJoint::create([
                                     'marche_id' => $marches_public->id, 'lot_id' => $currentLot->id,
                                     'nom_fichier' => $originalName, 'chemin_fichier' => $storedRelativePublicPath,
                                     'intitule' => $request->input("intitule_lot.{$index}.{$fileKey}", $originalName),
                                     'categorie' => $request->input("categorie_lot.{$index}.{$fileKey}", 'autre'),
                                     'type_fichier' => $mimeType,
                                 ]);
                                  Log::info("Created FichierJoint DB record for new lot file.");
                             } catch (\Symfony\Component\HttpFoundation\File\Exception\FileException $e) {
                                  Log::error("Failed move() for new lot file '{$originalName}' (update): " . $e->getMessage());
                                  throw new Exception("Failed move new lot file '{$originalName}'. Check permissions.");
                              }
                         } else { Log::warning("Invalid NEW lot file received for update at index {$index}, key {$fileKey}."); }
                     }
                } else {
                     Log::debug("No NEW files found for Lot ID {$currentLot->id} at input index {$index}.");
                }
                // --- End Process NEW Lot Files ---

            } // End foreach lotsInputData
            Log::debug('Update Request - Finished Lot Sync.');

            // --- Handle NEW General File Uploads ---
            Log::debug('Update Request - Processing NEW General Files...');
            $uploadedGeneralFiles = $request->file('general_files', []); // Get general files
            Log::debug('Update Request - $uploadedGeneralFiles content check:', [ // Pass an array as the second argument
                'is_array' => is_array($uploadedGeneralFiles),
                'count_or_type' => is_array($uploadedGeneralFiles) ? count($uploadedGeneralFiles) : gettype($uploadedGeneralFiles) // Value associated with a key
            ]);
            if (!empty($uploadedGeneralFiles) && is_array($uploadedGeneralFiles)) {
                 Log::info("Found " . count($uploadedGeneralFiles) . " NEW general files to process.");
                 $targetDirRelative = 'uploads/marches/' . $marches_public->id;
                 $targetDirAbsolute = public_path($targetDirRelative);
                 // Ensure directory exists
                 if (!File::isDirectory($targetDirAbsolute)) { if (!File::makeDirectory($targetDirAbsolute, 0775, true, true)) throw new Exception("Cannot create general dir update: {$targetDirAbsolute}"); }
                 if (!File::isWritable($targetDirAbsolute)) throw new Exception("General dir update not writable: {$targetDirAbsolute}");

                 foreach ($uploadedGeneralFiles as $fileKey => $file) {
                     if ($file instanceof \Illuminate\Http\UploadedFile && $file->isValid()) {
                          $originalName = $file->getClientOriginalName(); $mimeType = $file->getClientMimeType() ?: 'application/octet-stream';
                          $safeOriginalName = preg_replace('/[^A-Za-z0-9\._-]/', '_', $originalName); $generatedFilename = date('Ymd-His') . '_' . Str::random(5) . '_' . $safeOriginalName;
                          Log::debug("Moving NEW general file '{$originalName}' to '{$targetDirAbsolute}/{$generatedFilename}'");
                         try {
                             $file->move($targetDirAbsolute, $generatedFilename); // MOVE to public path
                             $storedRelativePublicPath = $targetDirRelative . '/' . $generatedFilename;
                             $newlyCreatedFilePathsRelative[] = $storedRelativePublicPath; // Track for rollback
                             Log::info("New general file moved to public: {$storedRelativePublicPath}");
                             // Create DB record
                             FichierJoint::create([
                                 'marche_id' => $marches_public->id, 'lot_id' => null,
                                 'nom_fichier' => $originalName, 'chemin_fichier' => $storedRelativePublicPath,
                                 'intitule' => $request->input("intitule_general.{$fileKey}", $originalName),
                                 'categorie' => $request->input("categorie_general.{$fileKey}", 'autre'),
                                 'type_fichier' => $mimeType,
                             ]);
                              Log::info("Created FichierJoint DB record for new general file.");
                         } catch (\Symfony\Component\HttpFoundation\File\Exception\FileException $e) {
                              Log::error("Failed move() for new general file '{$originalName}' (update): " . $e->getMessage());
                              throw new Exception("Failed move new general file '{$originalName}'. Check permissions.");
                         }
                     } else { Log::warning("Invalid NEW general file received during update at key {$fileKey}."); }
                 }
            } else { Log::info("No NEW general files uploaded during update."); }
            // --- END NEW General File Handling ---

            DB::commit();
            Log::info("Update transaction committed successfully for ID: {$marches_public->id}");

            // --- Delete Queued OLD Physical Files AFTER Commit ---
            $uniquePathsToDelete = array_unique($pathsToDeletePhysicallyRelative); // Ensure uniqueness
            Log::debug("Attempting deletion of " . count($uniquePathsToDelete) . " OLD physical files from public storage:", $uniquePathsToDelete);
            foreach ($uniquePathsToDelete as $relativePath) {
                 if(empty($relativePath)) continue; // Skip empty paths
                $absolutePath = public_path($relativePath);
                try {
                    if (File::exists($absolutePath)) {
                        if (File::delete($absolutePath)) { Log::info("Deleted OLD public file: {$absolutePath}"); }
                        else { Log::error("File::delete failed for OLD public file: {$absolutePath}"); }
                    } else { Log::warning("OLD public file path not found or empty for deletion: '{$absolutePath}' from relative '{$relativePath}'"); }
                } catch (Exception $storageEx) { Log::error("Error deleting OLD public file: {$absolutePath}", ['exception' => $storageEx]); }
            }
            // --- End Delete OLD Files ---

            // --- Prepare & Return Response ---
            Log::debug('Update Request - Preparing success response...');
            $marches_public->load('lots.fichiersJoints', 'fichiersJointsGeneraux', 'convention', 'appelOffre'); // Reload fresh data
             $appBaseUrl = rtrim(config('app.url', 'http://localhost:8000'), '/');
             // Add URLs Manually before converting to array
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
             $responseData = $marches_public->toArray();

            return response()->json(['message' => 'Marché, lots et fichiers mis à jour.', 'marche_public' => $responseData]);

        } catch (Throwable $e) { // Catch Throwable
            DB::rollBack();
            Log::error("!!! CATCH BLOCK HIT in Update !!! Error updating Marche Public ID {$marches_public->id}: " . $e->getMessage(), [
                 'exception_type' => get_class($e),
                 'trace_snippet' => substr($e->getTraceAsString(), 0, 1000) // Log first part of trace
            ]);

            // Attempt cleanup of NEWLY created public files
            Log::info("Rolling back update transaction. Attempting cleanup of newly stored public files:", $newlyCreatedFilePathsRelative);
            foreach (array_unique($newlyCreatedFilePathsRelative) as $relativePath) { // Ensure unique paths
                 if(empty($relativePath)) continue;
                $absolutePath = public_path($relativePath);
                try {
                    if (File::exists($absolutePath)) {
                        if (File::delete($absolutePath)) { Log::info("Rollback cleanup: Deleted new public file {$absolutePath}"); }
                        else { Log::error("Rollback cleanup: File::delete failed for new public file {$absolutePath}"); }
                    }
                } catch (Exception $fsEx) { Log::error("Rollback cleanup: Failed to delete stored new public file: {$absolutePath}", ['exception' => $fsEx]); }
            }

            $statusCode = ($e instanceof ValidationException) ? 422 : 500;
            $userMessage = 'Erreur serveur lors de la mise à jour.';
            if ($e instanceof \Exception && str_contains($e->getMessage(), 'directory update not writable')) { $userMessage = "Erreur de permission lors de l'écriture du fichier."; } // Example specific message

            return response()->json([
                'message' => $userMessage,
                'error_details' => config('app.debug') ? $e->getMessage() : 'Détail non disponible.',
                'errors' => ($e instanceof ValidationException) ? $e->errors() : null
            ], $statusCode);
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
                    if ($fichier->chemin_fichier) $pathsToDeletePhysicallyRelative[] = $fichier->chemin_fichier;
                }
            }
            // General files (Query directly for safety)
            $generalFiles = FichierJoint::where('marche_id', $marches_public->id)->whereNull('lot_id')->pluck('chemin_fichier')->filter()->toArray();
            $pathsToDeletePhysicallyRelative = array_merge($pathsToDeletePhysicallyRelative, $generalFiles);

            $uniquePathsToDelete = array_unique($pathsToDeletePhysicallyRelative);
            Log::info("Collected " . count($uniquePathsToDelete) . " unique relative public file paths to delete.");

            // Define directory paths (remains the same)
            $generalMarcheDirRelative = 'uploads/marches/' . $marches_public->id; // Example
            $lotDirRelatives = $marches_public->lots()->pluck('id')->map(fn($id) => 'uploads/lots/' . $id)->toArray(); // Example

            Log::info("Attempting to delete MarchePublic record ID: {$marches_public->id} from database...");
            $deleted = $marches_public->delete(); // This is where the QueryException for #1451 can be thrown

            if ($deleted) {
                DB::commit();
                Log::info("Destroy transaction committed for MarchePublic ID {$marches_public->id}.");

                // Delete files from PUBLIC storage AFTER successful commit
                Log::info("Attempting deletion of associated physical public files...");
                $deletedStorageCount = 0;
                foreach ($uniquePathsToDelete as $relativePath) {
                    $absolutePath = public_path($relativePath);
                    try {
                        if ($relativePath && File::exists($absolutePath)) {
                            if (File::delete($absolutePath)) {
                                $deletedStorageCount++;
                                Log::info("Physical file deleted: {$absolutePath}");
                            } else {
                                Log::error("File::delete failed for physical file: {$absolutePath}");
                            }
                        } else {
                             Log::warning("Physical file not found or path empty for deletion: '{$absolutePath}'");
                        }
                    } catch (Exception $storageEx) {
                        Log::error("Exception deleting physical file {$absolutePath}: " . $storageEx->getMessage());
                    }
                }
                Log::info("Completed public storage deletion phase. Deleted {$deletedStorageCount} files.");

                // Attempt to delete EMPTY directories
                foreach ($lotDirRelatives as $lotDirRel) {
                    $lotDirAbs = public_path($lotDirRel);
                    if (File::isDirectory($lotDirAbs) && count(File::allFiles($lotDirAbs)) === 0) {
                        try { File::deleteDirectory($lotDirAbs); Log::info("Deleted empty lot directory: {$lotDirAbs}"); }
                        catch (Exception $dirEx) { Log::error("Error deleting empty lot directory {$lotDirAbs}: " . $dirEx->getMessage());}
                    }
                }
                $generalMarcheDirAbs = public_path($generalMarcheDirRelative);
                if (File::isDirectory($generalMarcheDirAbs) && count(File::allFiles($generalMarcheDirAbs)) === 0) {
                     try { File::deleteDirectory($generalMarcheDirAbs); Log::info("Deleted empty general marche directory: {$generalMarcheDirAbs}"); }
                     catch (Exception $dirEx) { Log::error("Error deleting empty general marche directory {$generalMarcheDirAbs}: " . $dirEx->getMessage());}
                }

                return response()->json(['message' => 'Marché et fichiers associés supprimés avec succès.'], 200);
            } else {
                 DB::rollBack();
                 Log::error("MarchePublic deletion (DB operation) returned false for ID: {$marches_public->id}. This usually indicates an issue before an exception, like a model event returning false.");
                 return response()->json(['message' => 'La suppression du marché public a échoué de manière inattendue.'], 500);
            }
        } catch (QueryException $e) { // <<< CATCH QueryException SPECIFICALLY
            DB::rollBack();
            Log::error("QueryException during MarchePublic deletion ID {$marches_public->id}: " . $e->getMessage(), ['sql_error_code' => $e->errorInfo[1] ?? null]);

            // Check for the specific foreign key constraint error code (MySQL)
            if (isset($e->errorInfo[1]) && $e->errorInfo[1] == 1451) {
                return response()->json([
                    'message' => 'Impossible de supprimer ce marché public car il est lié à des bons de commande. Veuillez d\'abord dissocier ou supprimer ces bons de commande.'
                ], 409); // 409 Conflict
            }

            // For other database query errors
            return response()->json([
                'message' => 'Erreur de base de données lors de la suppression du marché public.',
                'error_details' => config('app.debug') ? $e->getMessage() : 'Détail non disponible.'
            ], 500);

        } catch (Throwable $e) { // <<< General fallback catch
             DB::rollBack();
             Log::error("General Throwable during MarchePublic deletion ID {$marches_public->id}: " . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
             return response()->json([
                'message' => 'Erreur serveur lors de la tentative de suppression.',
                'error_details' => config('app.debug') ? $e->getMessage() : 'Détail non disponible.'
            ], 500);
        }
    }
    public function getOptions(Request $request): JsonResponse
    {
        Log::info("API: Fetching MarchePublic options for dropdown.");
        try {
            // You might want to order them or filter by status if needed
            // For now, let's get ID, numero_marche, and intitule
            $marches = MarchePublic::orderBy('numero_marche', 'asc') // Or by 'intitule' or 'created_at'
                                    ->get(['id', 'numero_marche', 'intitule']); // Assuming PK is 'id'

            $options = $marches->map(function ($marche) {
                // Construct a label. Prioritize numero_marche + intitule if both exist.
                $label = $marche->intitule; // Default to intitule
                if (!empty($marche->numero_marche) && !empty($marche->intitule)) {
                    $label = $marche->numero_marche . ' - ' . $marche->intitule;
                } elseif (empty($label) && !empty($marche->numero_marche)) { // Only numero_marche is available
                    $label = $marche->numero_marche;
                } elseif (empty($label)) { // Fallback if both are empty
                    $label = "Marché ID: {$marche->id}";
                }
                return ['value' => $marche->id, 'label' => $label];
            });

            return response()->json($options); // Directly return the array of options

        } catch (\Exception $e) {
            Log::error('Error fetching MarchePublic options: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return response()->json(['message' => 'Erreur serveur lors du chargement des options de marchés publics.'], 500);
        }
    }

} // End of Controller Class