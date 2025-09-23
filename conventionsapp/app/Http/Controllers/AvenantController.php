<?php

namespace App\Http\Controllers;

// Required Model imports
use App\Models\Avenant;
use App\Models\Convention;
use App\Models\Document;
use App\Models\Partenaire;
use App\Models\ConvPart; // Required for partner commitments
use App\Models\Projet; // Included for context, though Avenant doesn't directly link

// Required Facades and Classes
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File; // Use File facade for directory/file operations
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class AvenantController extends Controller
{
    // Define the possible ENUM values for validation
    private $modificationTypes = ['montant', 'durée', 'partenaire', 'autre'];

    /**
     * Display a listing of the resource.
     * GET /api/avenants
     * Optional query param: ?convention_id={id}&include=convention,documents,partnerCommitments.partenaire
     * MERGED: Manually constructs URLs for direct public storage. Uses Description_Arr fallback for partner label.
     */
    public function index(Request $request)
    {
        Log::info('Fetching avenants (direct public)...');
        try {
            $query = Avenant::query();
            // Define default relationships to potentially load
            $defaultRelations = ['convention', 'documents', 'partnerCommitments.partenaire'];
            $relationsToLoad = $defaultRelations; // Assume defaults initially

            // Process 'include' parameter if provided to customize loaded relations
            if ($request->filled('include')) {
                $includes = explode(',', $request->input('include'));
                $potentialRelations = $defaultRelations; // Check against these known relations
                // Filter requested includes against potential relations
                $requestedRelations = array_filter($potentialRelations, function ($relation) use ($includes) {
                    $baseRelation = explode('.', $relation)[0]; // Handle nested like 'partnerCommitments.partenaire'
                    return in_array($relation, $includes) || in_array($baseRelation, $includes);
                });

                // Use the filtered relations ONLY IF they are not empty and valid
                if (!empty($requestedRelations)) {
                    $relationsToLoad = array_values($requestedRelations); // Re-index array
                    Log::info('Using requested include relations: ' . implode(', ', $relationsToLoad));
                } else {
                    Log::warning('Requested include relations not recognized or empty, loading defaults.', ['requested' => $includes]);
                    Log::info('Loading default relations because include param was invalid/empty.');
                }
            } else {
                 Log::info('No include parameter specified, loading default relations.');
            }

            // Ensure uniqueness and load the relations
            $relationsToLoad = array_unique($relationsToLoad);
            if (!empty($relationsToLoad)) {
                 Log::info('Eager loading relations: ' . implode(', ', $relationsToLoad));
                 $query->with($relationsToLoad);
            }

            // Filter by convention_id if provided
            if ($request->has('convention_id')) {
                $conventionId = $request->input('convention_id');
                Log::info("Filtering avenants for convention_id: {$conventionId}");
                $query->where('convention_id', $conventionId);
            }

            // Order by creation date (descending) - Use correct constant or column name
            $creationColumn = defined(Avenant::class . '::CREATED_AT') ? Avenant::CREATED_AT : 'date_creation';
            $avenants = $query->latest($creationColumn)->get();
            Log::info('Successfully fetched ' . $avenants->count() . ' avenants.');

            // --- Manually add URLs and format partners for the response ---
            $appBaseUrl = rtrim(config('app.url', 'http://localhost:8000:80'), '/'); // Ensure port if needed

            $avenants->each(function ($avenant) use ($appBaseUrl) {
                // Add 'fichier_url' to each document
                if ($avenant->relationLoaded('documents')) {
                    $avenant->documents->each(function ($doc) use ($appBaseUrl) {
                        // Construct URL manually based on public path
                        $doc->fichier_url = $doc->file_path ? $appBaseUrl . '/' . ltrim($doc->file_path, '/') : null;
                    });
                }

                 // Add formatted partner commitments (optional, but good for consistency)
                 if ($avenant->relationLoaded('partnerCommitments')) {
                     // Use a distinct property name to avoid conflict if 'partnerCommitments' is also sent raw
                     $avenant->formatted_partner_commitments = $avenant->partnerCommitments->map(function ($pc) {
                        $signatureDate = $pc->date_signature ? $pc->date_signature->format('Y-m-d') : null;
                        return [
                            'Id_CP' => $pc->Id_CP ?? null,
                            'Id_Partenaire' => $pc->Id_Partenaire,
                            // MERGED: Use Description_Arr fallback
                            'label' => optional($pc->partenaire)->Description ?? optional($pc->partenaire)->Description_Arr ?? "Partenaire ID {$pc->Id_Partenaire}",
                            'Montant_Convenu' => $pc->Montant_Convenu,
                            'is_signatory' => (bool) $pc->is_signatory,
                            'date_signature' => $signatureDate,
                            'details_signature' => $pc->details_signature,
                        ];
                     })->values()->all();
                 }
            });
            //--- End Manual URL and Formatting ---


            return response()->json(['avenants' => $avenants]);

        } catch (\Exception $e) {
             Log::error('Error fetching avenants:', ['message' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
             return response()->json(['message' => 'Erreur serveur lors de la récupération des avenants.'], 500);
        }
    }

    /**
     * Store a newly created resource in storage.
     * POST /api/avenants
     * MERGED: Files (`fichiers`) optional, stores in public/uploads/avenants/{id}. `objet` is nullable. Partner label uses Description_Arr fallback.
     */
    public function store(Request $request)
    {
        Log::info('Avenant store request received (fichiers optionnels, direct public)...');
        Log::debug('Raw Request Data:', $request->all());
        if ($request->hasFile('fichiers')) { Log::info(count($request->file('fichiers')) . ' fichier(s) reçu(s).'); }
        else { Log::info('Aucun fichier reçu (optionnel).'); }

        // --- 1. Decode Partner Commitments ---
        $partnerCommitmentsInput = json_decode($request->input('avenant_partner_commitments', '[]'), true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            Log::error('Échec décodage JSON engagements partenaires (store).', ['error' => json_last_error_msg()]);
            return response()->json(['message' => 'Format JSON engagements invalide.'], 400);
        }
        Log::debug('Engagements partenaires décodés (store):', $partnerCommitmentsInput);

        // --- 2. Main Validation ---
        try {
            // ** FILES ARE OPTIONAL ON CREATE **
            $validatedData = $request->validate([
                'convention_id' => 'required|integer|exists:convention,id',
                'numero_avenant' => ['required', 'string', 'max:50', Rule::unique('avenants')->where(fn ($query) => $query->where('convention_id', $request->input('convention_id')))],
                'date_signature' => 'required|date_format:Y-m-d',
                'annee_avenant' => 'required|integer|digits:4',
                'session' => 'required|integer|between:1,12',
                'numero_approbation' => 'required|string|max:100',
                'statut' => 'required|string|max:50',
                'date_visa' => ['nullable', 'date_format:Y-m-d', 'required_if:statut,visé'],
                'objet' => 'nullable|string', // MERGED: Changed from 'required' to 'nullable'
                'type_modification' => ['required', Rule::in($this->modificationTypes)],
                'montant_modifie' => ['nullable', 'numeric', 'min:0', Rule::requiredIf(fn () => $request->input('type_modification') === 'montant')],
                'nouvelle_date_fin' => ['nullable', 'date_format:Y-m-d', Rule::requiredIf(fn () => $request->input('type_modification') === 'durée')],
                'remarques' => 'nullable|string',
                'id_fonctionnaire'=>'nullable|string', // Keep validation for create
                'fichiers' => 'nullable|array', // Array itself optional
                'fichiers.*' => 'nullable|file|mimes:pdf,doc,docx,jpg,jpeg,png,xls,xlsx|max:10240', // Individual files optional + validation (10MB)
                'avenant_partner_commitments' => ['nullable', 'string', Rule::requiredIf(fn () => $request->input('type_modification') === 'partenaire')],
            ], [ // French Messages
                'required' => 'Le champ :attribute est obligatoire.',
                'string'   => 'Le champ :attribute doit être une chaîne.',
                'integer'  => 'Le champ :attribute doit être un entier.',
                'numeric'  => 'Le champ :attribute doit être un nombre.',
                'min'      => ':attribute doit être au moins :min.',
                'max'      => [ 'string' => ':attribute max :max caractères.', 'file' => ':attribute max :max Ko.' ],
                'digits'   => ':attribute doit avoir :digits chiffres.',
                'unique'   => ':attribute déjà utilisé pour cette convention.',
                'exists'   => ':attribute invalide.',
                 'annee_avenant.required' => 'L\'année de l\'avenant est obligatoire.',
            'annee_avenant.digits' => 'L\'année doit être au format AAAA.',
            'session.required' => 'La session est obligatoire.',
            'numero_approbation.required' => 'Le numéro d\'approbation est obligatoire.',
            'statut.required' => 'Le statut est obligatoire.',
            'date_visa.required_if' => 'La date de visa est obligatoire quand le statut est "visé".',
                'array'    => ':attribute doit être une liste.',
                'file'     => ':attribute doit être un fichier valide.',
                'mimes'    => 'Type fichier :attribute invalide (:values).',
                'date_format' => 'Format date :attribute invalide (AAAA-MM-JJ).',
                'avenant_partner_commitments.requiredIf' => 'Détails partenaires requis pour ce type.',
                'montant_modifie.requiredIf' => 'Montant requis pour ce type.',
                'nouvelle_date_fin.requiredIf' => 'Nouvelle date fin requise pour ce type.',
            ]);

            // --- 3. Detailed Partner Commitment Validation ---
            if ($validatedData['type_modification'] === 'partenaire') {
                 if (!is_array($partnerCommitmentsInput) || empty($partnerCommitmentsInput)) { throw ValidationException::withMessages(['avenant_partner_commitments' => 'Au moins un engagement requis pour ce type.']); }
                 foreach ($partnerCommitmentsInput as $index => $commitment) {
                     if (!is_array($commitment) || !isset($commitment['id'], $commitment['is_signatory'])) { throw ValidationException::withMessages(["avenant_partner_commitments.{$index}" => "Données partenaire #".($index+1)." incomplètes."]); }
                     $commitmentValidator = Validator::make($commitment, [
                         'id' => 'required|integer|exists:partenaire,Id', 'montant' => 'nullable|numeric|min:0',
                         'is_signatory' => 'required|boolean', 'date_signature' => ['nullable', 'date_format:Y-m-d', Rule::requiredIf($commitment['is_signatory'] ?? false)],
                         'details_signature' => ['nullable', 'string', 'max:1000']], [ /* Specific partner messages */
                            'id.required' => 'ID partenaire manquant (engagement #'.($index + 1).').',
                            'id.exists' => 'ID partenaire invalide (engagement #'.($index + 1).').',
                            'is_signatory.required' => 'Statut signataire requis (engagement #'.($index + 1).').',
                            'date_signature.required_if' => 'Date signature requise si signataire (engagement #'.($index + 1).').',
                         ]);
                     if ($commitmentValidator->fails()) { throw ValidationException::withMessages(["avenant_partner_commitments.{$index}" => "Erreur engagement #".($index + 1).": " . $commitmentValidator->errors()->first()]); }
                 }
             }
            Log::info('Validation avenant réussie (store - direct public).');
        } catch (ValidationException $e) { Log::error('Échec validation avenant (store):', ['errors' => $e->errors()]); return response()->json(['message' => 'Erreur de validation.', 'errors' => $e->errors()], 422); }

        $avenant = null;
        $createdDocumentsInfo = []; // Track relative PUBLIC paths for rollback
        $sessionFormatted = str_pad($validatedData['session'], 2, '0', STR_PAD_LEFT);
        $generatedCode = sprintf(
        '%s/%s/%s',
        $validatedData['numero_approbation'],
        $sessionFormatted,
        $validatedData['annee_avenant']
    );
        DB::beginTransaction();
        Log::info('Transaction DB démarrée (avenant store - direct public).');
        try {
            // 1. Create Avenant Record FIRST
            $avenantData = Arr::except($validatedData, ['fichiers', 'avenant_partner_commitments']);
            $avenantData['code'] = $generatedCode;
            Log::info('Création enregistrement Avenant...', $avenantData);
            $avenant = Avenant::create($avenantData);
            Log::info("Avenant créé: ID {$avenant->id}");

            // --- Define Target Directory using the new Avenant ID ---
            $targetDirRelative = 'uploads/avenants/' . $avenant->id; // Relative to public_path()
            $targetDirAbsolute = public_path($targetDirRelative);

            // 2. Handle OPTIONAL File Uploads
            Log::info('Traitement fichiers uploadés (si présents) vers public...');
            if ($request->hasFile('fichiers') && is_array($request->file('fichiers'))) {
                 if (!File::isDirectory($targetDirAbsolute)) {
                    Log::info("Dossier avenant '{$targetDirAbsolute}' inexistant, création...");
                    if (!File::makeDirectory($targetDirAbsolute, 0775, true, true)) { throw new \Exception("Impossible créer dossier avenant: {$targetDirAbsolute}"); }
                 }
                 if (!File::isWritable($targetDirAbsolute)) { throw new \Exception("Permissions écriture manquantes pour dossier avenant: {$targetDirAbsolute}"); }

                 Log::info(count($request->file('fichiers')) . ' fichier(s) à traiter.');
                 foreach ($request->file('fichiers') as $index => $file) {
                    if ($file instanceof \Illuminate\Http\UploadedFile && $file->isValid()) {
                        $originalName = $file->getClientOriginalName(); $mimeType = $file->getClientMimeType() ?: 'application/octet-stream'; $size = $file->getSize();
                        $safeOriginalName = preg_replace('/[^A-Za-z0-9\._-]/', '_', $originalName);
                        $generatedFilename = date('Ymd-His') . '_' . Str::random(5) . '_' . $safeOriginalName;

                        Log::debug("Déplacement fichier '{$originalName}' vers '{$targetDirAbsolute}/{$generatedFilename}'");
                        try {
                             $file->move($targetDirAbsolute, $generatedFilename);
                             $storedRelativePublicPath = $targetDirRelative . '/' . $generatedFilename;
                             Log::info("Fichier #{$index} déplacé vers public:", ['path' => $storedRelativePublicPath]);
                             $createdDocumentsInfo[] = ['path' => $storedRelativePublicPath];

                            $document = Document::create([
                                 'avenant_id' => $avenant->id, 'Id_Conv' => null, 'Id_Doc' => 'avdoc_' . Str::uuid()->toString(),
                                 'Intitule' => ($validatedData['objet'] ?? 'Avenant '.$avenant->id) . " - Fichier " . ($index + 1), // Handle nullable objet
                                 'file_name' => $originalName,
                                 'file_type' => $mimeType, 'file_size' => $size, 'file_path' => $storedRelativePublicPath
                            ]);
                            Log::info("Document créé: ID {$document->Id_Doc} pour Avenant ID {$avenant->id}");
                        } catch (\Symfony\Component\HttpFoundation\File\Exception\FileException $e) { throw new \Exception("Échec déplacement fichier '{$originalName}'. Vérifiez permissions."); }
                    } else { Log::warning("Élément invalide ou null dans 'fichiers' [{$index}] (store), ignoré."); }
                 }
             } else { Log::info("Aucun fichier fourni pour Avenant ID {$avenant->id} (optionnel)."); }

            // 3. Create ConvPart Records if type is 'partenaire'
            Log::info('Création enregistrements ConvPart...');
            if ($validatedData['type_modification'] === 'partenaire' && !empty($partnerCommitmentsInput)) {
                 foreach ($partnerCommitmentsInput as $commitment) {
                     if (!isset($commitment['id'], $commitment['is_signatory'])) { continue; }
                     ConvPart::create([
                         'Id_Convention' => $avenant->convention_id,
                         'Id_Partenaire' => $commitment['id'],
                         'avenant_id' => $avenant->id,
                         'Montant_Convenu' => $commitment['montant'] ?? null,
                         'is_signatory' => $commitment['is_signatory'],
                         'date_signature' => ($commitment['is_signatory'] && !empty($commitment['date_signature'])) ? $commitment['date_signature'] : null,
                         'details_signature' => ($commitment['is_signatory'] && !empty($commitment['details_signature'])) ? $commitment['details_signature'] : null,
                     ]);
                 }
                 Log::info(count($partnerCommitmentsInput) . " enregistrement(s) ConvPart créé(s).");
            } else { Log::info("Skipping ConvPart creation (Type != 'partenaire' ou pas de détails)."); }

            DB::commit(); Log::info('Transaction DB validée (avenant store - direct public).');

            // --- Return Success Response ---
            $avenant->load(['convention', 'documents', 'partnerCommitments.partenaire']);
            // Manually construct URLs
            $appBaseUrl = rtrim(config('app.url', 'http://localhost:8000:80'), '/');
            $responseData = $avenant->toArray();
             if (isset($responseData['documents'])) {
                 foreach ($responseData['documents'] as &$doc) { $doc['fichier_url'] = $doc['file_path'] ? $appBaseUrl . '/' . ltrim($doc['file_path'], '/') : null; } unset($doc);
             }
             // Manually format partners (ensure correct keys)
             if (isset($responseData['partner_commitments']) && $avenant->relationLoaded('partnerCommitments')) {
                  $responseData['partner_commitments'] = $avenant->partnerCommitments->map(function ($pc) {
                     $sigDate = $pc->date_signature ? $pc->date_signature->format('Y-m-d') : null;
                     return [
                          'Id_CP' => $pc->Id_CP ?? null, 'Id_Partenaire' => $pc->Id_Partenaire,
                          // MERGED: Use Description_Arr fallback
                          'label' => optional($pc->partenaire)->Description ?? optional($pc->partenaire)->Description_Arr ?? "ID: {$pc->Id_Partenaire}",
                          'Montant_Convenu' => $pc->Montant_Convenu, 'is_signatory' => (bool) $pc->is_signatory, 'date_signature' => $sigDate, 'details_signature' => $pc->details_signature ];
                  })->values()->all();
              } else { $responseData['partner_commitments'] = []; }

            return response()->json(["success" => "Avenant ajouté!", "message" => "Avenant ajouté!", "avenant" => $responseData ], 201);

        } catch (\Exception $e) { // --- Error Handling ---
            DB::rollBack(); Log::error('ERREUR création avenant (direct public):', ['message' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            // Cleanup MANUALLY MOVED files
            foreach ($createdDocumentsInfo as $docInfo) {
                 $absolutePath = public_path($docInfo['path']); if (!empty($docInfo['path']) && File::exists($absolutePath)) { try { File::delete($absolutePath); Log::warning("Rollback fichier déplacé (public): supprimé {$absolutePath}"); } catch (\Exception $ex) { Log::error("Echec suppression fichier {$absolutePath} (rollback): ". $ex->getMessage()); } }
            }
            $statusCode = ($e instanceof ValidationException) ? 422 : 500;
            return response()->json([ "message" => "Échec de la création.", "error" => $e->getMessage(), "errors" => ($e instanceof ValidationException) ? $e->errors() : null ], $statusCode);
        }
    }

public function show(Request $request, string $id)
{
    Log::info("Fetching avenant with ID: {$id}...");
    try {
        // Eager load necessary relationships
        $defaultRelations = ['convention', 'documents', 'partnerCommitments.partenaire'];
        $relationsToLoad = $defaultRelations;

        // Basic include logic to allow frontend to request specific relations
        if ($request->filled('include')) {
            $includes = explode(',', $request->input('include'));
            $potentialRelations = $defaultRelations; // Define potential relations for security
            $requestedRelations = array_filter($potentialRelations, function ($relation) use ($includes) {
                $baseRelation = explode('.', $relation)[0];
                return in_array($relation, $includes) || in_array($baseRelation, $includes);
            });

            if (!empty($requestedRelations)) {
                $relationsToLoad = array_values($requestedRelations);
            } else {
                Log::warning('Includes non reconnus, chargement des relations par défaut.', ['requested' => $includes]);
            }
        }

        $relationsToLoad = array_unique($relationsToLoad);
        Log::debug("Chargement des relations: " . implode(', ', $relationsToLoad));

        $avenant = Avenant::with($relationsToLoad)->find($id);

        if (!$avenant) {
            Log::warning("Avenant non trouvé: ID {$id}");
            return response()->json(['message' => 'Avenant non trouvé.'], 404);
        }
        Log::info("Avenant trouvé: ID {$id}");

        // --- Format the response data to match Frontend expectations ---
        $responseData = [
            'id' => $avenant->id,

            // --- MERGED: LIFECYCLE FIELDS ---
            'code' => $avenant->code,
            'annee_avenant' => $avenant->annee_avenant,
            'session' => $avenant->session,
            'numero_approbation' => $avenant->numero_approbation,
            'statut' => $avenant->statut,
            'date_visa' => $avenant->date_visa ? $avenant->date_visa->format('Y-m-d') : null,
            // --- END LIFECYCLE FIELDS ---

            'convention_id' => $avenant->convention_id,
            'numero_avenant' => $avenant->numero_avenant,
            'date_signature' => $avenant->date_signature ? $avenant->date_signature->format('Y-m-d') : null,
            'objet' => $avenant->objet,
            'type_modification' => $avenant->type_modification,
            'montant_modifie' => $avenant->montant_modifie,
            'nouvelle_date_fin' => $avenant->nouvelle_date_fin ? $avenant->nouvelle_date_fin->format('Y-m-d') : null,
            'id_fonctionnaire' => $avenant->id_fonctionnaire,
            'remarques' => $avenant->remarques,
            'date_creation' => $avenant->date_creation ? $avenant->date_creation->toIso8601String() : null,

            // Include convention data if loaded
            'convention' => $avenant->relationLoaded('convention') ? $avenant->convention : null,
        ];

        // Format Documents
        $appBaseUrl = rtrim(config('app.url', 'http://localhost:8000'), '/');
        $responseData['documents'] = [];
        if ($avenant->relationLoaded('documents')) {
            $responseData['documents'] = $avenant->documents->map(function ($doc) use ($appBaseUrl) {
                return [
                    'Id_Doc' => $doc->Id_Doc,
                    'Intitule' => $doc->Intitule,
                    'file_name' => $doc->file_name,
                    'file_type' => $doc->file_type,
                    'file_size' => $doc->file_size,
                    'file_path' => $doc->file_path, // Original path
                    // Construct the full, accessible URL for the frontend
                    'fichier_url' => $doc->file_path ? $appBaseUrl . '/' . ltrim($doc->file_path, '/') : null,
                ];
            })->all();
        }

        // Format Partner Commitments to match EXACT frontend expectation
        $responseData['partner_commitments'] = [];
        if ($avenant->relationLoaded('partnerCommitments')) {
            $responseData['partner_commitments'] = $avenant->partnerCommitments->map(function ($pc) {
                // Basic check if the nested partenaire relationship loaded correctly
                $partnerData = null;
                if ($pc->relationLoaded('partenaire') && $pc->partenaire) {
                    $partnerData = [
                        'Id' => $pc->partenaire->Id,
                        'Description' => $pc->partenaire->Description,
                        'Description_Arr' => $pc->partenaire->Description_Arr,
                        // Include other partner fields here if needed
                    ];
                } else {
                    Log::warning("Partenaire non chargé pour ConvPart ID: " . ($pc->Id_CP ?? 'N/A') . " Avenant ID: " . $pc->avenant_id);
                }

                return [
                    // Use EXACT keys expected by the frontend form's mapping logic
                    'Id_Partenaire' => $pc->Id_Partenaire,
                    'Montant_Convenu' => $pc->Montant_Convenu,
                    'is_signatory' => (bool) $pc->is_signatory, // Ensure boolean type
                    'date_signature' => $pc->date_signature ? $pc->date_signature->format('Y-m-d') : null,
                    'details_signature' => $pc->details_signature,
                    'partenaire' => $partnerData, // Include the nested partner object
                    // Include the ConvPart primary key if useful for the frontend
                    'Id_CP' => $pc->Id_CP ?? null,
                ];
            })->values()->all();
        }

        Log::debug("Avenant données formatées AVANT réponse JSON:", $responseData);

        // Return the manually formatted data structure, wrapped in an 'avenant' key
        return response()->json(['avenant' => $responseData]);

    } catch (\Exception $e) {
        Log::error("Erreur de récupération de l'avenant ID {$id}:", [
            'message' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
        return response()->json(['message' => 'Erreur serveur lors de la récupération de l\'avenant.'], 500);
    }
}
    /**
     * Update the specified resource in storage.
     * POST /api/avenants/{id} (with _method: 'PUT')
     * MERGED: Handles optional new `fichiers`, deletion via `fichiers_to_delete`, stores in public/uploads/avenants/{id}.
     * `objet` is nullable. `id_fonctionnaire` is updatable. Partner label uses Description_Arr fallback.
     */
    public function update(Request $request, string $id)
    {
        Log::info("Avenant update request reçue pour ID {$id} (direct public)...");
        Log::debug('Données brutes MAJ:', $request->all()); Log::debug('Fichiers reçus MAJ:', $request->allFiles());

        $avenant = Avenant::find($id);
        if (!$avenant) { Log::error("Avenant non trouvé pour MAJ: ID {$id}"); return response()->json(['message' => 'Avenant non trouvé.'], 404); }

        // --- Validation ---
        try {
             $partnerCommitmentsInput = json_decode($request->input('avenant_partner_commitments', '[]'), true);
             if (json_last_error() !== JSON_ERROR_NONE) { throw ValidationException::withMessages(['avenant_partner_commitments' => 'Format JSON invalide.']); }

            // ** Validation rules for files are nullable **
            $validatedData = $request->validate([
                'convention_id' => 'sometimes|required|integer|exists:convention,id', // Usually not changed
                'numero_avenant' => ['required', 'string', 'max:50', Rule::unique('avenants')->ignore($avenant->id)->where('convention_id', $avenant->convention_id)],
                'date_signature' => 'required|date_format:Y-m-d',
                'objet' => 'nullable|string', // MERGED: Changed from 'required' to 'nullable'
                'type_modification' => ['required', Rule::in($this->modificationTypes)],
                'montant_modifie' => ['nullable', 'numeric', 'min:0', Rule::requiredIf(fn () => $request->input('type_modification') === 'montant')],
                'nouvelle_date_fin' => ['nullable', 'date_format:Y-m-d', Rule::requiredIf(fn () => $request->input('type_modification') === 'durée')],
                'remarques' => 'nullable|string',
                'annee_avenant' => 'required|integer|digits:4',
            'session' => 'required|integer|between:1,12',
            'numero_approbation' => 'required|string|max:100',
            'statut' => 'required|string|max:50',
            'date_visa' => ['nullable', 'date_format:Y-m-d', 'required_if:statut,visé'],
                'id_fonctionnaire'=>'nullable|string', // MERGED: Ensure validation rule is present
                'fichiers' => 'nullable|array', // New files optional
                'fichiers.*' => 'nullable|file|mimes:pdf,doc,docx,jpg,jpeg,png,xls,xlsx|max:10240', // Validate IF provided
                'fichiers_to_delete' => 'nullable|array', // Use the key from frontend state
                'fichiers_to_delete.*' => 'string|distinct', // IDs to delete
                'avenant_partner_commitments' => ['nullable', 'string', Rule::requiredIf(fn () => $request->input('type_modification') === 'partenaire')],
            ], [ // French Messages
                 'required' => 'Le champ :attribute est obligatoire.',
                 'unique'   => ':attribute déjà utilisé pour cette convention.',
                 'exists'   => ':attribute invalide.',
                 'array'    => ':attribute doit être une liste.',
                 'file'     => ':attribute doit être un fichier valide.',
                 'mimes'    => 'Type fichier :attribute invalide (:values).',
                 'date_format' => 'Format date :attribute invalide (AAAA-MM-JJ).',
                 'max.file' => ':attribute max :max Ko.',
                 'fichiers_to_delete.*.string' => 'ID de fichier à supprimer invalide.',
                 'fichiers_to_delete.*.distinct' => 'IDs de fichier à supprimer dupliqués.',
                 'avenant_partner_commitments.requiredIf' => 'Détails partenaires requis pour ce type.',
             ]);

            // Detailed partner validation
            if ($validatedData['type_modification'] === 'partenaire') {
                 if (!is_array($partnerCommitmentsInput) || empty($partnerCommitmentsInput)) { throw ValidationException::withMessages(['avenant_partner_commitments' => 'Au moins un engagement requis.']); }
                 foreach ($partnerCommitmentsInput as $index => $commitment) {
                     // Keep detailed partner validation as it was consistent
                     if (!is_array($commitment) || !isset($commitment['id'], $commitment['is_signatory'])) { throw ValidationException::withMessages(["avenant_partner_commitments.{$index}" => "Données partenaire #".($index+1)." incomplètes."]); }
                     $commitmentValidator = Validator::make($commitment, [
                         'id' => 'required|integer|exists:partenaire,Id', 'montant' => 'nullable|numeric|min:0',
                         'is_signatory' => 'required|boolean', 'date_signature' => ['nullable', 'date_format:Y-m-d', Rule::requiredIf($commitment['is_signatory'] ?? false)],
                         'details_signature' => ['nullable', 'string', 'max:1000']], [ /* Specific partner messages */
                            'id.required' => 'ID partenaire manquant (engagement #'.($index + 1).').',
                            'id.exists' => 'ID partenaire invalide (engagement #'.($index + 1).').',
                            'is_signatory.required' => 'Statut signataire requis (engagement #'.($index + 1).').',
                            'date_signature.required_if' => 'Date signature requise si signataire (engagement #'.($index + 1).').',
                         ]);
                     if ($commitmentValidator->fails()) { throw ValidationException::withMessages(["avenant_partner_commitments.{$index}" => "Erreur engagement #".($index + 1).": " . $commitmentValidator->errors()->first()]); }
                 }
             }
             Log::info('Validation MAJ avenant réussie (direct public).');
        } catch (ValidationException $e) { Log::error('Échec validation MAJ avenant:', ['errors' => $e->errors()]); return response()->json(['message' => 'Erreur de validation.', 'errors' => $e->errors()], 422); }

        $newlyCreatedDocumentsInfo = []; // Track relative PUBLIC paths
        $pathsToDeletePhysically = [];   // Track relative PUBLIC paths

        // 1. Process File Deletions Check (before transaction)
        $validFilesToDeleteIds = [];
        if (!empty($validatedData['fichiers_to_delete'])) {
            $requestedDeleteIds = $validatedData['fichiers_to_delete'];
            Log::info("Traitement fichiers à supprimer pour Avenant ID {$id}: IDs " . implode(', ', $requestedDeleteIds));
            $validDocsToDelete = Document::where('avenant_id', $id)->whereIn('Id_Doc', $requestedDeleteIds)->get();

            if (count($validDocsToDelete) !== count($requestedDeleteIds)) {
                $invalidIds = array_diff($requestedDeleteIds, $validDocsToDelete->pluck('Id_Doc')->toArray());
                Log::warning("Tentative suppression IDs fichiers invalides/non associés Avenant {$id}: [" . implode(', ', $invalidIds) . "]");
            }
            foreach($validDocsToDelete as $doc) {
                $validFilesToDeleteIds[] = $doc->Id_Doc;
                if ($doc->file_path) {
                    $pathsToDeletePhysically[] = $doc->file_path;
                } else { Log::warning("Chemin fichier manquant pour Doc ID {$doc->Id_Doc} à supprimer."); }
            }
            Log::info("Fichiers valides à supprimer identifiés: IDs " . implode(', ', $validFilesToDeleteIds));
        }
         $sessionFormatted = str_pad($validatedData['session'], 2, '0', STR_PAD_LEFT);
    $generatedCode = sprintf(
        '%s/%s/%s',
        $validatedData['numero_approbation'],
        $sessionFormatted,
        $validatedData['annee_avenant']
         );
        DB::beginTransaction(); Log::info('Transaction DB démarrée (avenant update - direct public).');
        try {
            // Define target directory
            $targetDirRelative = 'uploads/avenants/' . $avenant->id;
            $targetDirAbsolute = public_path($targetDirRelative);

            // 1a. Delete Document DB Records inside transaction
            if (!empty($validFilesToDeleteIds)) {
                $deletedDbCount = Document::destroy($validFilesToDeleteIds);
                Log::info("Supprimé {$deletedDbCount} enregistrement(s) Document DB.");
            }

            // 1b. Ensure Target Directory Exists for potential new uploads
            if ($request->hasFile('fichiers') && !empty($validatedData['fichiers'])) {
                if (!File::isDirectory($targetDirAbsolute)) { if (!File::makeDirectory($targetDirAbsolute, 0775, true, true)) { throw new \Exception("Impossible créer dossier avenant MAJ."); } }
                if (!File::isWritable($targetDirAbsolute)) { throw new \Exception("Permissions écriture manquantes dossier avenant MAJ."); }
            }

            // 2. Handle New File Uploads (if any) - Move to public path
            if ($request->hasFile('fichiers') && !empty($validatedData['fichiers'])) {
                Log::info('Traitement nouveaux fichiers pour MAJ (direct public)...');
                foreach ($validatedData['fichiers'] as $index => $file) {
                     if ($file instanceof \Illuminate\Http\UploadedFile && $file->isValid()) {
                         $originalName = $file->getClientOriginalName(); $mimeType = $file->getClientMimeType() ?: 'application/octet-stream'; $size = $file->getSize();
                         $safeOriginalName = preg_replace('/[^A-Za-z0-9\._-]/', '_', $originalName);
                         $generatedFilename = date('Ymd-His') . '_' . Str::random(5) . '_' . $safeOriginalName;
                         try {
                            $file->move($targetDirAbsolute, $generatedFilename);
                            $storedRelativePublicPath = $targetDirRelative . '/' . $generatedFilename;
                            Log::info("Nouveau fichier #{$index} déplacé:", ['path' => $storedRelativePublicPath]);
                            $newlyCreatedDocumentsInfo[] = ['path' => $storedRelativePublicPath];

                            $document = Document::create([
                                'avenant_id' => $avenant->id, 'Id_Conv' => null, 'Id_Doc' => 'avdoc_' . Str::uuid()->toString(),
                                'Intitule' => ($validatedData['objet'] ?? 'Avenant '.$avenant->id) . " - Fichier Ajouté", // Handle nullable objet
                                'file_name' => $originalName,
                                'file_type' => $mimeType, 'file_size' => $size, 'file_path' => $storedRelativePublicPath
                            ]);
                            Log::info("Nouveau Document créé MAJ: ID {$document->Id_Doc}");
                         } catch (\Symfony\Component\HttpFoundation\File\Exception\FileException $e) { Log::error(">>> Échec move() nouveau fichier '{$originalName}' (update): " . $e->getMessage()); throw new \Exception("Échec critique déplacement fichier '{$originalName}'."); }
                     } else { Log::warning("Nouveau fichier invalide/null [{$index}] (update), ignoré."); }
                }
            } else { Log::info('Aucun nouveau fichier (update).'); }

            // 3. Update Avenant Basic Data
            // Use Arr::except on $validatedData which now includes id_fonctionnaire if provided
            $avenantUpdateData = Arr::except($validatedData, ['fichiers', 'fichiers_to_delete', 'avenant_partner_commitments']);
            $avenantUpdateData['code'] = $generatedCode;

            Log::info('MAJ enregistrement Avenant data...', $avenantUpdateData); // Log the data being updated
            $avenant->update($avenantUpdateData);
            Log::info("Enregistrement Avenant MAJ: ID {$avenant->id}");

            // 4. Sync Partner Commitments
            Log::info("Sync engagements partenaires (update)...");
            if ($validatedData['type_modification'] === 'partenaire') {
                 $deletedCount = ConvPart::where('avenant_id', $avenant->id)->delete();
                 Log::info("Supprimé {$deletedCount} enregistrement(s) ConvPart existant(s).");
                 if (!empty($partnerCommitmentsInput)) {
                     foreach ($partnerCommitmentsInput as $commitment) {
                        if (!isset($commitment['id'], $commitment['is_signatory'])) { continue; }
                         ConvPart::create([
                             'Id_Convention' => $avenant->convention_id, 'Id_Partenaire' => $commitment['id'], 'avenant_id' => $avenant->id,
                             'Montant_Convenu' => $commitment['montant'] ?? null, 'is_signatory' => $commitment['is_signatory'],
                             'date_signature' => ($commitment['is_signatory'] && !empty($commitment['date_signature'])) ? $commitment['date_signature'] : null,
                             'details_signature' => ($commitment['is_signatory'] && !empty($commitment['details_signature'])) ? $commitment['details_signature'] : null,
                         ]);
                     }
                     Log::info("Recréé " . count($partnerCommitmentsInput) . " enregistrement(s) ConvPart.");
                 } else { Log::info("Pas de détails partenaires fournis MAJ, aucun créé."); }
             } else {
                  $deletedCount = ConvPart::where('avenant_id', $avenant->id)->delete();
                  if ($deletedCount > 0) Log::info("Type modifié != 'partenaire'. Supprimé {$deletedCount} enregistrement(s) ConvPart existant(s).");
             }

            DB::commit(); Log::info('Transaction DB validée (avenant update - direct public).');

            // 5. Delete OLD physical files AFTER successful commit
            if (!empty($pathsToDeletePhysically)) {
                 Log::info("Tentative suppression " . count($pathsToDeletePhysically) . " ancien(s) fichier(s) physique(s) (public)...");
                 foreach($pathsToDeletePhysically as $relativePath) {
                     $absolutePath = public_path($relativePath);
                     try { if (File::exists($absolutePath)) { if(File::delete($absolutePath)) { Log::info("Ancien fichier physique supprimé: {$absolutePath}"); } else { Log::error("File::delete a échoué pour (public): {$absolutePath}"); } } else { Log::warning("Chemin fichier non trouvé suppression (public): '{$absolutePath}'"); } }
                     catch (\Exception $fsEx) { Log::error("Erreur suppression fichier physique (public): {$absolutePath}", ['exception' => $fsEx]); }
                 }
            }

            // --- Return Success Response ---
            $avenant->refresh()->load(['convention', 'documents', 'partnerCommitments.partenaire']);
            // Manually construct URLs
            $appBaseUrl = rtrim(config('app.url', 'http://localhost:8000:80'), '/');
            $responseData = $avenant->toArray();
            if (isset($responseData['documents'])) { foreach ($responseData['documents'] as &$doc) { $doc['fichier_url'] = $doc['file_path'] ? $appBaseUrl . '/' . ltrim($doc['file_path'], '/') : null; } unset($doc); }
             // Manually format partners
            if (isset($responseData['partner_commitments']) && $avenant->relationLoaded('partnerCommitments')) {
                 $responseData['partner_commitments'] = $avenant->partnerCommitments->map(function ($pc) {
                     $sigDate = $pc->date_signature ? $pc->date_signature->format('Y-m-d') : null;
                     return [
                         'Id_CP' => $pc->Id_CP ?? null, 'Id_Partenaire' => $pc->Id_Partenaire,
                         // MERGED: Use Description_Arr fallback
                         'label' => optional($pc->partenaire)->Description ?? optional($pc->partenaire)->Description_Arr ?? "ID: {$pc->Id_Partenaire}",
                         'Montant_Convenu' => $pc->Montant_Convenu, 'is_signatory' => (bool) $pc->is_signatory, 'date_signature' => $sigDate, 'details_signature' => $pc->details_signature ];
                 })->values()->all();
             } else { $responseData['partner_commitments'] = []; }
            return response()->json(['success' => 'Avenant Modifié!', 'avenant' => $responseData], 200);

        // --- Catch Blocks ---
        } catch (\Exception $e) {
            DB::rollBack(); Log::error('ERREUR MAJ avenant (direct public):', ['id' => $id, 'message' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            // Cleanup newly created public files
            foreach ($newlyCreatedDocumentsInfo as $docInfo) { $absolutePath = public_path($docInfo['path']); if (!empty($docInfo['path']) && File::exists($absolutePath)) { try { File::delete($absolutePath); Log::warning("Rollback fichier ajouté (public): supprimé {$absolutePath}"); } catch (\Exception $ex) { Log::error("Echec suppression fichier {$absolutePath} (rollback): ". $ex->getMessage()); } } }
            $statusCode = ($e instanceof ValidationException) ? 422 : 500;
            return response()->json(['message' => 'Erreur lors modification.', "error" => $e->getMessage(), "errors" => ($e instanceof ValidationException) ? $e->errors() : null ], $statusCode);
        }
    }

    /**
     * Remove the specified resource from storage.
     * DELETE /api/avenants/{id}
     * MERGED: Deletes files from public directory and attempts to remove empty avenant directory. (No difference between codes here)
     */
    public function destroy(string $id)
    {
        Log::info("Attempting to delete avenant ID: {$id} (direct public)...");
        // Find avenant WITH documents to get file paths BEFORE deleting DB record
        $avenantToDelete = Avenant::with('documents')->find($id);

        if (!$avenantToDelete) {
            Log::warning("Avenant not found for deletion: ID {$id}");
            return response()->json(['message' => 'Avenant non trouvé.'], 404);
        }

        // Collect paths relative to PUBLIC directory for physical deletion later
        $pathsToDeletePhysically = [];
        $targetDirRelative = 'uploads/avenants/' . $avenantToDelete->id;

        foreach($avenantToDelete->documents as $doc) {
            if($doc->file_path) {
                if (str_starts_with($doc->file_path, $targetDirRelative)) {
                    $absolutePath = public_path($doc->file_path);
                    if (File::exists($absolutePath)) {
                        $pathsToDeletePhysically[] = $doc->file_path;
                    } else {
                        Log::warning("Physical file not found at expected location (destroy): '{$absolutePath}' for Doc ID {$doc->Id_Doc}");
                    }
                } else {
                     Log::warning("Document file_path '{$doc->file_path}' does not match expected structure '{$targetDirRelative}/...' for Doc ID {$doc->Id_Doc}. Skipping physical delete check for this path.");
                }
            } else {
                 Log::warning("Document record (ID: {$doc->Id_Doc}) has empty file_path. Cannot delete physical file.");
            }
        }
        Log::info("Collected " . count($pathsToDeletePhysically) . " relative public file path(s) to delete.");

        DB::beginTransaction();
        Log::info("Database transaction started for avenant deletion. ID: {$id}");
        try {
            // 1. Delete related ConvPart records first
            $deletedConvParts = ConvPart::where('avenant_id', $id)->delete();
            Log::info("Deleted {$deletedConvParts} ConvPart records linked to Avenant ID {$id}.");

            // 2. Delete related Document records
            $deletedDocsCount = $avenantToDelete->documents()->delete();
            Log::info("Deleted {$deletedDocsCount} Document database record(s).");

            // 3. Delete the Avenant record itself
            $avenantToDelete->delete();
            Log::info("Deleted Avenant record: ID {$id}.");

            // 4. Commit Transaction
            DB::commit();
            Log::info("Database transaction committed for deletion. ID: {$id}");

            // 5. Delete physical files AFTER successful commit
            if (!empty($pathsToDeletePhysically)) {
                Log::info("Attempting to delete " . count($pathsToDeletePhysically) . " physical file(s) from public directory...");
                 foreach ($pathsToDeletePhysically as $relativePath) {
                     $absolutePath = public_path($relativePath);
                     try {
                         if (File::exists($absolutePath)) {
                             if(File::delete($absolutePath)) { Log::info("Physical file deleted: {$absolutePath}"); }
                             else { Log::error("File::delete failed for (public): {$absolutePath}"); }
                         } else {
                             Log::warning("Physical file not found at deletion time (public): '{$absolutePath}'");
                         }
                     } catch (\Exception $storageEx) {
                         Log::error("Error deleting physical file (public): {$absolutePath}", ['exception' => $storageEx]);
                     }
                 }

                 // 6. Attempt to remove the specific avenant directory if it's now empty
                 $avenantDirPathAbsolute = public_path($targetDirRelative);
                 if (File::isDirectory($avenantDirPathAbsolute) && count(File::allFiles($avenantDirPathAbsolute)) === 0) {
                      Log::info("Attempting to delete empty avenant directory: {$avenantDirPathAbsolute}");
                     try {
                         if (File::deleteDirectory($avenantDirPathAbsolute)) {
                             Log::info("Empty avenant directory deleted successfully: {$avenantDirPathAbsolute}");
                         } else {
                             Log::warning("Failed to delete empty avenant directory (returned false): {$avenantDirPathAbsolute}");
                         }
                     } catch (\Exception $dirEx) {
                         Log::error("Error deleting empty avenant directory: {$avenantDirPathAbsolute}", ['exception' => $dirEx]);
                     }
                 } else {
                      Log::info("Avenant directory not deleted (either not empty or doesn't exist): {$avenantDirPathAbsolute}");
                 }

            } else {
                Log::info("No physical files (in public path) needed deletion for Avenant ID {$id}.");
            }

            return response()->json(['success' => 'Avenant Supprimé!', 'message' => 'Suppression réussie.'], 200);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error during avenant deletion:', ['id' => $id, 'message' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            return response()->json(['message' => 'Erreur lors de la suppression.', 'error' => $e->getMessage()], 500);
        }
    }

} // End of Controller Class