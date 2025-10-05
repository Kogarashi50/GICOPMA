<?php

namespace App\Http\Controllers;

// Required Model imports
use App\Models\Convention;
use App\Models\Programme;
use App\Models\Projet; // Ensure Projet model is imported
use App\Models\Document;
use App\Models\ConvPart;
use App\Models\VersementCP; // Included for update logic
use App\Models\Partenaire;
use Illuminate\Http\JsonResponse;
use Illuminate\Database\Eloquent\ModelNotFoundException; // Included for findOrFail catch

// Required Facades and Classes
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File; // Use File facade for filesystem operations
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;


class ConventionController extends Controller
{
    /**
     * Display a listing of the conventions.
     * GET /api/conventions
     */
    public function index()
    {
        Log::info('Récupération de toutes les conventions...');
        try {
            $conventions = Convention::with([
                    'programme',
                    'projet',
                    'documents',
                    'convParts.partenaire'
                ])
                ->latest()
                ->get();

            Log::info('Récupération réussie de ' . $conventions->count() . ' conventions.');
            $appBaseUrl = rtrim(config('app.url', 'http://localhost'), '/');
            $conventions->each(function ($convention) use ($appBaseUrl) {
                if ($convention->relationLoaded('documents')) {
                    $convention->documents->each(function ($doc) use ($appBaseUrl) {
                        $doc->url = $doc->file_path ? "{$appBaseUrl}/" . ltrim($doc->file_path, '/') : null;
                    });
                }
                 if ($convention->relationLoaded('convParts')) {
                     $convention->formatted_partners = $convention->convParts->map(function($cp){
                         $label = optional($cp->partenaire)->Description_Arr ?? optional($cp->partenaire)->Description ?? "ID:{$cp->Id_Partenaire}";
                         if(optional($cp->partenaire)->Code) {
                             $label = $cp->partenaire->Code . ' - ' . $label;
                         }
                         return $label;
                     })->implode(', ');
                 }
            });

            return response()->json(['conventions' => $conventions]);
        } catch (\Exception $e) {
            Log::error('Erreur lors de la récupération des conventions:', ['message' => $e->getMessage()]);
            return response()->json(['message' => 'Erreur serveur lors de la récupération des conventions.'], 500);
        }
    }

