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

// In app/Http/Controllers/AvenantController.php

public function index(Request $request)
{
    Log::info('Fetching all avenants...');
    try {
        $query = Avenant::query();

        // Define the relationships to load for the list view.
        // We include engagementsAnnuels here as well for potential future use or consistency.
        $relationsToLoad = [
            'convention:id,Code,Intitule', // Optimize by selecting only needed columns
            'documents',
            'partnerCommitments.partenaire:Id,Description,Description_Arr',
            'partnerCommitments.engagementsAnnuels'
        ];

        // Allow frontend to override includes if necessary (optional)
        if ($request->filled('include')) {
            // Basic security: only allow loading of predefined relations
            $allowedIncludes = ['convention', 'documents', 'partnerCommitments', 'partnerCommitments.partenaire', 'partnerCommitments.engagementsAnnuels'];
            $requestedIncludes = explode(',', $request->input('include'));
            $relationsToLoad = array_intersect($allowedIncludes, $requestedIncludes);
        }
        
        $query->with($relationsToLoad);

        // Filter by convention_id if provided
        if ($request->has('convention_id')) {
            $query->where('convention_id', $request->input('convention_id'));
        }

        $avenants = $query->latest('date_creation')->get();
        Log::info('Successfully fetched ' . $avenants->count() . ' avenants.');

        // Format the collection for the response
        $appBaseUrl = rtrim(config('app.url', 'http://localhost:8000'), '/');

        $avenants->each(function ($avenant) use ($appBaseUrl) {
            // Add 'fichier_url' to each document
            if ($avenant->relationLoaded('documents')) {
                $avenant->documents->each(function ($doc) use ($appBaseUrl) {
                    $doc->fichier_url = $doc->file_path ? $appBaseUrl . '/' . ltrim($doc->file_path, '/') : null;
                });
            }
        });

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
    Log::info('Avenant store request received...');
    Log::debug('Raw Request Data:', $request->all());

    // --- Decode Inputs ---
    $partnerCommitmentsInput = json_decode($request->input('avenant_partner_commitments', '[]'), true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        return response()->json(['message' => 'Format JSON des engagements partenaires est invalide.'], 400);
    }

    // --- Main Validation ---
    try {
        $validatedData = $request->validate([
            'convention_id' => 'required|integer|exists:convention,id',
            'numero_avenant' => ['required', 'string', 'max:50', Rule::unique('avenants')->where('convention_id', $request->input('convention_id'))],
            'date_signature' => 'required|date_format:Y-m-d',
            'annee_avenant' => 'required|integer|digits:4',
            'session' => 'required|integer|between:1,12',
            'numero_approbation' => 'required|string|max:100',
            'statut' => 'required|string|max:50',
            'date_visa' => ['nullable', 'date_format:Y-m-d', 'required_if:statut,visé'],
            'objet' => 'nullable|string',
            'type_modification' => ['required', Rule::in($this->modificationTypes)],
            'montant_modifie' => ['nullable', 'numeric', 'min:0', Rule::requiredIf(fn () => $request->input('type_modification') === 'montant')],
            'nouvelle_date_fin' => ['nullable', 'date_format:Y-m-d', Rule::requiredIf(fn () => $request->input('type_modification') === 'durée')],
            'remarques' => 'nullable|string',
            'id_fonctionnaire' => 'nullable|string',
            'fichiers' => 'nullable|array',
            'fichiers.*' => 'nullable|file|mimes:pdf,doc,docx,jpg,jpeg,png,xls,xlsx|max:10240',
            'avenant_partner_commitments' => ['nullable', 'string', Rule::requiredIf(fn () => $request->input('type_modification') === 'partenaire')],
        ], [
            // Your custom French messages here...
            'required' => 'Le champ :attribute est obligatoire.',
        ]);

        // --- Detailed Partner Commitment Validation ---
        if ($validatedData['type_modification'] === 'partenaire') {
            if (!is_array($partnerCommitmentsInput) || empty($partnerCommitmentsInput)) {
                throw ValidationException::withMessages(['avenant_partner_commitments' => 'Au moins un engagement est requis pour ce type de modification.']);
            }
            foreach ($partnerCommitmentsInput as $index => $commitment) {
                if (!is_array($commitment) || !isset($commitment['id'], $commitment['is_signatory'])) {
                    throw ValidationException::withMessages(["avenant_partner_commitments.{$index}" => "Données de base manquantes pour l'engagement #" . ($index + 1) . "."]);
                }
                $commitmentValidator = Validator::make($commitment, [
                    'id' => 'required|integer|exists:partenaire,Id',
                    'montant' => 'required_if:autre_engagement,null|nullable|numeric|min:0',
                    'autre_engagement' => 'required_if:montant,null|nullable|string|max:5000',
                    'is_signatory' => 'required|boolean',
                    'date_signature' => ['nullable', 'date_format:Y-m-d', Rule::requiredIf($commitment['is_signatory'] ?? false)],
                    'details_signature' => ['nullable', 'string', 'max:1000'],
                ], [
                    'montant.required_if' => 'Un montant ou une description est requis (engagement #' . ($index + 1) . ').',
                    'autre_engagement.required_if' => 'Une description ou un montant est requis (engagement #' . ($index + 1) . ').',
                ]);
                if ($commitmentValidator->fails()) {
                    throw ValidationException::withMessages(["avenant_partner_commitments.{$index}" => "Erreur engagement #" . ($index + 1) . ": " . $commitmentValidator->errors()->first()]);
                }
            }
        }
        Log::info('Validation avenant réussie (store).');
    } catch (ValidationException $e) {
        Log::error('Échec validation avenant (store):', ['errors' => $e->errors()]);
        return response()->json(['message' => 'Erreur de validation.', 'errors' => $e->errors()], 422);
    }

    $avenant = null;
    $createdDocumentsInfo = [];
    $sessionFormatted = str_pad($validatedData['session'], 2, '0', STR_PAD_LEFT);
    $generatedCode = sprintf('%s/%s/%s', $validatedData['numero_approbation'], $sessionFormatted, $validatedData['annee_avenant']);

    DB::beginTransaction();
    Log::info('Transaction DB démarrée (avenant store).');
    try {
        $avenantData = Arr::except($validatedData, ['fichiers', 'avenant_partner_commitments']);
        $avenantData['code'] = $generatedCode;
        $avenant = Avenant::create($avenantData);
        Log::info("Avenant créé: ID {$avenant->id}");

        $targetDirRelative = 'uploads/avenants/' . $avenant->id;
        $targetDirAbsolute = public_path($targetDirRelative);

        if ($request->hasFile('fichiers')) {
            File::makeDirectory($targetDirAbsolute, 0775, true, true);
            foreach ($request->file('fichiers') as $file) {
                if ($file->isValid()) {
                    $originalName = $file->getClientOriginalName();
                    $safeName = preg_replace('/[^A-Za-z0-9\._-]/', '_', $originalName);
                    $generatedFilename = date('Ymd-His') . '_' . Str::random(5) . '_' . $safeName;
                    
                    // --- FIX: Get file info BEFORE moving it ---
                    $fileSize = $file->getSize();
                    $fileMimeType = $file->getClientMimeType();
                    
                    $file->move($targetDirAbsolute, $generatedFilename);
                    $storedPath = $targetDirRelative . '/' . $generatedFilename;
                    $createdDocumentsInfo[] = ['path' => $storedPath];
                    Document::create([
                        'avenant_id' => $avenant->id,
                        'Id_Doc' => 'avdoc_' . Str::uuid()->toString(),
                        'Intitule' => pathinfo($originalName, PATHINFO_FILENAME),
                        'file_name' => $originalName,
                        'file_type' => $fileMimeType, // Use variable
                        'file_size' => $fileSize,     // Use variable
                        'file_path' => $storedPath
                    ]);
                }
            }
        }

        if ($validatedData['type_modification'] === 'partenaire' && !empty($partnerCommitmentsInput)) {
            foreach ($partnerCommitmentsInput as $commitment) {
                $convPart = ConvPart::create([
                    'Id_Convention' => $avenant->convention_id,
                    'Id_Partenaire' => $commitment['id'],
                    'avenant_id' => $avenant->id,
                    'Montant_Convenu' => $commitment['montant'] ?? null,
                    'autre_engagement' => $commitment['autre_engagement'] ?? null,
                    'is_signatory' => $commitment['is_signatory'],
                    'date_signature' => ($commitment['is_signatory'] && !empty($commitment['date_signature'])) ? $commitment['date_signature'] : null,
                    'details_signature' => ($commitment['is_signatory'] && !empty($commitment['details_signature'])) ? $commitment['details_signature'] : null,
                ]);

                if (isset($commitment['engagements_annuels']) && is_array($commitment['engagements_annuels']) && !empty($commitment['montant'])) {
                    foreach ($commitment['engagements_annuels'] as $engagementAnnuelData) {
                        if (isset($engagementAnnuelData['annee']) && isset($engagementAnnuelData['montant_prevu']) && is_numeric($engagementAnnuelData['montant_prevu'])) {
                            $convPart->engagementsAnnuels()->create([
                                'annee' => $engagementAnnuelData['annee'],
                                'montant_prevu' => $engagementAnnuelData['montant_prevu']
                            ]);
                        }
                    }
                }
            }
            Log::info(count($partnerCommitmentsInput) . " enregistrement(s) ConvPart créé(s) pour l'avenant.");
        }

        DB::commit();
        Log::info('Transaction DB validée (avenant store).');

        $avenant->load(['convention', 'documents', 'partnerCommitments.partenaire', 'partnerCommitments.engagementsAnnuels']);
        return response()->json(["success" => "Avenant ajouté!", "message" => "Avenant ajouté!", "avenant" => $avenant], 201);

    } catch (\Exception $e) {
        DB::rollBack();
        Log::error('ERREUR création avenant:', ['message' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
        foreach ($createdDocumentsInfo as $docInfo) {
            $absolutePath = public_path($docInfo['path']);
            if (File::exists($absolutePath)) File::delete($absolutePath);
        }
        $statusCode = ($e instanceof ValidationException) ? 422 : 500;
        return response()->json(["message" => "Échec de la création.", "error" => $e->getMessage(), "errors" => ($e instanceof ValidationException) ? $e->errors() : null], $statusCode);
    }
}


// In app/Http/Controllers/AvenantController.php

public function show(Request $request, string $id)
{
    Log::info("Fetching avenant with ID: {$id}...");
    try {
        $avenant = Avenant::find($id);

        if (!$avenant) {
            Log::warning("Avenant not found: ID {$id}");
            return response()->json(['message' => 'Avenant non trouvé.'], 404);
        }

        // Eager load all necessary relationships for a detailed view
        $avenant->load([
            'convention',
            'documents',
            'partnerCommitments.partenaire',
            'partnerCommitments.engagementsAnnuels' // <<< Load the new relationship
        ]);

        Log::info("Avenant found: ID {$id}, loaded with relationships.");

        // --- Format the response data to match Frontend expectations ---
        $responseData = $avenant->toArray();

        // Remove original relationships to avoid redundancy if formatted differently
        unset($responseData['partner_commitments']);
        unset($responseData['documents']);

        // Format Documents with full, accessible URLs
        $appBaseUrl = rtrim(config('app.url', 'http://localhost:8000'), '/');
        $responseData['documents'] = $avenant->documents->map(function ($doc) use ($appBaseUrl) {
            return [
                'Id_Doc' => $doc->Id_Doc,
                'Intitule' => $doc->Intitule,
                'file_name' => $doc->file_name,
                'file_type' => $doc->file_type,
                'file_size' => $doc->file_size,
                'file_path' => $doc->file_path,
                'fichier_url' => $doc->file_path ? $appBaseUrl . '/' . ltrim($doc->file_path, '/') : null,
            ];
        })->all();

        // Format Partner Commitments to include ALL necessary fields
        $responseData['partner_commitments'] = $avenant->partnerCommitments->map(function ($pc) {
            $partnerData = null;
            if ($pc->partenaire) {
                $partnerData = [
                    'Id' => $pc->partenaire->Id,
                    'Description' => $pc->partenaire->Description,
                    'Description_Arr' => $pc->partenaire->Description_Arr,
                ];
            }

            return [
                'Id_Partenaire' => $pc->Id_Partenaire,
                'Montant_Convenu' => $pc->Montant_Convenu,
                'autre_engagement' => $pc->autre_engagement, // <<< Add this field
                'engagements_annuels' => $pc->engagementsAnnuels, // <<< Add the yearly data
                'is_signatory' => (bool) $pc->is_signatory,
                'date_signature' => $pc->date_signature ? $pc->date_signature->format('Y-m-d') : null,
                'details_signature' => $pc->details_signature,
                'partenaire' => $partnerData,
                'Id_CP' => $pc->Id_CP,
            ];
        })->values()->all();

        Log::debug("Avenant data formatted for JSON response:", $responseData);

        return response()->json(['avenant' => $responseData]);

    } catch (\Exception $e) {
        Log::error("Error fetching avenant ID {$id}:", [
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
    Log::info("Avenant update request reçue pour ID {$id}...");
    $avenant = Avenant::find($id);
    if (!$avenant) {
        return response()->json(['message' => 'Avenant non trouvé.'], 404);
    }

    // --- Decode Inputs ---
    $partnerCommitmentsInput = json_decode($request->input('avenant_partner_commitments', '[]'), true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        return response()->json(['message' => 'Format JSON des engagements partenaires est invalide.'], 400);
    }

    // --- Main Validation ---
    try {
        $validatedData = $request->validate([
            'convention_id' => 'sometimes|required|integer|exists:convention,id',
            'numero_avenant' => ['required', 'string', 'max:50', Rule::unique('avenants')->ignore($avenant->id)->where('convention_id', $avenant->convention_id)],
            'date_signature' => 'required|date_format:Y-m-d',
            'annee_avenant' => 'required|integer|digits:4',
            'session' => 'required|integer|between:1,12',
            'numero_approbation' => 'required|string|max:100',
            'statut' => 'required|string|max:50',
            'date_visa' => ['nullable', 'date_format:Y-m-d', 'required_if:statut,visé'],
            'objet' => 'nullable|string',
            'type_modification' => ['required', Rule::in($this->modificationTypes)],
            'montant_modifie' => ['nullable', 'numeric', 'min:0', Rule::requiredIf(fn () => $request->input('type_modification') === 'montant')],
            'nouvelle_date_fin' => ['nullable', 'date_format:Y-m-d', Rule::requiredIf(fn () => $request->input('type_modification') === 'durée')],
            'remarques' => 'nullable|string',
            'id_fonctionnaire' => 'nullable|string',
            'fichiers' => 'nullable|array',
            'fichiers.*' => 'nullable|file|mimes:pdf,doc,docx,jpg,jpeg,png,xls,xlsx|max:10240',
            'fichiers_to_delete' => 'nullable|array',
            'fichiers_to_delete.*' => 'string|distinct',
            'avenant_partner_commitments' => ['nullable', 'string', Rule::requiredIf(fn () => $request->input('type_modification') === 'partenaire')],
        ], [
             // Your custom French messages here...
             'required' => 'Le champ :attribute est obligatoire.',
        ]);

        // --- Detailed Partner Commitment Validation ---
        if ($validatedData['type_modification'] === 'partenaire') {
            if (!is_array($partnerCommitmentsInput) || empty($partnerCommitmentsInput)) {
                throw ValidationException::withMessages(['avenant_partner_commitments' => 'Au moins un engagement est requis pour ce type de modification.']);
            }
            foreach ($partnerCommitmentsInput as $index => $commitment) {
                if (!is_array($commitment) || !isset($commitment['id'], $commitment['is_signatory'])) {
                    throw ValidationException::withMessages(["avenant_partner_commitments.{$index}" => "Données de base manquantes pour l'engagement #" . ($index + 1) . "."]);
                }
                $commitmentValidator = Validator::make($commitment, [
                    'id' => 'required|integer|exists:partenaire,Id',
                    'montant' => 'required_if:autre_engagement,null|nullable|numeric|min:0',
                    'autre_engagement' => 'required_if:montant,null|nullable|string|max:5000',
                    'is_signatory' => 'required|boolean',
                    'date_signature' => ['nullable', 'date_format:Y-m-d', Rule::requiredIf($commitment['is_signatory'] ?? false)],
                    'details_signature' => ['nullable', 'string', 'max:1000'],
                ], [
                    'montant.required_if' => 'Un montant ou une description est requis (engagement #' . ($index + 1) . ').',
                    'autre_engagement.required_if' => 'Une description ou un montant est requis (engagement #' . ($index + 1) . ').',
                ]);
                if ($commitmentValidator->fails()) {
                    throw ValidationException::withMessages(["avenant_partner_commitments.{$index}" => "Erreur engagement #" . ($index + 1) . ": " . $commitmentValidator->errors()->first()]);
                }
            }
        }
        Log::info('Validation MAJ avenant réussie.');
    } catch (ValidationException $e) {
        Log::error('Échec validation MAJ avenant:', ['errors' => $e->errors()]);
        return response()->json(['message' => 'Erreur de validation.', 'errors' => $e->errors()], 422);
    }

    $newlyCreatedDocumentsInfo = [];
    $pathsToDeletePhysically = [];
    $sessionFormatted = str_pad($validatedData['session'], 2, '0', STR_PAD_LEFT);
    $generatedCode = sprintf('%s/%s/%s', $validatedData['numero_approbation'], $sessionFormatted, $validatedData['annee_avenant']);

    DB::beginTransaction();
    Log::info('Transaction DB démarrée (avenant update).');
    try {
        if (!empty($validatedData['fichiers_to_delete'])) {
            $docsToDelete = Document::where('avenant_id', $id)->whereIn('Id_Doc', $validatedData['fichiers_to_delete'])->get();
            foreach ($docsToDelete as $doc) {
                if ($doc->file_path) $pathsToDeletePhysically[] = $doc->file_path;
            }
            Document::destroy($docsToDelete->pluck('Id_Doc'));
        }

        $targetDirRelative = 'uploads/avenants/' . $avenant->id;
        $targetDirAbsolute = public_path($targetDirRelative);

        if ($request->hasFile('fichiers')) {
            File::makeDirectory($targetDirAbsolute, 0775, true, true);
            foreach ($request->file('fichiers') as $file) {
                if ($file->isValid()) {
                    $originalName = $file->getClientOriginalName();
                    $safeName = preg_replace('/[^A-Za-z0-9\._-]/', '_', $originalName);
                    $generatedFilename = date('Ymd-His') . '_' . Str::random(5) . '_' . $safeName;

                    // --- FIX: Get file info BEFORE moving it ---
                    $fileSize = $file->getSize();
                    $fileMimeType = $file->getClientMimeType();

                    $file->move($targetDirAbsolute, $generatedFilename);
                    $storedPath = $targetDirRelative . '/' . $generatedFilename;
                    $newlyCreatedDocumentsInfo[] = ['path' => $storedPath];
                    Document::create([
                        'avenant_id' => $avenant->id,
                        'Id_Doc' => 'avdoc_' . Str::uuid()->toString(),
                        'Intitule' => pathinfo($originalName, PATHINFO_FILENAME),
                        'file_name' => $originalName,
                        'file_type' => $fileMimeType, // Use variable
                        'file_size' => $fileSize,     // Use variable
                        'file_path' => $storedPath
                    ]);
                }
            }
        }

        $avenantUpdateData = Arr::except($validatedData, ['fichiers', 'fichiers_to_delete', 'avenant_partner_commitments']);
        $avenantUpdateData['code'] = $generatedCode;
        $avenant->update($avenantUpdateData);

        // Sync Partner Commitments
        $avenant->partnerCommitments()->delete(); // Clear existing commitments for this avenant
        if ($validatedData['type_modification'] === 'partenaire' && !empty($partnerCommitmentsInput)) {
            foreach ($partnerCommitmentsInput as $commitment) {
                $convPart = ConvPart::create([
                    'Id_Convention' => $avenant->convention_id,
                    'Id_Partenaire' => $commitment['id'],
                    'avenant_id' => $avenant->id,
                    'Montant_Convenu' => $commitment['montant'] ?? null,
                    'autre_engagement' => $commitment['autre_engagement'] ?? null,
                    'is_signatory' => $commitment['is_signatory'],
                    'date_signature' => ($commitment['is_signatory'] && !empty($commitment['date_signature'])) ? $commitment['date_signature'] : null,
                    'details_signature' => ($commitment['is_signatory'] && !empty($commitment['details_signature'])) ? $commitment['details_signature'] : null,
                ]);

                if (isset($commitment['engagements_annuels']) && is_array($commitment['engagements_annuels']) && !empty($commitment['montant'])) {
                    foreach ($commitment['engagements_annuels'] as $engagementAnnuelData) {
                        if (isset($engagementAnnuelData['annee']) && isset($engagementAnnuelData['montant_prevu']) && is_numeric($engagementAnnuelData['montant_prevu'])) {
                            $convPart->engagementsAnnuels()->create([
                                'annee' => $engagementAnnuelData['annee'],
                                'montant_prevu' => $engagementAnnuelData['montant_prevu']
                            ]);
                        }
                    }
                }
            }
            Log::info("Recréé " . count($partnerCommitmentsInput) . " enregistrement(s) ConvPart pour la MAJ de l'avenant.");
        }

        DB::commit();
        Log::info('Transaction DB validée (avenant update).');

        foreach ($pathsToDeletePhysically as $relativePath) {
            $absolutePath = public_path($relativePath);
            if (File::exists($absolutePath)) File::delete($absolutePath);
        }

        $avenant->refresh()->load(['convention', 'documents', 'partnerCommitments.partenaire', 'partnerCommitments.engagementsAnnuels']);
        return response()->json(['success' => 'Avenant Modifié!', 'avenant' => $avenant], 200);

    } catch (\Exception $e) {
        DB::rollBack();
        Log::error('ERREUR MAJ avenant:', ['id' => $id, 'message' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
        foreach ($newlyCreatedDocumentsInfo as $docInfo) {
            $absolutePath = public_path($docInfo['path']);
            if (File::exists($absolutePath)) File::delete($absolutePath);
        }
        $statusCode = ($e instanceof ValidationException) ? 422 : 500;
        return response()->json(['message' => 'Erreur lors de la modification.', "error" => $e->getMessage(), "errors" => ($e instanceof ValidationException) ? $e->errors() : null], $statusCode);
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