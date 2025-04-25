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
     * Modified to generate public URLs.
     */
    public function index(Request $request)
    {
        Log::info('Fetching Marchés Publics list (Direct Public Storage)...');
        try {
            // Verify relationship names and fields for eager loading and searching
            $conventionRelationshipName = 'convention'; // CHECK: Method name in MarchePublic model linking to Convention
            $conventionTitleField = 'Intitule';       // CHECK: Actual title column name in 'conventions' table
            $appelOffreRelationshipName = 'appelOffre';
            $appelOffreNumeroField = 'numero';
            // Eager load required relationships, including files for URL generation
            $query = MarchePublic::with([
                'lots.fichiersJoints', // Files associated with lots
                'fichiersJointsGeneraux', // General files directly linked to Marche
                "{$conventionRelationshipName}:id,{$conventionTitleField}",
                "{$appelOffreRelationshipName}:id,{$appelOffreNumeroField}"  // Load convention ID and Title
            ]);

            // --- Sorting Logic ---
            $sortField = $request->query('sort', 'created_at');
            $sortDirection = $request->query('direction', 'desc');
            // CHECK: Ensure these columns exist on the 'marche_public' table
            $allowedSorts = ['numero_marche', 'intitule', 'type_marche', 'statut', 'created_at', 'date_notification'];
            if (in_array($sortField, $allowedSorts)) {
                $query->orderBy($sortField, $sortDirection);
            } else {
                 $query->orderBy('created_at', 'desc'); // Default sort
            }

            // --- Searching Logic ---
            if ($search = $request->query('search')) {
                $query->where(function($q) use ($search, $conventionRelationshipName, $appelOffreRelationshipName, // <-- Pass new variable
                $appelOffreNumeroField , $conventionTitleField) {
                    // CHECK: Ensure these columns exist on 'marche_public' table
                    $q->where('numero_marche', 'like', "%{$search}%")
                      ->orWhere('intitule', 'like', "%{$search}%")
                      ->orWhere('attributaire', 'like', "%{$search}%");

                    // Search related convention title using verified names
                    $q->orWhereHas($conventionRelationshipName, function ($subQuery) use ($search, $conventionTitleField) {
                        $subQuery->where($conventionTitleField, 'like', "%{$search}%"); // Uses checked field name
                    });
                    $q->orWhereHas($appelOffreRelationshipName, function ($subQuery) use ($search, $appelOffreNumeroField) {
                        $subQuery->where($appelOffreNumeroField, 'like', "%{$search}%"); // Uses checked field name
                    });
                });
            }

            // --- Fetch Data ---
            $marches = $query->get();
            Log::info('Successfully fetched ' . $marches->count() . ' marchés publics.');

            // --- Add Public URLs ---
            $appBaseUrl = rtrim(config('app.url', 'http://localhost:8000'), '/'); // Get base URL
            $marches->each(function ($marche) use ($appBaseUrl) {
                 // General files
                 if ($marche->relationLoaded('fichiersJointsGeneraux')) {
                     $marche->fichiersJointsGeneraux->each(function($fichier) use ($appBaseUrl) {
                         // Generate URL based on the stored relative public path
                         $fichier->url = $fichier->chemin_fichier;
                     });
                 }
                 // Lot files
                  if ($marche->relationLoaded('lots')) {
                     $marche->lots->each(function($lot) use ($appBaseUrl) {
                         if($lot->relationLoaded('fichiersJoints')) {
                             $lot->fichiersJoints->each(function($fichier) use ($appBaseUrl) {
                                 // Generate URL based on the stored relative public path
                                 $fichier->url = $fichier->chemin_fichier;
                             });
                         }
                     });
                  }
            });
            // --- End Add Public URLs ---

            return response()->json(['marches_publics' => $marches]);

        } catch (Exception $e) {
            Log::error("Error fetching Marchés Publics list: " . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['message' => 'Erreur serveur lors de la récupération des marchés.'], 500);
        }
    }


    /**
     * Store MarchePublic, related Lots, and Files (Lot & General) using direct public storage.
     * POST /api/marches-publics
     */
    public function store(Request $request)
    {
        Log::info('--- MarchePublic Store Request Received (Direct Public Storage) ---');
        Log::debug('Raw Request Keys:', array_keys($request->all()));
        Log::debug('Raw lots_data received:', ['type' => gettype($request->input('lots_data')), 'value' => $request->input('lots_data')]);
        Log::debug('Uploaded Lot Files Keys:', array_keys($request->file('lot_files', [])));
        Log::debug('Uploaded General Files Info:', ['count' => count($request->file('general_files', []))]);

        // --- Validation Rules ---
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
            'ref_appelOffre' => ['nullable', 'integer', Rule::exists('appel_offre', 'id')], // Ensures the ID exists in appel_offre table
            'date_ouverture_plis' => 'nullable|date_format:Y-m-d',
            'date_fin_ouverture' => 'nullable|date_format:Y-m-d', // Logical check
            'avancement_physique' => 'nullable|numeric', // Assuming percentage 0-100
            'avancement_financier' => 'nullable|numeric', // Assuming percentage 0-100
            'date_engagement_tresorerie' => 'nullable|date_format:Y-m-d', // CHECK Table and Column names
            'lots_data' => 'nullable|string', // Validate as string initially
            'lot_files' => 'nullable|array',
            'lot_files.*' => 'nullable|array',
            'lot_files.*.*' => ['nullable','file','mimes:pdf,doc,docx,xls,xlsx,jpg,jpeg,png,dwg,zip,rar','max:20480'], // 20MB example
            'general_files' => 'nullable|array',
            'general_files.*' => ['nullable','file','mimes:pdf,doc,docx,xls,xlsx,jpg,jpeg,png,dwg,zip,rar','max:20480'], // 20MB example
            'id_fonctionnaire' => 'nullable|string', // <<< ADDED BACK
        ]);

        if ($validator->fails()) {
            Log::error('Store validation failed (Laravel):', $validator->errors()->toArray());
            return response()->json(['message' => 'Erreurs de validation.', 'errors' => $validator->errors()], 422);
        }
        Log::info('Store validation passed.');

        // --- Prepare Data & Manual JSON Decode ---
        $marcheData = $request->except(['lots_data', 'lot_files', 'general_files', '_method']);
        // id_fonctionnaire is now included in $marcheData if it was validated successfully
        $marcheData['statut'] = $request->input('statut', 'En préparation'); // Default status

        $lotsInputData = [];
        $lotsString = $request->input('lots_data');
        if ($lotsString) {
            $decodedLots = json_decode($lotsString, true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                Log::error('Invalid JSON for lots_data (store).', ['error' => json_last_error_msg(), 'data' => $lotsString]);
                return response()->json(['message' => 'Erreurs de validation.', 'errors' => ['lots_data' => ['Format JSON invalide. (' . json_last_error_msg() . ')']]], 422);
            }
            if (!is_array($decodedLots)) {
                Log::error('Decoded lots_data is not an array (store).', ['type' => gettype($decodedLots)]);
                return response()->json(['message' => 'Erreurs de validation.', 'errors' => ['lots_data' => ['Les données des lots doivent être une liste (array).']]], 422);
            }
            $lotsInputData = $decodedLots;
            Log::debug('Successfully decoded lots_data (store)', ['count' => count($lotsInputData)]);
        } else {
            Log::debug('No lots_data string provided (store).');
        }

        $storedLotFilePathsRelative = []; // Track relative PUBLIC paths for potential rollback
        $storedGeneralFilePathsRelative = []; // Track relative PUBLIC paths for rollback

        DB::beginTransaction();
        Log::info('Store transaction started (Direct Public Storage).');
        try {
            // --- Create Marche Public ---
            Log::info('Creating MarchePublic record...');
            // $marcheData now includes id_fonctionnaire if provided and validated
            $marche = MarchePublic::create($marcheData);
            Log::info("MarchePublic created with ID: {$marche->id}");

            // --- Create Lots and Attach Lot Files ---
            Log::info('Processing lots for creation (Direct Public Storage)...');
            $uploadedLotFiles = $request->file('lot_files', []); // Get lot files

            foreach ($lotsInputData as $index => $lotInput) {
                if (!is_array($lotInput)) { Log::warning("Skipping non-array item in lotsInputData at index {$index}."); continue; }
                $lotDataToCreate = Arr::only($lotInput, ['numero_lot', 'objet', 'montant_attribue', 'attributaire']);

                // Create Lot if it has data OR if files were uploaded for its index
                if (Arr::first($lotDataToCreate, fn ($v) => $v !== null && $v !== '') !== null || isset($uploadedLotFiles[$index])) {
                    Log::info("Creating Lot from index: {$index}");
                    $newLot = $marche->lots()->create($lotDataToCreate);
                    Log::info("Created Lot with ID: {$newLot->id}");

                    // --- Process Lot Files (Store in Public) ---
                    if (isset($uploadedLotFiles[$index]) && is_array($uploadedLotFiles[$index])) {
                        Log::info("Processing new files for Lot ID: {$newLot->id} (Direct Public Storage)");
                        $targetDirRelative = 'uploads/lots/' . $newLot->id; // Relative to public_path()
                        $targetDirAbsolute = public_path($targetDirRelative);

                        // Ensure directory exists and is writable
                        if (!File::isDirectory($targetDirAbsolute)) {
                            Log::info("Lot directory '{$targetDirAbsolute}' creating...");
                            if (!File::makeDirectory($targetDirAbsolute, 0775, true, true)) throw new Exception("Cannot create lot directory: {$targetDirAbsolute}");
                        }
                        if (!File::isWritable($targetDirAbsolute)) throw new Exception("Lot directory not writable: {$targetDirAbsolute}");

                        foreach ($uploadedLotFiles[$index] as $fileKey => $file) {
                            if ($file instanceof \Illuminate\Http\UploadedFile && $file->isValid()) {
                                $originalName = $file->getClientOriginalName();
                                $mimeType = $file->getClientMimeType() ?: 'application/octet-stream';
                                $safeOriginalName = preg_replace('/[^A-Za-z0-9\._-]/', '_', $originalName);
                                $generatedFilename = date('Ymd-His') . '_' . Str::random(5) . '_' . $safeOriginalName;

                                Log::debug("Moving lot file '{$originalName}' to '{$targetDirAbsolute}/{$generatedFilename}'");
                                try {
                                    $file->move($targetDirAbsolute, $generatedFilename); // MOVE to public path
                                    $storedRelativePublicPath = $targetDirRelative . '/' . $generatedFilename; // Relative PUBLIC Path
                                    $storedLotFilePathsRelative[] = $storedRelativePublicPath; // Track for rollback
                                    Log::info("Lot file moved to public: {$storedRelativePublicPath}");

                                    FichierJoint::create([
                                        'marche_id' => $marche->id, 'lot_id' => $newLot->id,
                                        'nom_fichier' => $originalName, 'chemin_fichier' => $storedRelativePublicPath, // Store relative PUBLIC path
                                        'type_fichier' => $mimeType,
                                    ]);
                                    Log::info("Created FichierJoint DB record for lot file.");
                                } catch (\Symfony\Component\HttpFoundation\File\Exception\FileException $e) {
                                    Log::error("Failed move() for lot file '{$originalName}': " . $e->getMessage());
                                    throw new Exception("Failed to move lot file '{$originalName}'. Check permissions.");
                                }
                            } else { Log::warning("Invalid lot file received for store at index {$index}, key {$fileKey}."); }
                        }
                    } else { Log::debug("No files uploaded for lot index {$index} during store."); }
                } else { Log::info("Skipping creation of empty Lot data at index: {$index}"); }
            } // End foreach lotsInputData

            // --- Handle General File Uploads (Store in Public) ---
            Log::info('Processing general files for store (Direct Public Storage)...');
            $uploadedGeneralFiles = $request->file('general_files', []);
            if (!empty($uploadedGeneralFiles)) {
                Log::info("Found " . count($uploadedGeneralFiles) . " general files to process.");
                $targetDirRelative = 'uploads/marches/' . $marche->id; // Relative to public_path()
                $targetDirAbsolute = public_path($targetDirRelative);

                // Ensure directory exists and is writable
                if (!File::isDirectory($targetDirAbsolute)) {
                    Log::info("General Marche directory '{$targetDirAbsolute}' creating...");
                    if (!File::makeDirectory($targetDirAbsolute, 0775, true, true)) throw new Exception("Cannot create general marche directory: {$targetDirAbsolute}");
                }
                if (!File::isWritable($targetDirAbsolute)) throw new Exception("General Marche directory not writable: {$targetDirAbsolute}");

                foreach ($uploadedGeneralFiles as $fileKey => $file) {
                    if ($file instanceof \Illuminate\Http\UploadedFile && $file->isValid()) {
                        $originalName = $file->getClientOriginalName();
                        $mimeType = $file->getClientMimeType() ?: 'application/octet-stream';
                        $safeOriginalName = preg_replace('/[^A-Za-z0-9\._-]/', '_', $originalName);
                        $generatedFilename = date('Ymd-His') . '_' . Str::random(5) . '_' . $safeOriginalName;

                        Log::debug("Moving general file '{$originalName}' to '{$targetDirAbsolute}/{$generatedFilename}'");
                         try {
                            $file->move($targetDirAbsolute, $generatedFilename); // MOVE to public path
                            $storedRelativePublicPath = $targetDirRelative . '/' . $generatedFilename; // Relative PUBLIC Path
                            $storedGeneralFilePathsRelative[] = $storedRelativePublicPath; // Track for rollback
                            Log::info("General file moved to public: {$storedRelativePublicPath}");

                            FichierJoint::create([
                                'marche_id' => $marche->id, 'lot_id' => null, // NO Lot ID for general files
                                'nom_fichier' => $originalName, 'chemin_fichier' => $storedRelativePublicPath, // Store relative PUBLIC path
                                'type_fichier' => $mimeType,
                            ]);
                            Log::info("Created FichierJoint DB record for general file.");
                        } catch (\Symfony\Component\HttpFoundation\File\Exception\FileException $e) {
                            Log::error("Failed move() for general file '{$originalName}': " . $e->getMessage());
                            throw new Exception("Failed to move general file '{$originalName}'. Check permissions.");
                        }
                    } else { Log::warning("Invalid general file received during store at key {$fileKey}."); }
                }
            } else { Log::info("No general files uploaded during store."); }
            // --- END General File Handling ---

            DB::commit();
            Log::info("Store transaction committed successfully for Marche ID: {$marche->id} (Direct Public Storage).");

            // Load relations for response
            $marche->load('lots.fichiersJoints', 'fichiersJointsGeneraux', 'convention', 'appelOffre');

            // --- Add Public URLs to response ---
             $appBaseUrl = rtrim(config('app.url', 'http://localhost:8000'), '/');
             $responseData = $marche->toArray();
             // Add URL for general files
             if(isset($responseData['fichiers_joints_generaux'])) { foreach($responseData['fichiers_joints_generaux'] as &$fichier) { $fichier['url'] = $fichier['chemin_fichier']; } unset($fichier); }
             // Add URL for lot files
             if(isset($responseData['lots'])) { foreach($responseData['lots'] as &$lot) { if(isset($lot['fichiers_joints'])) { foreach($lot['fichiers_joints'] as &$fichier) { $fichier['url'] = $fichier['chemin_fichier']; } unset($fichier); } } unset($lot); }
             // --- End Add Public URLs ---

            return response()->json(['message' => 'Marché, lots et fichiers créés avec succès.', 'marche_public' => $responseData], 201);

        } catch (Throwable $e) { // Catch Throwable for broader errors
            DB::rollBack();
            Log::error("Error creating Marche Public (Direct Public): " . $e->getMessage() . "\nTrace: " . $e->getTraceAsString());

            // Attempt cleanup of MANUALLY MOVED files
            Log::info("Rolling back store transaction. Attempting cleanup of newly stored public files...");
            $allStoredRelativePaths = array_unique(array_merge($storedLotFilePathsRelative, $storedGeneralFilePathsRelative));
            foreach ($allStoredRelativePaths as $relativePath) {
                $absolutePath = public_path($relativePath);
                try {
                    if ($relativePath && File::exists($absolutePath)) {
                        if (File::delete($absolutePath)) { Log::info("Rollback cleanup: Deleted public file {$absolutePath}"); }
                        else { Log::error("Rollback cleanup: File::delete failed for public file {$absolutePath}"); }
                    }
                } catch (Exception $fsEx) { Log::error("Rollback cleanup: Failed to delete stored public file: {$absolutePath}", ['exception' => $fsEx]); }
            }
            $statusCode = ($e instanceof ValidationException) ? 422 : 500;
            return response()->json([
                'message' => 'Erreur serveur lors de la création.', 'error_details' => $e->getMessage(),
                'errors' => ($e instanceof ValidationException) ? $e->errors() : null
            ], $statusCode);
        }
    } // End store()


    /**
     * Display the specified resource.
     * GET /api/marches-publics/{marches_public}
     * Modified to generate public URLs.
     */
    public function show(MarchePublic $marches_public)
    {
        Log::info("Fetching MarchePublic ID: {$marches_public->id} (Direct Public Storage)...");
        try {
            // Eager load files for URL generation
             $marches_public->load(['lots.fichiersJoints', 'fichiersJointsGeneraux', 'convention', 'appelOffre']); // Ensure all needed relations are loaded

              // --- Add Public URLs ---
             $appBaseUrl = rtrim(config('app.url', 'http://localhost:8000'), '/');
             // General files
             if ($marches_public->relationLoaded('fichiersJointsGeneraux')) {
                 $marches_public->fichiersJointsGeneraux->each(function($fichier) use ($appBaseUrl) {
                     $fichier->url = $fichier->chemin_fichier ;
                 });
             }
             // Lot files
             if ($marches_public->relationLoaded('lots')) {
                 $marches_public->lots->each(function($lot) use ($appBaseUrl) {
                     if($lot->relationLoaded('fichiersJoints')) {
                         $lot->fichiersJoints->each(function($fichier) use ($appBaseUrl) {
                             $fichier->url = $fichier->chemin_fichier;
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
     */
    public function update(Request $request, MarchePublic $marches_public)
    {
        Log::info("--- MarchePublic Update Request Received for ID: {$marches_public->id} (Direct Public Storage) ---");
        Log::debug('Raw Update Request Keys:', array_keys($request->all()));
        Log::debug('Raw lots_data received (update):', ['type' => gettype($request->input('lots_data')), 'value' => $request->input('lots_data')]);
        Log::debug('Raw general_fichiers_to_delete_ids (update):', ['type' => gettype($request->input('general_fichiers_to_delete_ids')), 'value' => $request->input('general_fichiers_to_delete_ids')]);
        Log::debug('Uploaded Lot Files Keys (update):', array_keys($request->file('lot_files', [])));
        Log::debug('Uploaded General Files Info (update):', ['count' => count($request->file('general_files', []))]);

         // --- Validation Rules ---
         $validator = Validator::make($request->all(), [
            'numero_marche' => ['required','string','max:50', Rule::unique('marche_public','numero_marche')->ignore($marches_public->id)],
            'intitule' => 'required|string',
            'type_marche' => ['required', Rule::in(['Travaux', 'Fournitures', 'Services','Etudes'])],
            'procedure_passation' => 'nullable|string|max:100',
            'mode_passation' => 'nullable|string|max:100',
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
            'avancement_physique' => 'nullable|numeric|min:0|max:100',
            'avancement_financier' => 'nullable|numeric|min:0|max:100',
            'date_engagement_tresorerie' => 'nullable|date_format:Y-m-d', // CHECK Table and Column names
            'lots_data' => 'nullable|string', // Validate as string initially
            'lot_files' => 'nullable|array', // New files are optional
            'lot_files.*' => 'nullable|array',
            'lot_files.*.*' => ['nullable','file','mimes:pdf,doc,docx,xls,xlsx,jpg,jpeg,png,dwg,zip,rar','max:20480'], // Validate if present
            'general_files' => 'nullable|array', // New files optional
            'general_files.*' => ['nullable','file','mimes:pdf,doc,docx,xls,xlsx,jpg,jpeg,png,dwg,zip,rar','max:20480'], // Validate if present
            'general_fichiers_to_delete_ids' => 'nullable|string', // Treat as string first
            'id_fonctionnaire' => 'nullable|string', // <<< ADDED BACK
            // Assuming lot-specific file deletions are handled within lots_data JSON structure
         ]);

        if ($validator->fails()) {
            Log::error("Update validation failed (Laravel) for ID {$marches_public->id}:", $validator->errors()->toArray());
            return response()->json(['message' => 'Erreurs de validation.', 'errors' => $validator->errors()], 422); // Changed message key
        }
        Log::info("Update validation passed (Laravel) for ID: {$marches_public->id}");

        // --- Prepare Data & Decode JSON ---
        $marcheData = $request->except(['lots_data', 'lot_files', 'general_files', '_method', 'general_fichiers_to_delete_ids']);
        // id_fonctionnaire is now included if validated

        // Decode lots_data
        $lotsInputData = [];
        $lotsString = $request->input('lots_data');
        if ($lotsString) {
            $decodedLots = json_decode($lotsString, true);
            if (json_last_error() !== JSON_ERROR_NONE) { /* Handle JSON error */ return response()->json(['message'=>'Erreurs de validation.', 'errors'=>['lots_data'=>['Format JSON invalide.']]], 422); }
            if (!is_array($decodedLots)) { /* Handle type error */ return response()->json(['message'=>'Erreurs de validation.', 'errors'=>['lots_data'=>['Doit être une liste.']]], 422); }
            $lotsInputData = $decodedLots;
        }

        // Decode general_fichiers_to_delete_ids
        $generalFilesToDeleteIds = [];
        $generalFilesToDeleteIdsJson = $request->input('general_fichiers_to_delete_ids');
        if ($generalFilesToDeleteIdsJson) {
            $decodedIds = json_decode($generalFilesToDeleteIdsJson, true);
             if (json_last_error() !== JSON_ERROR_NONE) { /* Handle JSON error */ return response()->json(['message'=>'Erreurs de validation.', 'errors'=>['general_fichiers_to_delete_ids'=>['Format JSON invalide.']]], 422); }
             if (!is_array($decodedIds)) { /* Handle type error */ return response()->json(['message'=>'Erreurs de validation.', 'errors'=>['general_fichiers_to_delete_ids'=>['Doit être une liste d\'IDs.']]], 422); }
            $generalFilesToDeleteIds = $decodedIds;
        }
        Log::debug('Decoded general_fichiers_to_delete_ids (update)', ['count' => count($generalFilesToDeleteIds)]);
        // --- End Prepare Data ---

        $newlyCreatedFilePathsRelative = []; // Track NEW relative PUBLIC paths for rollback
        $pathsToDeletePhysicallyRelative = [];   // Track OLD relative PUBLIC paths for deletion on commit

        // --- Collect Files to Delete (BEFORE Transaction) ---
        // General Files
        if (!empty($generalFilesToDeleteIds)) {
            $generalFilesFoundToDelete = FichierJoint::where('marche_id', $marches_public->id)
                                                    ->whereNull('lot_id')
                                                    ->whereIn('id', $generalFilesToDeleteIds)
                                                    ->pluck('chemin_fichier') // Get only paths
                                                    ->filter() // Remove null/empty paths
                                                    ->toArray();
            $pathsToDeletePhysicallyRelative = array_merge($pathsToDeletePhysicallyRelative, $generalFilesFoundToDelete);
        }
        // Lot Files (Iterate through input lots to find deletion arrays)
        foreach ($lotsInputData as $lotData) {
            // Ensure it's an array and has the keys needed
            if (!is_array($lotData) || !isset($lotData['fichiers_to_delete']) || !isset($lotData['id'])) continue;

            $lotId = $lotData['id'];
            $lotFilesToDeleteIds = $lotData['fichiers_to_delete']; // Should be an array of file IDs

            // Validate $lotId and $lotFilesToDeleteIds
            if (empty($lotId) || !is_numeric($lotId) || !is_array($lotFilesToDeleteIds) || empty($lotFilesToDeleteIds)) continue;

             $lotFilesFoundToDelete = FichierJoint::where('lot_id', $lotId) // Check lot_id
                                              ->whereIn('id', $lotFilesToDeleteIds)
                                              ->pluck('chemin_fichier') // Get only paths
                                              ->filter() // Remove null/empty paths
                                              ->toArray();
             $pathsToDeletePhysicallyRelative = array_merge($pathsToDeletePhysicallyRelative, $lotFilesFoundToDelete);

        }
        $uniquePathsToDelete = array_unique($pathsToDeletePhysicallyRelative);
        Log::debug("Relative public paths queued for physical deletion (update):", $uniquePathsToDelete);
        // --- End Collect Files ---

        DB::beginTransaction();
        Log::info("Update transaction started for ID: {$marches_public->id} (Direct Public Storage)");
        try {
            // --- Update Marche Public Data ---
            // $marcheData includes id_fonctionnaire if provided and validated
            $marches_public->update($marcheData);
            Log::info("MarchePublic record updated.");

            // --- Handle Deletion of FichierJoint DB Records ---
            // General Files
            if (!empty($generalFilesToDeleteIds)) {
                 $deletedCount = FichierJoint::where('marche_id', $marches_public->id)->whereNull('lot_id')->whereIn('id', $generalFilesToDeleteIds)->delete();
                 Log::info("Deleted {$deletedCount} general FichierJoint DB records.");
            }
             // Lot Files (Iterate again to perform DB delete)
             foreach ($lotsInputData as $lotData) {
                 // Re-validate keys for safety
                 if (!is_array($lotData) || !isset($lotData['fichiers_to_delete']) || !isset($lotData['id'])) continue;

                 $lotId = $lotData['id'];
                 $lotFilesToDeleteIds = $lotData['fichiers_to_delete'];

                  if (!empty($lotId) && is_numeric($lotId) && is_array($lotFilesToDeleteIds) && !empty($lotFilesToDeleteIds)) {
                     $deletedCount = FichierJoint::where('lot_id', $lotId)->whereIn('id', $lotFilesToDeleteIds)->delete();
                      Log::info("Deleted {$deletedCount} FichierJoint DB records for Lot ID {$lotId}.");
                 }
             }
            // --- End Deletion of DB Records ---

            // --- Sync Lots (Update/Create/Delete) ---
            $existingLotIds = $marches_public->lots()->pluck('id')->toArray();
            $inputLotIdsWithId = collect($lotsInputData)->whereNotNull('id')->pluck('id')->toArray();
            $lotsToDeleteIds = array_diff($existingLotIds, $inputLotIdsWithId);

            // Delete Lots Not Present (DB only, files already queued)
            if (!empty($lotsToDeleteIds)) {
                // Note: Files associated with these lots were already queued for physical deletion earlier.
                $deletedLotCount = Lot::whereIn('id', $lotsToDeleteIds)->where('marche_id', $marches_public->id)->delete();
                 Log::info("Deleted {$deletedLotCount} Lot records no longer present in input.");
                 // Assuming FichierJoints are handled by cascade or were deleted above.
            }

            // Update or Create Lots & Handle NEW Lot Files
            $uploadedLotFiles = $request->file('lot_files', []); // Get uploaded lot files
            foreach ($lotsInputData as $index => $lotData) {
                if (!is_array($lotData)) continue;
                $lotDataFiltered = Arr::only($lotData, ['numero_lot', 'objet', 'montant_attribue', 'attributaire']);
                $lotId = $lotData['id'] ?? null;
                $currentLot = null;

                if ($lotId && in_array($lotId, $existingLotIds)) { // Update existing
                    $currentLot = Lot::find($lotId);
                    if ($currentLot && $currentLot->marche_id === $marches_public->id) { $currentLot->update($lotDataFiltered); Log::info("Updated Lot ID: {$currentLot->id}"); }
                    else { Log::warning("Attempted to update Lot ID {$lotId} not belonging to Marche ID {$marches_public->id}. Skipped."); continue; }
                } elseif ($lotId === null) { // Create new
                    // Only create if there's actual data OR new files uploaded for this specific index
                    if (Arr::first($lotDataFiltered, fn($v) => $v !== null && $v !== '') !== null || isset($uploadedLotFiles[$index])) {
                        $currentLot = $marches_public->lots()->create($lotDataFiltered);
                        Log::info("Created new Lot ID: {$currentLot->id}");
                    } else {
                        Log::debug("Skipping creation of new Lot at index {$index} - no data and no files.");
                        continue;
                    }
                } else {
                    Log::warning("Invalid lot data structure at index {$index} (ID present but not matched, or missing). Skipped.");
                    continue;
                }


                // Process NEW Lot File Uploads for this lot (either updated or newly created)
                if ($currentLot && isset($uploadedLotFiles[$index]) && is_array($uploadedLotFiles[$index])) {
                     Log::info("Processing new files for Lot ID {$currentLot->id} at index {$index} (Direct Public Update)");
                     $targetDirRelative = 'uploads/lots/' . $currentLot->id;
                     $targetDirAbsolute = public_path($targetDirRelative);
                     if (!File::isDirectory($targetDirAbsolute)) { if (!File::makeDirectory($targetDirAbsolute, 0775, true, true)) throw new Exception("Cannot create lot directory update."); }
                     if (!File::isWritable($targetDirAbsolute)) throw new Exception("Lot directory update not writable.");

                     foreach ($uploadedLotFiles[$index] as $fileKey => $file) {
                         if ($file instanceof \Illuminate\Http\UploadedFile && $file->isValid()) {
                              $originalName = $file->getClientOriginalName(); $mimeType = $file->getClientMimeType() ?: 'application/octet-stream';
                              $safeOriginalName = preg_replace('/[^A-Za-z0-9\._-]/', '_', $originalName); $generatedFilename = date('Ymd-His') . '_' . Str::random(5) . '_' . $safeOriginalName;
                             try {
                                 $file->move($targetDirAbsolute, $generatedFilename);
                                 $storedRelativePublicPath = $targetDirRelative . '/' . $generatedFilename;
                                 $newlyCreatedFilePathsRelative[] = $storedRelativePublicPath; // Track for rollback
                                 Log::info("New lot file moved to public: {$storedRelativePublicPath}");
                                 FichierJoint::create([
                                     'marche_id' => $marches_public->id, 'lot_id' => $currentLot->id,
                                     'nom_fichier' => $originalName, 'chemin_fichier' => $storedRelativePublicPath, // Store relative public path
                                     'type_fichier' => $mimeType,
                                 ]);
                             } catch (\Symfony\Component\HttpFoundation\File\Exception\FileException $e) {
                                  Log::error("Failed move() for new lot file '{$originalName}' (update): " . $e->getMessage());
                                  throw new Exception("Failed move new lot file '{$originalName}'. Check permissions.");
                              }
                         } else { Log::warning("Invalid new lot file received for update at index {$index}, key {$fileKey}."); }
                     }
                }
            } // End foreach lotsInputData

            // --- Handle NEW General File Uploads ---
            Log::info('Processing new general files during update (Direct Public Storage)...');
            $uploadedGeneralFiles = $request->file('general_files', []);
            if (!empty($uploadedGeneralFiles)) {
                 $targetDirRelative = 'uploads/marches/' . $marches_public->id;
                 $targetDirAbsolute = public_path($targetDirRelative);
                 if (!File::isDirectory($targetDirAbsolute)) { if (!File::makeDirectory($targetDirAbsolute, 0775, true, true)) throw new Exception("Cannot create general dir update."); }
                 if (!File::isWritable($targetDirAbsolute)) throw new Exception("General dir update not writable.");

                 foreach ($uploadedGeneralFiles as $fileKey => $file) {
                     if ($file instanceof \Illuminate\Http\UploadedFile && $file->isValid()) {
                          $originalName = $file->getClientOriginalName(); $mimeType = $file->getClientMimeType() ?: 'application/octet-stream';
                          $safeOriginalName = preg_replace('/[^A-Za-z0-9\._-]/', '_', $originalName); $generatedFilename = date('Ymd-His') . '_' . Str::random(5) . '_' . $safeOriginalName;
                         try {
                             $file->move($targetDirAbsolute, $generatedFilename);
                             $storedRelativePublicPath = $targetDirRelative . '/' . $generatedFilename;
                             $newlyCreatedFilePathsRelative[] = $storedRelativePublicPath; // Track for rollback
                             Log::info("New general file moved to public: {$storedRelativePublicPath}");
                             FichierJoint::create([
                                 'marche_id' => $marches_public->id, 'lot_id' => null,
                                 'nom_fichier' => $originalName, 'chemin_fichier' => $storedRelativePublicPath, // Store relative public path
                                 'type_fichier' => $mimeType,
                             ]);
                         } catch (\Symfony\Component\HttpFoundation\File\Exception\FileException $e) {
                              Log::error("Failed move() for new general file '{$originalName}' (update): " . $e->getMessage());
                              throw new Exception("Failed move new general file '{$originalName}'. Check permissions.");
                         }
                     } else { Log::warning("Invalid new general file received during update at key {$fileKey}."); }
                 }
            } else { Log::info("No new general files uploaded during update."); }
            // --- END NEW General File Handling ---

            DB::commit();
            Log::info("Update transaction committed successfully for ID: {$marches_public->id} (Direct Public Storage)");

            // --- Delete Queued OLD Physical Files AFTER Commit ---
            Log::info("Attempting deletion of " . count($uniquePathsToDelete) . " queued OLD physical files from public storage...");
            foreach ($uniquePathsToDelete as $relativePath) {
                $absolutePath = public_path($relativePath);
                try {
                    if ($relativePath && File::exists($absolutePath)) {
                        if (File::delete($absolutePath)) { Log::info("Deleted OLD public file: {$absolutePath}"); }
                        else { Log::error("File::delete failed for OLD public file: {$absolutePath}"); }
                    } else { Log::warning("OLD public file path not found or empty for deletion: '{$absolutePath}'"); }
                } catch (Exception $storageEx) { Log::error("Error deleting OLD public file: {$absolutePath}", ['exception' => $storageEx]); }
            }
            // --- End Delete OLD Files ---

            // Reload relations and add URLs for response
            $marches_public->load('lots.fichiersJoints', 'fichiersJointsGeneraux', 'convention', 'appelOffre');
             $appBaseUrl = rtrim(config('app.url', 'http://localhost:8000'), '/');
             $responseData = $marches_public->toArray();
             // Add URLs
             if(isset($responseData['fichiers_joints_generaux'])) { foreach($responseData['fichiers_joints_generaux'] as &$fichier) { $fichier['url'] = $fichier['chemin_fichier']; } unset($fichier); }
             if(isset($responseData['lots'])) { foreach($responseData['lots'] as &$lot) { if(isset($lot['fichiers_joints'])) { foreach($lot['fichiers_joints'] as &$fichier) { $fichier['url'] = $fichier['chemin_fichier']; } unset($fichier); } } unset($lot); }

            return response()->json(['message' => 'Marché, lots et fichiers mis à jour.', 'marche_public' => $responseData]);

        } catch (Throwable $e) { // Catch Throwable
            DB::rollBack();
            Log::error("Error updating Marche Public ID {$marches_public->id} (Direct Public): " . $e->getMessage() . "\nTrace: " . $e->getTraceAsString());

            // Attempt cleanup of NEWLY created public files
            Log::info("Rolling back update transaction. Attempting cleanup of newly stored public files...");
            foreach ($newlyCreatedFilePathsRelative as $relativePath) {
                $absolutePath = public_path($relativePath);
                try {
                    if ($relativePath && File::exists($absolutePath)) {
                        if (File::delete($absolutePath)) { Log::info("Rollback cleanup: Deleted new public file {$absolutePath}"); }
                        else { Log::error("Rollback cleanup: File::delete failed for new public file {$absolutePath}"); }
                    }
                } catch (Exception $fsEx) { Log::error("Rollback cleanup: Failed to delete stored new public file: {$absolutePath}", ['exception' => $fsEx]); }
            }

            $statusCode = ($e instanceof ValidationException) ? 422 : 500;
            return response()->json([
                'message' => 'Erreur serveur lors de la mise à jour.', 'error_details' => $e->getMessage(),
                'errors' => ($e instanceof ValidationException) ? $e->errors() : null
            ], $statusCode);
        }
    } // End update()


    /**
     * Remove the specified resource from storage using direct public storage.
     * DELETE /api/marches-publics/{marches_public}
     */
    public function destroy(MarchePublic $marches_public)
    {
        Log::info("--- MarchePublic Destroy Request Received for ID: {$marches_public->id} (Direct Public Storage) ---");
        $pathsToDeletePhysicallyRelative = []; // Store relative PUBLIC paths

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

            // Define directory paths BEFORE deleting Marche/Lot records
            $generalMarcheDirRelative = 'uploads/marches/' . $marches_public->id;
            $lotDirRelatives = $marches_public->lots()->pluck('id')->map(fn($id) => 'uploads/lots/' . $id)->toArray();

            // Delete MarchePublic (DB cascade SHOULD handle lots and fichier_joint records)
            // If not using cascades, delete FichierJoints and Lots manually BEFORE deleting MarchePublic.
            // Example:
            // FichierJoint::where('marche_id', $marches_public->id)->delete(); // Delete all associated files first
            // Lot::where('marche_id', $marches_public->id)->delete(); // Then delete lots
            Log::info("Deleting MarchePublic record ID: {$marches_public->id}...");
            $deleted = $marches_public->delete();

            if ($deleted) {
                Log::info("MarchePublic record deleted successfully.");
                DB::commit();
                Log::info("Destroy transaction committed (Direct Public Storage).");

                // Delete files from PUBLIC storage AFTER successful commit
                Log::info("Attempting deletion of associated physical public files...");
                $deletedStorageCount = 0;
                foreach ($uniquePathsToDelete as $relativePath) {
                    $absolutePath = public_path($relativePath); // Get absolute path
                    try {
                        if ($relativePath && File::exists($absolutePath)) {
                            if (File::delete($absolutePath)) {
                                Log::info("Deleted from public storage: {$absolutePath}");
                                $deletedStorageCount++;
                            } else { Log::error("File::delete failed for public file: {$absolutePath}"); }
                        } else { Log::warning("Public file path not found or empty for deletion: '{$absolutePath}'"); }
                    } catch (Exception $storageEx) { Log::error("Error deleting public file: {$absolutePath}", ['exception' => $storageEx]); }
                }
                Log::info("Completed public storage deletion phase. Deleted {$deletedStorageCount} files.");

                 // Attempt to delete EMPTY directories AFTER deleting files
                 // Lot directories
                 foreach ($lotDirRelatives as $lotDirRel) {
                     $lotDirAbs = public_path($lotDirRel);
                      if (File::isDirectory($lotDirAbs) && count(File::allFiles($lotDirAbs)) === 0) {
                         try { File::deleteDirectory($lotDirAbs); Log::info("Deleted empty lot directory: {$lotDirAbs}"); }
                         catch (Exception $dirEx) { Log::error("Error deleting empty lot directory {$lotDirAbs}: ".$dirEx->getMessage()); }
                      } else { Log::debug("Lot directory not deleted (not empty or doesn't exist): {$lotDirAbs}"); }
                 }
                  // General Marche directory
                 $generalMarcheDirAbs = public_path($generalMarcheDirRelative);
                 if (File::isDirectory($generalMarcheDirAbs) && count(File::allFiles($generalMarcheDirAbs)) === 0) {
                      try { File::deleteDirectory($generalMarcheDirAbs); Log::info("Deleted empty general marche directory: {$generalMarcheDirAbs}"); }
                     catch (Exception $dirEx) { Log::error("Error deleting empty general marche directory {$generalMarcheDirAbs}: ".$dirEx->getMessage()); }
                 } else { Log::debug("General marche directory not deleted (not empty or doesn't exist): {$generalMarcheDirAbs}"); }

                return response()->json(['message' => 'Marché et fichiers associés supprimés avec succès.'], 200);
            } else {
                Log::error("Failed to delete MarchePublic record from database.");
                DB::rollBack();
                return response()->json(['message' => 'La suppression (DB) a échoué.'], 500);
            }
        } catch (Throwable $e) { // Catch Throwable
            DB::rollBack();
            Log::error("Error deleting Marche Public ID {$marches_public->id} (Direct Public): " . $e->getMessage());
            // Files NOT deleted from disk if DB fails
            return response()->json(['message' => 'Erreur serveur lors de la suppression.', 'error' => $e->getMessage()], 500);
        }
    }

} // End of Controller Class