    /**
     * Get conventions formatted for dropdowns.
     * GET /api/conventions/options
     */
    public function getOptions(Request $request)
    {
        Log::info("Fetching Convention options for dropdown...");
        try {
            $query = Convention::select(['id', 'code', 'intitule'])
                       ->orderBy('code', 'asc');
            $conventions = $query->get();
            $options = $conventions->map(function ($conv) {
                $label = $conv->code;
                if (!empty($conv->intitule)) { $label .= ' - ' . Str::limit($conv->intitule, 60, '...'); }
                return ['value' => $conv->id, 'label' => $label];
            });
            Log::info("Returning " . $options->count() . " Convention options.");
            return response()->json($options, 200);
        } catch (\Exception $e) {
            Log::error('Error fetching Convention options: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return response()->json(['message' => 'Erreur chargement options conventions.'], 500);
        }
    }

    /**
     * Get unique partenaires associated with a specific convention, formatted for dropdowns.
     * GET /api/conventions/{convention}/partenaire-options
     */
    public function getPartenaireOptions(Request $request, Convention $convention): JsonResponse
    {
        $conventionId = $convention->id;
        Log::info("API: Fetching Partenaire options for Convention ID: {$conventionId}");
        try {
            $convParts = $convention->convParts()
                           ->with('partenaire:Id,Code,Description,Description_Arr')
                           ->whereHas('partenaire')
                           ->get();
            $uniquePartners = $convParts->pluck('partenaire')->unique('Id')->filter();
            $options = $uniquePartners->map(function ($partenaire) {
                if (!$partenaire) return null;
                $label = $partenaire->Description_Arr ?: ($partenaire->Description ?: ('Partenaire ID: ' . $partenaire->Id));
                if ($partenaire->Code) { $label = $partenaire->Code . ' - ' . $label; }
                return ['value' => $partenaire->Id, 'label' => $label];
            })->filter()->sortBy('label')->values();
            Log::info("API: Returning " . $options->count() . " unique Partenaire options for Convention {$conventionId}.");
            return response()->json($options, 200);
        } catch (\Exception $e) {
            Log::error("Error fetching Partenaire options for Convention {$conventionId}: " . $e->getMessage());
            return response()->json(['message' => 'Erreur chargement des partenaires pour cette convention.'], 500);
        }
    }


    /**
     * Store a newly created convention.
     * POST /api/conventions
     * MERGED & ADJUSTED: Validation matches frontend required fields.
     */
    public function store(Request $request)
    {
        Log::info('Requête de création de convention reçue...');
        Log::debug('Données brutes:', $request->all());
        if ($request->hasFile('fichiers')) { Log::info(count($request->file('fichiers')) . ' fichier(s) reçu(s).'); }
        else { Log::info('Aucun fichier reçu (optionnel).'); }
        if ($request->has('membres_comite_technique') && is_string($request->input('membres_comite_technique'))) {
    $request->merge(['membres_comite_technique' => json_decode($request->input('membres_comite_technique'), true)]);
}
if ($request->has('membres_comite_pilotage') && is_string($request->input('membres_comite_pilotage'))) {
    $request->merge(['membres_comite_pilotage' => json_decode($request->input('membres_comite_pilotage'), true)]);
}
        $partnerCommitmentsInput = json_decode($request->input('partner_commitments', '[]'), true);
        if (json_last_error() !== JSON_ERROR_NONE) { Log::error('Échec décodage JSON engagements.', ['error' => json_last_error_msg()]); return response()->json(['message' => 'Format invalide pour les engagements partenaires.'], 400); }
        Log::debug('Engagements partenaires décodés:', $partnerCommitmentsInput);

        // --- Validation Adjusted Based on Frontend Requirements ---
        try {
            $validatedData = $request->validate([
                'numero_approbation' => 'required|string|max:100',
                'session' => 'required|integer|between:1,12',
                'classification_prov' => 'nullable|string',          // Required (*)
                'categorie' => 'nullable|string',                    // Required (*)
                'intitule' => 'required|string',                     // Required (*)
                'reference' => 'nullable|string',                    // Required (*)
                'annee_convention' => 'required|integer|digits:4',   // Required (*)
                'objet' => 'nullable|string',   
                 'type' => ['required', Rule::in(['cadre', 'specifique'])],
                'objectifs' => 'nullable|string',                    // Required (*)
                'localisation' => 'nullable|string',                 // Required (*) (semicolon separated string)
                'maitre_ouvrage' => 'nullable|string',               // Required (*)
                'partenaire' => 'nullable|string',                   // Not Required (simple list)
                'id_fonctionnaire' => 'nullable|string',             // Not Required
                'cout_global' => 'nullable|numeric|min:0',           // Required (*)
                'statut' => 'required|string', 
                'date_visa' => 'nullable|date', // <-- ADD THIS LINE
                'date_reception_vise' => ['nullable', 'date'],
                'duree_convention' => 'nullable|integer|min:0',
                'maitre_ouvrage_delegue' => 'nullable|string',
                'operationalisation' => ['nullable', Rule::in(['Oui', 'Non'])],
                'Id_Programme' => 'nullable|integer|exists:programme,Id', // Required (*)
                'id_projet' => 'nullable|integer|exists:projet,ID_Projet', // *** CHANGED TO REQUIRED *** (*)
                'groupe' => 'nullable|integer',                      // Required (*)
                'rang' => 'nullable|string',                         // Not Required
                'observations' => 'nullable|string|max:20000',       // Not Required
                'membres_comite_technique' => 'nullable|array',
                'membres_comite_technique.*' => 'string|max:255', // Validates each item in the array
                'membres_comite_pilotage' => 'nullable|array',
                'membres_comite_pilotage.*' => 'string|max:255',
                'fichiers' => 'nullable|array',                      // Not Required
                'fichiers.*' => 'nullable|file|mimes:pdf,doc,docx,jpg,jpeg,png,xls,xlsx|max:5120', // Max 5MB
                'partner_commitments' => ['nullable', 'string'],     // Required on store (*) (JSON string)
            ],
            [ // French Messages (Keep existing, add if needed)
                'required' => 'Le champ :attribute est obligatoire.',
                'string'   => 'Le champ :attribute doit être une chaîne.',
                'integer'  => 'Le champ :attribute doit être un entier.',
                'numeric'  => 'Le champ :attribute doit être un nombre.',
                'min'      => 'Le champ :attribute doit être au moins :min.',
                'max'      => [ 'string' => 'Le champ :attribute ne doit pas dépasser :max caractères.', 'file' => 'Le fichier :attribute ne doit pas dépasser :max Ko (5Mo).' ],
                'digits'   => 'Le champ :attribute doit avoir :digits chiffres.',
                'unique'   => 'La valeur du champ :attribute est déjà utilisée.',
                'exists'   => 'La valeur sélectionnée pour :attribute est invalide.',
                'array'    => 'Le champ :attribute doit être une liste.',
                'file'     => 'Le champ :attribute doit être un fichier valide.',
                'mimes'    => 'Type de fichier invalide (:values).',
                'code.unique' => 'Ce code de convention existe déjà.',
                'annee_convention.digits' => 'L\'année doit être AAAA.',
                'Id_Programme.exists' => 'Le programme est invalide.',
                'id_projet.exists' => 'Le projet est invalide.', // Message exists, rule changed to required
                'fichiers.*.file' => 'Chaque fichier doit être valide.',
                'fichiers.*.mimes' => 'Type de fichier invalide. Acceptés: PDF, DOC, DOCX, JPG, PNG, XLS, XLSX.',
                'fichiers.*.max' => 'Chaque fichier ne doit pas dépasser :max Ko (5Mo).',
                'observations.max' => 'Les observations ne doivent pas dépasser :max caractères.',
            ]);
            Log::info('Validation principale réussie (store).');
        } catch (ValidationException $e) {
            Log::error('Échec validation principale (store):', ['errors' => $e->errors()]);
            return response()->json(['message' => 'Données invalides.', 'errors' => $e->errors()], 422);
        }
               $sessionValue = $validatedData['session'] ?? 'NS';
    $sessionFormatted = is_numeric($sessionValue) ? str_pad($sessionValue, 2, '0', STR_PAD_LEFT) : 'NS';

    $validatedData['code'] = sprintf(
        '%s/%s/%s',
        $validatedData['numero_approbation'] ?? 'NA',
        $sessionFormatted,
        $validatedData['annee_convention']
    );

        // --- Partner Commitment Detail Validation ---
        if (!is_array($partnerCommitmentsInput)) { return response()->json(['message' => 'Format invalide pour les engagements (doit être une liste).'], 422); }

        Log::info('Validation détaillée engagements partenaires...');
foreach ($partnerCommitmentsInput as $index => $commitment) {
    // We only check for the fields that are ALWAYS required.
    // The detailed check for Montant vs. Autre is handled by the Validator below.
    if (!is_array($commitment) || !isset($commitment['Id_Partenaire'], $commitment['is_signatory'])) {
         return response()->json(['message' => "Données de base manquantes pour l'engagement #" . ($index + 1) . "."], 422);
    }
           $commitmentValidator = Validator::make($commitment, [
        'Id_Partenaire' => 'required|integer|exists:partenaire,Id',
        
        // If Montant is provided, it must be numeric. It's only required if autre_engagement is missing.
        'Montant_Convenu' => 'required_if:autre_engagement,null|nullable|numeric|min:0',

    // This says: Autre Engagement is required IF Montant_Convenu is NULL or empty. It must also be a string.
    'autre_engagement' => 'required_if:Montant_Convenu,null|nullable|string|max:5000',

        'is_signatory' => 'required|boolean',
        'date_signature' => ['required_if:is_signatory,true', 'nullable', 'date_format:Y-m-d'],
        'details_signature' => ['nullable', 'string', 'max:1000'],
    ], [
        // Add custom messages for the new rules
        'Montant_Convenu.required_without' => 'Un montant ou une description de l\'engagement est requis.',
        'autre_engagement.required_without' => 'Une description ou un montant de l\'engagement est requis.',
    ]);
            if ($commitmentValidator->fails()) { return response()->json(['message' => "Erreur validation engagement #" . ($index + 1) . ".", 'errors' => $commitmentValidator->errors()], 422); }
        }
        Log::info('Validation détaillée engagements partenaires terminée.');

        // --- Database Operations ---
        $convention = null; $createdDocumentsInfo = [];
        $targetDirRelative = 'uploads/conventions'; $targetDirAbsolute = public_path($targetDirRelative);
        DB::beginTransaction();
        Log::info('Transaction DB démarrée (store).');
        try {
             // --- Directory Check ---
             if (!File::isDirectory($targetDirAbsolute)) { if (!File::makeDirectory($targetDirAbsolute, 0775, true, true)) { throw new \Exception("Impossible créer dossier: {$targetDirAbsolute}"); } }
             if (!File::isWritable($targetDirAbsolute)) { throw new \Exception("Permissions écriture manquantes pour: {$targetDirAbsolute}"); }

            // --- Create Convention ---
            $conventionDataForCreate = Arr::except($validatedData, ['fichiers', 'partner_commitments']);
            
            // Ensure foreign keys are passed correctly (already handled by validation mapping)
            Log::info('Création enregistrement Convention...', $conventionDataForCreate);
            $convention = Convention::create($conventionDataForCreate);
            Log::info("Convention créée: ID {$convention->id}");

            // --- Handle File Uploads ---
            if (!empty($validatedData['fichiers']) && is_array($validatedData['fichiers'])) {
                 Log::info(count($validatedData['fichiers']) . ' fichier(s) à traiter.');
                $intitules = $request->input('intitules', $request->input('intitule_file', []));
                foreach ($validatedData['fichiers'] as $index => $file) {
                    if ($file instanceof \Illuminate\Http\UploadedFile && $file->isValid()) {
                        $originalName = $file->getClientOriginalName(); $mimeType = $file->getClientMimeType() ?: 'application/octet-stream'; $size = $file->getSize();
                        $safeOriginalName = preg_replace('/[^A-Za-z0-9\._-]/', '_', $originalName); $generatedFilename = date('Ymd-His') . '_' . Str::random(5) . '_' . $safeOriginalName;
                        try {
                             $file->move($targetDirAbsolute, $generatedFilename);
                             $storedRelativePath = $targetDirRelative . '/' . $generatedFilename;
                             $createdDocumentsInfo[] = ['path' => $storedRelativePath];
                            $documentIntitule = is_array($intitules) && array_key_exists($index, $intitules) && !empty($intitules[$index]) ? $intitules[$index] : pathinfo($originalName, PATHINFO_FILENAME);
                            $documentData = ['Id_Doc' => 'convdoc_' . Str::uuid()->toString(), 'Intitule' => $documentIntitule, 'file_type' => $mimeType, 'file_name' => $originalName, 'file_path' => $storedRelativePath, 'file_size' => $size];
                             $document = $convention->documents()->create($documentData);
                             Log::info("Document associé #{$index} créé: ID {$document->Id_Doc}");
                        } catch (\Symfony\Component\HttpFoundation\File\Exception\FileException $e) { throw new \Exception("Échec déplacement fichier '{$originalName}'."); }
                    } else { Log::warning("Élément invalide ou null dans 'fichiers' [{$index}] (store), ignoré."); }
                }
            } else { Log::info('Aucun fichier fourni (optionnel).'); }

            // --- Create ConvPart Records ---
            Log::info('Création enregistrements ConvPart...');
if (!empty($partnerCommitmentsInput)) {
    // vvv REPLACE THIS ENTIRE LOOP vvv
    foreach ($partnerCommitmentsInput as $commitment) {
        $convPart = ConvPart::create([
            'Id_Convention' => $convention->id,
            'Id_Partenaire' => $commitment['Id_Partenaire'],
            'Montant_Convenu' => $commitment['Montant_Convenu'],
            'autre_engagement' => $commitment['autre_engagement'] ?? null,
            'is_signatory' => $commitment['is_signatory'],
            'date_signature' => ($commitment['is_signatory'] && !empty($commitment['date_signature'])) ? $commitment['date_signature'] : null,
            'details_signature' => ($commitment['is_signatory'] && !empty($commitment['details_signature'])) ? $commitment['details_signature'] : null,
        ]);

        // CORRECTED and SIMPLIFIED logic for yearly engagements
        // It now correctly uses the `$commitment` variable
        if (isset($commitment['engagements_annuels']) && is_array($commitment['engagements_annuels']) && !empty($commitment['Montant_Convenu'])) {
            foreach ($commitment['engagements_annuels'] as $engagementAnnuelData) {
                 if (isset($engagementAnnuelData['annee']) && isset($engagementAnnuelData['montant_prevu']) && is_numeric($engagementAnnuelData['montant_prevu'])) {
                    // Use simple 'create' since this is a new record
                    $convPart->engagementsAnnuels()->create([
                        'annee' => $engagementAnnuelData['annee'],
                        'montant_prevu' => $engagementAnnuelData['montant_prevu']
                    ]);
                }
            }
        }
    }
    Log::info(count($partnerCommitmentsInput) . " enregistrement(s) ConvPart créé(s).");
}
            // --- Commit ---
            DB::commit();
            Log::info('Transaction DB validée (store).');

            // --- Return Success Response ---
            $convention->load(['programme', 'projet', 'documents', 'convParts.partenaire']);
            $appBaseUrl = rtrim(config('app.url', 'http://localhost'), '/');
            $responseData = $convention->toArray();
            $responseData['documents'] = $convention->documents->map(function ($doc) use ($appBaseUrl) { $d = $doc->toArray(); $d['url'] = $doc->file_path ? "{$appBaseUrl}/" . ltrim($doc->file_path, '/') : null; return $d; })->all();
            $responseData['partner_commitments'] = $convention->convParts->map(function (ConvPart $cp) { $sDate = optional($cp->date_signature)->format('Y-m-d'); $p = $cp->partenaire; $l = optional($p)->Description_Arr ?: (optional($p)->Description ?: "ID:{$cp->Id_Partenaire}"); if (optional($p)->Code) { $l = "{$p->Code} - {$l}"; } return ['Id_Partenaire' => $cp->Id_Partenaire, 'label' => $l, 'Montant_Convenu' => $cp->Montant_Convenu, 'is_signatory' => (bool)$cp->is_signatory, 'date_signature' => $sDate, 'details_signature' => $cp->details_signature]; })->values()->all();
            Log::info('loubna - Convention Stored', $responseData);
            return response()->json([ "success" => "Convention ajoutée!", "message" => "Convention ajoutée!", "convention" => $responseData ], 201);

        // --- Catch Blocks ---
        } catch (\Exception $e) {
            DB::rollBack();
            $isDbError = $e instanceof \Illuminate\Database\QueryException;
            Log::error($isDbError ? 'ERREUR DB (store):' : 'ERREUR GÉNÉRALE (store):', ['message' => $e->getMessage(), 'trace' => !$isDbError ? $e->getTraceAsString() : null]);
            // Cleanup files
            foreach($createdDocumentsInfo as $docInfo) { $absolutePath = public_path($docInfo['path']); if (!empty($docInfo['path']) && File::exists($absolutePath)) { try { File::delete($absolutePath); Log::warning("Fichier déplacé annulé (rollback): {$absolutePath}"); } catch (\Exception $ex) { Log::error("Échec suppression fichier {$absolutePath} (rollback): " . $ex->getMessage()); } } }
            $userMessage = $isDbError ? "Erreur Base de Données lors de la création." : "Échec de la création.";
            $statusCode = $e instanceof ValidationException ? 422 : ($isDbError ? 500 : 500); // 422 should be caught above
            return response()->json(["message" => $userMessage, "error_details" => config('app.debug') ? $e->getMessage() : null, "errors" => $e instanceof ValidationException ? $e->errors() : null ], $statusCode);
        }
    }

    /**
     * Display the specified convention.
     * GET /api/conventions/{id}
     */
    public function show(Convention $convention): JsonResponse
    {
        $conventionId = $convention->id;
        Log::info("API: Requête pour détails Convention ID: {$conventionId}");
        try {
            $convention->load([
                'documents', 'programme', 'projet', 'avenants',
               'convParts' => function ($query) {
    // We add `autre_engagement` to the select list
    $query->with('partenaire:Id,Description,Description_Arr,Code')
          ->with('engagementsAnnuels')

          ->select([
              'Id_CP', 'Id_Convention', 'Id_Partenaire', 'Montant_Convenu', 
              'autre_engagement', // <-- ADD THIS
              'is_signatory', 'date_signature', 'details_signature'
          ])
          ->withSum('versements as Montant_Verse', 'montant_verse');
}
            ]);

            // --- Debugging point 1: Directly check the loaded Eloquent relationship ---
            $problematicConvPart = $convention->convParts->firstWhere('Id_Partenaire', 23);
            if ($problematicConvPart && $problematicConvPart->partenaire) {
                Log::debug("[DEBUG ID: {$conventionId}] Eloquent Partner ID 23 Data BEFORE toArray:", [
                    'ID' => $problematicConvPart->partenaire->Id,
                    'Description' => $problematicConvPart->partenaire->Description, // Check this value directly
                    'Description_Arr' => $problematicConvPart->partenaire->Description_Arr,
                    'Code' => $problematicConvPart->partenaire->Code,
                    'Exists?' => $problematicConvPart->partenaire->exists, // Should be true
                    'Model Class' => get_class($problematicConvPart->partenaire)
                ]);
            } else {
                 Log::debug("[DEBUG ID: {$conventionId}] Could not find ConvPart or loaded Partner for ID 23 BEFORE toArray.");
            }
            // --- End Debugging Point 1 ---


            $responseData = $convention->toArray();

            // --- Debugging point 2: Check the data AFTER conversion to array ---
             if (isset($responseData['conv_parts'])) {
                 foreach ($responseData['conv_parts'] as $convPartArray) {
                     if (($convPartArray['Id_Partenaire'] ?? null) == 23) {
                         Log::debug("[DEBUG ID: {$conventionId}] Partner ID 23 Array Data AFTER toArray:", $convPartArray['partenaire'] ?? ['PARTENAIRE_KEY_MISSING']);
                         break;
                     }
                 }
             }
            // --- End Debugging Point 2 ---


            if (isset($responseData['conv_parts']) && is_array($responseData['conv_parts'])) {
                $responseData['partner_commitments'] = array_map(function ($c) {
                    $p = $c['partenaire'] ?? null;
                    $partnerLabel = ''; // Initialize label variable

                    if ($p) {
                        $partnerIdForLog = $p['Id'] ?? $c['Id_Partenaire'] ?? 'UNKNOWN';
                        // Using !empty which treats null, '', 0, false etc. as empty
                        // Prioritize Description_Arr
                        if (!empty($p['Description_Arr'])) {
                            $partnerLabel = $p['Description_Arr'];
                             Log::debug("[MAP DEBUG Partner {$partnerIdForLog}] Using Description_Arr: '{$partnerLabel}'");
                        }
                        // Fallback to Description
                        elseif (!empty($p['Description'])) {
                            $partnerLabel = $p['Description'];
                             Log::debug("[MAP DEBUG Partner {$partnerIdForLog}] Using Description: '{$partnerLabel}'"); // <<< THIS IS THE KEY LOG FOR ID 23
                        }
                        // Fallback to ID if both are 'empty'
                        else {
                            $partnerLabel = "ID:{$partnerIdForLog}";
                             Log::debug("[MAP DEBUG Partner {$partnerIdForLog}] Using Fallback ID: '{$partnerLabel}'");
                        }

                        // Prepend Code if available
                        if (!empty($p['Code'])) {
                            $partnerLabel = "{$p['Code']} - {$partnerLabel}";
                        }

                    } else {
                        // Handle case where partner data is missing entirely in the array
                        $partnerIdForLog = $c['Id_Partenaire'] ?? 'UNKNOWN';
                        $partnerLabel = "ID:{$partnerIdForLog}";
                         Log::warning("[MAP DEBUG Partner {$partnerIdForLog}] Partenaire data missing in array map. Using fallback label: '{$partnerLabel}'");
                    }


                    return [
                        'Id_CP'           => $c['Id_CP'] ?? null,
                        'Id_Partenaire'   => $c['Id_Partenaire'] ?? null,
                        'label'           => $partnerLabel, // Use the calculated label
                        'Montant_Convenu' => $c['Montant_Convenu'] ?? null,
                        'autre_engagement' => $c['autre_engagement'] ?? null,
                        'engagements_annuels' => $c['engagements_annuels'] ?? [], 
                        'Montant_Verse'   => $c['Montant_Verse'] ?? '0.00',
                        'is_signatory'    => (bool)($c['is_signatory'] ?? false),
                        'date_signature'  => $c['date_signature'] ?? null,
                        'details_signature' => $c['details_signature'] ?? null
                    ];
                }, $responseData['conv_parts']);
                unset($responseData['conv_parts']);
            } else {
                $responseData['partner_commitments'] = [];
            }

            // Map documents (keep existing logic)
            if (isset($responseData['documents']) && is_array($responseData['documents'])) {
               $appBaseUrl = rtrim(config('app.url', 'http://localhost'), '/');
               $responseData['documents'] = array_map(function ($d) use ($appBaseUrl) { $d['url'] = $d['file_path'] ? "{$appBaseUrl}/" . ltrim($d['file_path'], '/') : null; return $d; }, $responseData['documents']);
            } else { $responseData['documents'] = []; }

            Log::info("API: Succès récupération détails Convention ID: {$conventionId}");
            return response()->json(['convention' => $responseData], 200);

        } catch (ModelNotFoundException $e) {
             Log::warning("API: Convention ID {$conventionId} non trouvée (show).");
             return response()->json(['message' => 'Convention non trouvée.'], 404);
        } catch (\Exception $e) {
            // Log the full exception including stack trace
            Log::error("API: Erreur récupération détaillée Convention ID {$conventionId}: " . $e->getMessage(), ['exception' => $e]);
            return response()->json(['message' => 'Erreur serveur lors de la récupération des détails.'], 500);
        }
    }

    /**
     * Update the specified convention.
     * POST /api/conventions/{id} (with _method=PUT) or PUT /api/conventions/{id}
     * MERGED & ADJUSTED: Validation matches frontend required fields. Partner commitments nullable.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        Log::info("Requête MAJ reçue pour Convention ID {$id}...");
        Log::debug('Données brutes MAJ (convention):', $request->all());

        try { $convention = Convention::findOrFail($id); }
        catch (ModelNotFoundException $e) { Log::error("Convention non trouvée pour MAJ. ID: {$id}"); return response()->json(['message' => 'Convention non trouvée.'], 404); }

        // --- Decode Inputs ---
        $partnerCommitmentsInput = json_decode($request->input('partner_commitments', '[]'), true);
        if (json_last_error() !== JSON_ERROR_NONE) { Log::error('Échec décodage JSON engagements (update).'); return response()->json(['message' => 'Format JSON engagements invalide.'], 400); }
if ($request->has('membres_comite_technique') && is_string($request->input('membres_comite_technique'))) {
    $request->merge(['membres_comite_technique' => json_decode($request->input('membres_comite_technique'), true)]);
}
if ($request->has('membres_comite_pilotage') && is_string($request->input('membres_comite_pilotage'))) {
    $request->merge(['membres_comite_pilotage' => json_decode($request->input('membres_comite_pilotage'), true)]);
}
        $documentIdsToDeleteInput = json_decode($request->input('deleted_document_ids', '[]'), true);
        if (json_last_error() !== JSON_ERROR_NONE || !is_array($documentIdsToDeleteInput)) { Log::error('Échec décodage JSON IDs suppression (update).'); return response()->json(['message' => 'Format JSON IDs suppression invalide.'], 400); }

        // --- Validation Rules Adjusted ---
        $validationRules = [

            'numero_approbation' => 'required|string|max:100',
            'session' => 'required|integer|between:1,12',
            'classification_prov' => 'nullable|string',          // Required (*)
            'categorie' => 'nullable|string',                    // Required (*)
            'intitule' => 'required|string',                     // Required (*)
            'reference' => 'nullable|string',                    // Required (*)
            'annee_convention' => 'required|integer|digits:4',   // Required (*)
            'objet' => 'nullable|string',
            'type' => ['required', Rule::in(['cadre', 'specifique'])],
            'objectifs' => 'nullable|string',                    // Required (*)
            'localisation' => 'nullable|string',                 // Required (*)
            'maitre_ouvrage' => 'nullable|string',               // Required (*)
            'partenaire' => 'nullable|string',                   // Not Required (simple list)
            'id_fonctionnaire' => 'nullable|string',             // Not Required
            'cout_global' => 'nullable|numeric|min:0',           // Required (*)
            'statut' => 'required|string',      
            'date_visa' => 'nullable|date', 
             'operationalisation' => ['nullable', Rule::in(['Oui', 'Non'])],
            'Id_Programme' => 'nullable|integer|exists:programme,Id', // Required (*)
            'id_projet' => 'nullable|integer|exists:projet,ID_Projet', // *** CHANGED TO REQUIRED *** (*)
            'groupe' => 'nullable|integer',                      // Required (*)
            'rang' => 'nullable|string',                         // Not Required
            'observations' => 'nullable|string|max:20000',       // Not Required
            'date_reception_vise' => ['nullable', 'date'],
            'duree_convention' => 'nullable|integer|min:0',
            'maitre_ouvrage_delegue' => 'nullable|string',
            'membres_comite_technique' => 'nullable|array',
            'membres_comite_technique.*' => 'string|max:255', // Validates each item in the array
            'membres_comite_pilotage' => 'nullable|array',
            'membres_comite_pilotage.*' => 'string|max:255',
            'fichiers' => 'nullable|array',                      // Not Required
            'fichiers.*' => 'nullable|file|mimes:pdf,doc,docx,jpg,jpeg,png,xls,xlsx|max:5120',
            'partner_commitments' => ['nullable', 'string'],     // *** CHANGED TO NULLABLE *** (JSON string)
            'deleted_document_ids' => 'nullable|string',         // Keep as string

            'confirm_delete_commitments' => 'sometimes|boolean',
        ];
        $validationMessages = [ /* ... Keep messages ... */ ];

        // --- Perform Validation ---
        $validator = Validator::make($request->all(), $validationRules, $validationMessages);
        if ($validator->fails()) { Log::error('Échec validation principale (Convention update):', ['errors' => $validator->errors()]); return response()->json(['message' => 'Données invalides.', 'errors' => $validator->errors()], 422); }
        $validatedData = $validator->validated();

    
      $sessionValue = $validatedData['session'] ?? 'NS';
        $sessionFormatted = is_numeric($sessionValue) ? str_pad($sessionValue, 2, '0', STR_PAD_LEFT) : 'NS';

        $validatedData['code'] = sprintf(
            '%s/%s/%s',
            $validatedData['numero_approbation'] ?? 'NA',
            $sessionFormatted,
            $validatedData['annee_convention']
        );
        $confirmDeleteCommitments = $validatedData['confirm_delete_commitments'] ?? false;

        // --- Detailed Partner Commitment Validation ---
        if (!is_array($partnerCommitmentsInput)) { return response()->json(['message' => 'Format invalide pour les engagements partenaires (doit être une liste).'], 422); }
        // Allow empty array for update (to remove all partners)

        Log::info('Validation détaillée engagements partenaires (update)...');
foreach ($partnerCommitmentsInput as $index => $commitment) {
    // We only check for the fields that are ALWAYS required.
    // The detailed check for Montant vs. Autre is handled by the Validator below.
    if (!is_array($commitment) || !isset($commitment['Id_Partenaire'], $commitment['is_signatory'])) {
         return response()->json(['message' => "Données de base manquantes pour l'engagement #" . ($index + 1) . "."], 422);
    }
            $commitmentValidator = Validator::make($commitment, [
        'Id_Partenaire' => 'required|integer|exists:partenaire,Id',
        
        // If Montant is provided, it must be numeric. It's only required if autre_engagement is missing.
        'Montant_Convenu' => 'required_if:autre_engagement,null|nullable|numeric|min:0',

    // This says: Autre Engagement is required IF Montant_Convenu is NULL or empty. It must also be a string.
    'autre_engagement' => 'required_if:Montant_Convenu,null|nullable|string|max:5000',

        'is_signatory' => 'required|boolean',
        'date_signature' => ['required_if:is_signatory,true', 'nullable', 'date_format:Y-m-d'],
        'details_signature' => ['nullable', 'string', 'max:1000'],
    ], [
        // Add custom messages for the new rules
        'Montant_Convenu.required_without' => 'Un montant ou une description de l\'engagement est requis.',
        'autre_engagement.required_without' => 'Une description ou un montant de l\'engagement est requis.',
    ]);
            if ($commitmentValidator->fails()) { Log::error("Update: Échec validation engagement #".($index + 1).".", ['errors' => $commitmentValidator->errors()]); return response()->json(['message' => "Erreur validation engagement #" . ($index + 1) . ".", 'errors' => $commitmentValidator->errors()], 422); }
        }
        Log::info('Validation détaillée engagements partenaires (update) OK.');

        // --- Document ID Validation ---
        if (!empty($documentIdsToDeleteInput)) {
            $validDocIds = Document::where('Id_Conv', $convention->id)->whereIn('Id_Doc', $documentIdsToDeleteInput)->pluck('Id_Doc')->all();
            if (count($validDocIds) !== count(array_unique($documentIdsToDeleteInput))) { $invalidIds = array_diff($documentIdsToDeleteInput, $validDocIds); Log::error('IDs docs invalides pour suppression (update).', ['invalid_ids' => $invalidIds]); return response()->json(['message' => 'Suppression docs invalides.', 'errors' => ['deleted_document_ids' => ['IDs invalides fournis.']]], 422); }
            Log::info('Tous les IDs de documents à supprimer sont valides.');
        }

        // --- Prepare Data & Paths ---
        $conventionUpdateData = Arr::except($validatedData, ['fichiers', 'deleted_document_ids', 'partner_commitments', 'confirm_delete_commitments']);
        $filesToDeletePhysicallyAbsolute = []; $newlyAddedDocumentInfo = [];
        $targetDirRelative = 'uploads/conventions'; $targetDirAbsolute = public_path($targetDirRelative);

        // --- Start DB Transaction ---
        DB::beginTransaction();
        Log::info("Transaction DB démarrée (Convention update ID: {$id}). Confirmation: " . ($confirmDeleteCommitments ? 'Oui' : 'Non'));
        
        try {
            // --- File/Directory Checks ---
            if (!File::isDirectory($targetDirAbsolute)) { if (!File::makeDirectory($targetDirAbsolute, 0775, true, true)) { throw new \Exception("Impossible créer dossier: {$targetDirAbsolute}"); } }
            if (!File::isWritable($targetDirAbsolute)) { throw new \Exception("Permissions écriture manquantes pour: {$targetDirAbsolute}"); }

            // --- Process Document Deletions ---
            if (!empty($documentIdsToDeleteInput)) {
                Log::info("Traitement suppression DB Documents:", $documentIdsToDeleteInput);
                $docsToDelete = Document::whereIn('Id_Doc', $documentIdsToDeleteInput)->where('Id_Conv', $convention->id)->get(['Id_Doc', 'file_path']);
                foreach($docsToDelete as $doc) { if($doc->file_path) { $filesToDeletePhysicallyAbsolute[] = public_path($doc->file_path); } }
                $deletedDbCount = Document::destroy($docsToDelete->pluck('Id_Doc')->all());
                Log::info("Supprimé {$deletedDbCount} enregistrement(s) Document DB.");
            }

            // --- Process NEW File Uploads ---
            if (!empty($validatedData['fichiers']) && is_array($validatedData['fichiers'])) {
                Log::info('Traitement nouveaux fichiers (update)...');
                $intitules = $request->input('intitules', $request->input('intitule_file', []));
                foreach ($validatedData['fichiers'] as $index => $file) {
                     if ($file instanceof \Illuminate\Http\UploadedFile && $file->isValid()) {
                         $originalName = $file->getClientOriginalName(); $mimeType = $file->getClientMimeType() ?: 'application/octet-stream'; $size = $file->getSize();
                         $safeOriginalName = preg_replace('/[^A-Za-z0-9\._-]/', '_', $originalName); $generatedFilename = date('Ymd-His') . '_' . Str::random(5) . '_' . $safeOriginalName;
                         try {
                            $file->move($targetDirAbsolute, $generatedFilename);
                            $storedRelativePath = $targetDirRelative . '/' . $generatedFilename;
                            $newlyAddedDocumentInfo[] = ['relative' => $storedRelativePath, 'absolute' => public_path($storedRelativePath)];
                            $documentIntitule = is_array($intitules) && array_key_exists($index, $intitules) && !empty($intitules[$index]) ? $intitules[$index] : pathinfo($originalName, PATHINFO_FILENAME);
                            $documentData = [ 'Id_Doc' => 'convdoc_' . Str::uuid()->toString(), 'Intitule' => $documentIntitule, 'file_type' => $mimeType, 'file_name' => $originalName, 'file_path' => $storedRelativePath, 'file_size' => $size ];
                            $newDocument = $convention->documents()->create($documentData);
                            Log::info("Nouveau Document ajouté #{$index}: ID {$newDocument->Id_Doc}");
                         } catch (\Symfony\Component\HttpFoundation\File\Exception\FileException $e) { throw new \Exception("Échec critique déplacement fichier '{$originalName}'."); }
                     } else { Log::warning("Nouveau fichier invalide/null #{$index} (update), ignoré."); }
                }
            } else { Log::info('Aucun nouveau fichier (update).'); }

            // --- Update metadata for existing documents (inline title edits)
            $existingDocsMeta = json_decode($request->input('documents_existants_meta', '[]'), true);
            if (is_array($existingDocsMeta) && !empty($existingDocsMeta)) {
                foreach ($existingDocsMeta as $meta) {
                    if (isset($meta['id']) && isset($meta['intitule'])) {
                        Document::where('Id_Doc', $meta['id'])
                            ->where('Id_Conv', $convention->id)
                            ->update(['Intitule' => $meta['intitule']]);
                    }
                }
            }

            // --- Update Convention Record ---
            Log::info('MAJ enregistrement Convention...');
            $convention->update($conventionUpdateData);
            Log::info("Convention MAJ: ID {$convention->id}");

            // --- START: Smart Sync Partner Commitments (ConvPart) ---
            Log::info("Synchronisation engagements partenaires (ConvPart) pour Convention ID: {$id}");
            $existingConvPartIds = $convention->convParts()->pluck('Id_CP')->toArray();
            $submittedCommitmentsData = collect($partnerCommitmentsInput);
            // Use 'id_cp' key expected from frontend/validation for existing items
            $submittedConvPartIds = $submittedCommitmentsData->pluck('id_cp')->filter()->unique()->toArray(); // Filter out nulls/undefined
            $convPartIdsToDelete = array_diff($existingConvPartIds, $submittedConvPartIds);

            // --- Handle Deletions ---
            if (!empty($convPartIdsToDelete)) {
                Log::info("ConvPart IDs potentiels à supprimer: " . implode(', ', $convPartIdsToDelete));
                $versementsExistForDeleted = false;
                if (!$confirmDeleteCommitments) {
                    $versementsExistForDeleted = VersementCP::whereIn('id_CP', $convPartIdsToDelete)->exists();
                    Log::info("Vérification versements pour IDs ConvPart à supprimer (sans confirmation). Trouvé: " . ($versementsExistForDeleted ? 'Oui' : 'Non'));
                }
                if ($versementsExistForDeleted) {
                    DB::rollBack(); Log::warning("MAJ Convention annulée (ID: {$id}): Confirmation requise pour supprimer engagements avec versements.");
                    $conflictingCommitments = ConvPart::whereIn('Id_CP', $convPartIdsToDelete)->with('partenaire:Id,Description,Description_Arr,Code')->get(['Id_CP', 'Id_Partenaire']);
                     $details = $conflictingCommitments->map(function ($cp) { $p=$cp->partenaire; $l=optional($p)->Description_Arr ?: (optional($p)->Description ?: "ID:{$cp->Id_Partenaire}"); if(optional($p)->Code){$l="{$p->Code} - {$l}";} return "Engagement avec {$l} (ID Engagement: {$cp->Id_CP})"; })->toArray();
                    return response()->json(['message' => 'Confirmation requise : La suppression de certains engagements entraînera la suppression définitive de leurs versements associés.', 'requires_confirmation' => true, 'details' => $details ], 409);
                } else {
                    Log::info("Poursuite suppression ConvPart IDs: " . implode(', ', $convPartIdsToDelete) . ". Confirmation: " . ($confirmDeleteCommitments ? 'fournie' : 'non requise/fournie'));
                    $deletedCount = ConvPart::whereIn('Id_CP', $convPartIdsToDelete)->delete();
                    Log::info("Supprimé {$deletedCount} enregistrement(s) ConvPart.");
                }
            } else { Log::info("Aucun enregistrement ConvPart marqué pour suppression."); }

            // --- Handle Updates and Creates ---
            Log::info("Traitement MAJ/Création pour " . $submittedCommitmentsData->count() . " engagements soumis.");
            foreach ($submittedCommitmentsData as $commitmentData) {
                $dataToSync = [
                    'Montant_Convenu'   => $commitmentData['Montant_Convenu'], 'is_signatory' => $commitmentData['is_signatory'],
                    'date_signature'    => ($commitmentData['is_signatory'] && !empty($commitmentData['date_signature'])) ? $commitmentData['date_signature'] : null,
                    'autre_engagement' => $commitmentData['autre_engagement'] ?? null,
                    'details_signature' => ($commitmentData['is_signatory'] && !empty($commitmentData['details_signature'])) ? $commitmentData['details_signature'] : null,
                ];
                $convPart = ConvPart::updateOrCreate(
                    ['Id_Convention' => $convention->id, 'Id_Partenaire' => $commitmentData['Id_Partenaire']],
                    $dataToSync
                );
                if (isset($commitmentData['engagements_annuels']) && is_array($commitmentData['engagements_annuels']) && !empty($commitmentData['engagements_annuels'])) {
    $submittedYears = [];
    foreach ($commitmentData['engagements_annuels'] as $engagementAnnuelData) {
        // Ensure we have valid data before trying to save
        if (isset($engagementAnnuelData['annee']) && isset($engagementAnnuelData['montant_prevu'])) {
            $convPart->engagementsAnnuels()->updateOrCreate(
                ['annee' => $engagementAnnuelData['annee']], // Keys to find the record by
                ['montant_prevu' => $engagementAnnuelData['montant_prevu']] // Data to update or create with
            );
            $submittedYears[] = $engagementAnnuelData['annee'];
        }
    }
    // This is important: it removes any yearly records that were deselected or are no longer valid
    $convPart->engagementsAnnuels()->whereNotIn('annee', $submittedYears)->delete();
} else {
    // If no yearly breakdown is submitted (e.g., for an "Autre" commitment), ensure no old records are left behind.
    $convPart->engagementsAnnuels()->delete();
}
                 Log::debug("Synchronisé ConvPart ID: {$convPart->Id_CP} pour Partenaire ID: {$commitmentData['Id_Partenaire']}. Nouvellement créé: " . ($convPart->wasRecentlyCreated ? 'Oui' : 'Non'));
            }
            Log::info("Synchronisation ConvPart terminée.");
            // --- END: Smart Sync Partner Commitments ---

            // --- Commit Transaction ---
            DB::commit();
            Log::info('Transaction DB validée (Convention update).');

            // --- Delete OLD physical files ---
            if (!empty($filesToDeletePhysicallyAbsolute)) {
                Log::info("Tentative suppression " . count($filesToDeletePhysicallyAbsolute) . " ancien(s) fichier(s)...");
                foreach($filesToDeletePhysicallyAbsolute as $absolutePath) { try { if ($absolutePath && File::exists($absolutePath)) { if(File::delete($absolutePath)) { Log::info("Ancien fichier physique supprimé: {$absolutePath}"); } else { Log::error("File::delete a échoué pour: {$absolutePath}"); } } else { Log::warning("Chemin fichier physique non trouvé pour suppression: '{$absolutePath}'"); } } catch (\Exception $fsEx) { Log::error("Erreur suppression fichier physique: {$absolutePath}", ['exception' => $fsEx]); } }
            }

            // --- Return Success Response ---
            $updatedConvention = $convention->fresh()->load(['programme', 'projet', 'documents', 'avenants', 'convParts' => function ($q) { $q->with('partenaire:Id,Description,Description_Arr,Code')->withSum('versements as Montant_Verse', 'montant_verse'); }]);
            $appBaseUrl = rtrim(config('app.url', 'http://localhost'), '/');
            $updatedConventionData = $updatedConvention->toArray();
            // Format documents
            $updatedConventionData['documents'] = $updatedConvention->documents->map(function ($d) use ($appBaseUrl) { $da=$d->toArray(); $da['url'] = $d->file_path ? "{$appBaseUrl}/" . ltrim($d->file_path, '/') : null; return $da; })->all();
            // Format partners
            if (isset($updatedConventionData['conv_parts']) && is_array($updatedConventionData['conv_parts'])) {
                $updatedConventionData['partner_commitments'] = array_map(function ($c) { $p=$c['partenaire']??null; $l=$p['Description_Arr']??($p['Description']?? "ID:{$c['Id_Partenaire']}"); if($p&&$p['Code']){$l="{$p['Code']} - {$l}";} return ['Id_CP'=>$c['Id_CP']??null, 'Id_Partenaire'=>$c['Id_Partenaire']??null, 'label'=>$l, 'Montant_Convenu'=>$c['Montant_Convenu']??null, 'Montant_Verse'=>$c['Montant_Verse']??'0.00', 'is_signatory'=>(bool)($c['is_signatory']??false), 'date_signature'=>$c['date_signature']??null, 'details_signature'=>$c['details_signature']??null]; }, $updatedConventionData['conv_parts']);
                 unset($updatedConventionData['conv_parts']);
             } else { $updatedConventionData['partner_commitments'] = []; }
            Log::info('loubna - Convention Updated', $updatedConventionData);
            return response()->json(['success' => 'Convention Modifiée!', 'message' => 'Convention Modifiée!', 'convention' => $updatedConventionData], 200);

        // --- Catch Blocks ---
        } catch (\Exception $e) { // Generic catch block handles both DB and other errors
            DB::rollBack();
            $isDbError = $e instanceof \Illuminate\Database\QueryException;
            $isValidationError = $e instanceof ValidationException; // Should be caught above, but check anyway
            Log::error($isDbError ? 'ERREUR DB (Convention update):' : ($isValidationError ? 'ERREUR VALIDATION (Convention update):' : 'ERREUR GÉNÉRALE (Convention update):'), ['id' => $id, 'message' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            // Cleanup newly added files
            foreach($newlyAddedDocumentInfo as $docInfo) { $absolutePath = $docInfo['absolute'] ?? public_path($docInfo['relative'] ?? ''); if (!empty($absolutePath) && File::exists($absolutePath)) { try { File::delete($absolutePath); Log::warning("Fichier ajouté annulé (rollback MAJ Conv): {$absolutePath}"); } catch (\Exception $ex) { Log::error("Échec suppression fichier {$absolutePath} (rollback MAJ Conv): " . $ex->getMessage()); } } }
            // Determine appropriate status code and message
            $statusCode = 500; // Default
            $userMessage = "Échec de la modification.";
            if ($isValidationError) {
                 $statusCode = 422;
                 $userMessage = "Erreur de validation.";
            } elseif ($isDbError && str_contains($e->getMessage(), '1451')) { // Foreign key constraint
                 $statusCode = 409; // Conflict
                 $userMessage = 'Erreur : Impossible de mettre à jour en raison de données associées.';
            } elseif ($isDbError) {
                 $userMessage = "Erreur Base de Données lors de la modification.";
            }
            return response()->json(['message' => $userMessage, "error_details" => config('app.debug') ? $e->getMessage() : null, "errors" => $isValidationError ? $e->errors() : null ], $statusCode);
         }
    }


 
     public function destroy(string $id): JsonResponse
    {
        Log::info("Tentative suppression Convention ID: {$id}...");
        $conventionToDelete = Convention::with(['documents', 'convParts'])->find($id);
        if (!$conventionToDelete) { Log::error("Convention ID: {$id} non trouvée pour suppression."); return response()->json(['message' => 'Convention non trouvée.'], 404); }

        $filesToDeletePhysicallyAbsolute = [];
        foreach($conventionToDelete->documents as $doc) { if($doc->file_path) { $aPath = public_path($doc->file_path); if (File::exists($aPath)) { $filesToDeletePhysicallyAbsolute[] = $aPath; } else { Log::warning("Chemin fichier non trouvé (destroy): '{$aPath}'"); } } }
        Log::info("Collecté " . count($filesToDeletePhysicallyAbsolute) . " fichiers physiques à supprimer.");

        DB::beginTransaction();
        Log::info("Transaction DB démarrée (Convention destroy ID: {$id})");
        try {
            // Consider Versement Check here based on constraints
            $conventionToDelete->convParts()->delete(); Log::info("Enregistrements ConvPart supprimés.");
            $conventionToDelete->documents()->delete(); Log::info("Enregistrements Document supprimés.");
            $conventionToDelete->delete(); Log::info("Enregistrement Convention ID: {$id} supprimé.");
            DB::commit();
            Log::info("Transaction DB validée (Convention destroy ID: {$id}).");

            // Delete physical files
            if (!empty($filesToDeletePhysicallyAbsolute)) {
                Log::info("Tentative suppression " . count($filesToDeletePhysicallyAbsolute) . " fichier(s)...");
                 foreach ($filesToDeletePhysicallyAbsolute as $absolutePath) { try { if (File::exists($absolutePath)) { if(File::delete($absolutePath)) { Log::info("Fichier supprimé: {$absolutePath}"); } else { Log::error("File::delete a échoué pour: {$absolutePath}"); } } else { Log::warning("Chemin fichier non trouvé avant suppression: '{$absolutePath}'"); } } catch (\Exception $storageEx) { Log::error("Erreur suppression fichier: {$absolutePath}", ['exception' => $storageEx]); } }
             } else { Log::info("Aucun fichier physique à supprimer."); }

            return response()->json(['success' => 'Convention Supprimée!', 'message' => 'Suppression réussie.'], 200);
        } catch (\Illuminate\Database\QueryException $qe) {
             DB::rollBack(); Log::error('ERREUR DB durant la suppression (Convention):', ['id' => $id, 'message' => $qe->getMessage()]);
             if (str_contains($qe->getMessage(), '1451') || str_contains($qe->getMessage(), 'foreign key constraint fails')) { return response()->json(['message' => 'Impossible de supprimer cette convention car elle est référencée.'], 409); }
             return response()->json(['message' => 'Erreur Base de Données lors de la suppression.'], 500);
        } catch (\Exception $e) {
            DB::rollBack(); Log::error('ERREUR GÉNÉRALE durant la suppression (Convention):', ['id' => $id, 'message' => $e->getMessage()]);
            return response()->json(['message' => 'Erreur serveur lors de la tentative de suppression.', 'error_details' => config('app.debug') ? $e->getMessage() : null], 500);
        }
    }

    

} // End of Controller Class