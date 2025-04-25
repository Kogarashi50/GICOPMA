<?php

namespace App\Http\Controllers;

// Required Model imports
use App\Models\Projet;
use App\Models\Domaine;
use App\Models\Programme;
use App\Models\Chantier;
use App\Models\Convention;
use App\Models\EngagementFinancier;
use App\Models\Versement;
use App\Models\Partenaire;

// Required Facades and Classes
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Validator;
use Illuminate\Database\Eloquent\ModelNotFoundException; // Explicitly import if needed, though handled
use Illuminate\Database\QueryException; // Explicitly import for specific error handling

class ProjetController extends Controller
{
    /**
     * Display a listing of the resource.
     * Eager loads relationships including engagements.
     */
    public function index(): JsonResponse
    {
        try {
            $projets = Projet::with([
                    'domaine',
                    'programme',
                    'chantier',
                    'convention',
                    'engagementsFinanciers.partenaire' // Eager load partner for listing
                ])
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json(['projets' => $projets], 200);
        } catch (\Exception $e) {
            Log::error('Error fetching projets: ' . $e->getMessage());
            return response()->json(['message' => 'Erreur lors de la récupération des projets'], 500);
        }
    }

    /**
     * Display the specified resource.
     * Eager loads relationships including engagements and their details.
     */
    public function show(string $id): JsonResponse // $id here is ID_Projet
    {
        try {
            // Find using 'ID_Projet' column or fail
            $projet = Projet::where('ID_Projet', $id)
                ->with([
                    'domaine',
                    'programme',
                    'chantier',
                    'convention',
                    'engagementsFinanciers' => function ($query) {
                        // Eager load partner and associated versements for detail view
                        $query->with(['partenaire', 'versements']);
                    }
                ])
                ->firstOrFail(); // Use firstOrFail for automatic 404 if not found

            // Optional Debugging (keep if useful during development)
            // Log::debug("Data being sent from show method for Projet ID {$id}: ", $projet->toArray());
            // if ($projet->relationLoaded('engagementsFinanciers')) {
            //     foreach ($projet->engagementsFinanciers as $index => $engagement) {
            //         Log::debug("Engagement #{$index} Raw Attributes:", $engagement->getAttributes());
            //         Log::debug("Engagement #{$index} Casted Date:", ['date_engagement' => $engagement->date_engagement]);
            //         Log::debug("Engagement #{$index} Casted Comment:", ['commentaire' => $engagement->commentaire]);
            //     }
            // } else {
            //     Log::debug("Engagements relation not loaded for Projet ID {$id}.");
            // }

            return response()->json(['projet' => $projet], 200);

        } catch (ModelNotFoundException $e) {
             Log::warning("Projet not found with ID_Projet: {$id}");
             return response()->json(['message' => 'Projet non trouvé.'], 404);
        } catch (\Exception $e) {
            Log::error('Error fetching projet ID_Projet ' . $id . ': ' . $e->getMessage());
            return response()->json(['message' => 'Erreur serveur lors de la récupération du projet.'], 500);
        }
    }

    /**
     * Store a newly created resource in storage, including engagements.
     */
    public function store(Request $request): JsonResponse
    {
        // --- Validation Rules (Based on Code 2's nullability, with id_fonctionnaire from Code 1) ---
        $validationRules = [
            // Projet Fields
            'Code_Projet' => 'required|integer|unique:projet,Code_Projet',
            'Nom_Projet' => 'required|string|max:65535', // Use max length for TEXT if needed
            'Id_Domaine' => ['required', 'integer', Rule::exists('domaine', 'Code')],
            'Id_Programme' => ['required', 'integer', Rule::exists('programme', 'Code_Programme')],
            'Id_Chantier' => ['required', 'integer', Rule::exists('chantier', 'Code_Chantier')],
            'Convention_Code' => ['nullable', 'integer', Rule::exists('convention', 'Code')], // From Code 2
            'Cout_CRO' => 'nullable|numeric|min:0', // From Code 2
            'Date_Debut' => 'nullable|date_format:Y-m-d', // From Code 2
            'Observations' => 'nullable|string',
            'Etat_Avan_Physi' => 'nullable|numeric|min:0|max:100', // From Code 2
            'Date_Fin' => 'nullable|date_format:Y-m-d|after_or_equal:Date_Debut',
            'Cout_Projet' => 'nullable|numeric|min:0', // From Code 2
            'id_fonctionnaire' => 'nullable|string', // From Code 1

            // Engagements Fields
            'engagements' => 'present|array', // Must be present, can be empty
            'engagements.*.partenaire_id' => 'required|integer|exists:partenaire,id',
            'engagements.*.montant_engage' => 'required|numeric|min:0',
            'engagements.*.date_engagement' => 'required|date_format:Y-m-d',
            'engagements.*.est_formalise' => 'required|boolean',
            'engagements.*.commentaire' => 'nullable|string|max:65535', // Max length for TEXT
        ];

        // Custom validation messages (can be shared/adjusted)
        $validationMessages = [
            'required' => 'Le champ :attribute est obligatoire.',
            'string' => 'Le champ :attribute doit être une chaîne.',
            'integer' => 'Le champ :attribute doit être un nombre entier.',
            'numeric' => 'Le champ :attribute doit être un nombre.',
            'boolean' => 'Le champ :attribute doit être vrai ou faux.',
            'date_format' => 'Le champ :attribute doit être au format AAAA-MM-JJ.',
            'unique' => 'La valeur du champ :attribute est déjà utilisée.',
            'exists' => 'La valeur sélectionnée pour :attribute est invalide.',
            'array' => 'Le champ :attribute doit être une liste.',
            'min' => 'Le champ :attribute doit être au moins :min.',
            'max' => 'Le champ :attribute ne doit pas dépasser :max.',
            'after_or_equal' => 'La :attribute doit être une date postérieure ou égale à la date de début.',
            'engagements.present' => 'La liste des engagements doit être fournie.',
            'engagements.*.partenaire_id.required' => 'Le partenaire est requis pour chaque engagement.',
            'engagements.*.partenaire_id.exists' => 'Le partenaire sélectionné pour un engagement est invalide.',
            'engagements.*.montant_engage.required' => 'Le montant est requis pour chaque engagement.',
            'engagements.*.montant_engage.numeric' => 'Le montant doit être numérique pour chaque engagement.',
            'engagements.*.date_engagement.required' => 'La date est requise pour chaque engagement.',
            'engagements.*.date_engagement.date_format' => 'Format de date invalide pour un engagement.',
            'engagements.*.est_formalise.required' => 'Le statut formalisé est requis pour chaque engagement.',
            'engagements.*.est_formalise.boolean' => 'Le statut formalisé est invalide pour un engagement.',
        ];

        $validator = Validator::make($request->all(), $validationRules, $validationMessages);

        if ($validator->fails()) {
            Log::warning('Validation failed during projet store:', $validator->errors()->toArray());
            return response()->json(['errors' => $validator->errors()], 422); // Unprocessable Entity
        }

        $validatedData = $validator->validated();

        // --- Database Transaction ---
        DB::beginTransaction();
        Log::info('Starting transaction for new projet creation');

        try {
            // 1. Create the Projet
            $projetInputData = collect($validatedData)->except('engagements')->all();

            // Ensure 'fillable' in Projet model allows these fields for mass assignment
            $projet = Projet::create($projetInputData);
            Log::info("Projet created with ID_Projet: {$projet->ID_Projet}");

            // 2. Create EngagementFinancier records
            if (!empty($validatedData['engagements'])) {
                Log::info('Processing ' . count($validatedData['engagements']) . ' engagements.');
                foreach ($validatedData['engagements'] as $engagementData) {
                    $engagementData['projet_id'] = $projet->ID_Projet; // Set the foreign key
                    // Ensure 'fillable' in EngagementFinancier allows these fields
                    EngagementFinancier::create($engagementData);
                }
                Log::info('Engagements created successfully for projet ID: ' . $projet->ID_Projet);
            } else {
                 Log::info('No engagements provided for this projet.');
            }

            // 3. Commit Transaction
            DB::commit();
            Log::info('Transaction committed successfully for projet ID: ' . $projet->ID_Projet);

            // 4. Return Success Response with the created Projet and its loaded relations
            $projet->load(['domaine', 'programme', 'chantier', 'convention', 'engagementsFinanciers.partenaire']);
            return response()->json([
                'message' => 'Projet et engagements créés avec succès.',
                'projet' => $projet
            ], 201); // HTTP 201 Created

        } catch (\Exception $e) {
            // 5. Rollback Transaction on error
            DB::rollBack();
            Log::error('Failed to store projet and engagements: ' . $e->getMessage(), [
                'request_data' => $request->except(['password', 'password_confirmation']), // Log request data safely
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['message' => 'Erreur lors de la création du projet ou de ses engagements.'], 500);
        }
    }

    /**
     * Update the specified resource in storage, including engagements.
     */
    public function update(Request $request, string $id): JsonResponse // $id is ID_Projet
    {
        Log::info("Attempting to update projet with ID_Projet: {$id}");

        // --- Find Existing Projet First ---
        try {
            // Assuming primary key is 'ID_Projet', set it in the model if not 'id'
            // protected $primaryKey = 'ID_Projet'; in Projet model
            $projet = Projet::findOrFail($id);
        } catch (ModelNotFoundException $e) {
            Log::warning("Projet not found for update with ID_Projet: {$id}");
            return response()->json(['message' => 'Projet non trouvé.'], 404);
        }

        // --- Validation Rules (Based on Code 2's nullability, with id_fonctionnaire from Code 1) ---
        $validationRules = [
            // Projet Fields
            'Code_Projet' => [
                'required',
                'integer',
                Rule::unique('projet', 'Code_Projet')->ignore($projet->ID_Projet, 'ID_Projet') // Ignore self
            ],
            'Nom_Projet' => 'required|string|max:65535',
            'Id_Domaine' => ['required', 'integer', Rule::exists('domaine', 'Code')],
            'Id_Programme' => ['required', 'integer', Rule::exists('programme', 'Code_Programme')],
            'Id_Chantier' => ['required', 'integer', Rule::exists('chantier', 'Code_Chantier')],
            'Convention_Code' => ['nullable', 'integer', Rule::exists('convention', 'Code')], // From Code 2
            'Cout_CRO' => 'nullable|numeric|min:0', // From Code 2
            'Date_Debut' => 'nullable|date_format:Y-m-d', // From Code 2
            'Observations' => 'nullable|string',
            'Etat_Avan_Physi' => 'nullable|numeric|min:0|max:100', // From Code 2
            'Date_Fin' => 'nullable|date_format:Y-m-d|after_or_equal:Date_Debut',
            'Cout_Projet' => 'nullable|numeric|min:0', // From Code 2
            'id_fonctionnaire' => 'nullable|string', // From Code 1

            // Engagements Fields
            'engagements' => 'present|array', // Must be present, can be empty
            'engagements.*.id' => [ // For identifying existing engagements
                'sometimes', // Only validate if 'id' is present
                'integer',
                Rule::exists('engagements_financiers', 'id') // Must be a valid existing ID
            ],
            'engagements.*.partenaire_id' => 'required|integer|exists:partenaire,id',
            'engagements.*.montant_engage' => 'required|numeric|min:0',
            'engagements.*.date_engagement' => 'required|date_format:Y-m-d',
            'engagements.*.est_formalise' => 'required|boolean',
            'engagements.*.commentaire' => 'nullable|string|max:65535',

            // Confirmation flag for cascade delete (optional)
            'confirm_cascade_delete' => 'sometimes|boolean',
        ];

        // Use the same validation messages as store method or customize if needed
        $validationMessages = [ /* ... copy messages from store method ... */
             'required' => 'Le champ :attribute est obligatoire.',
            'string' => 'Le champ :attribute doit être une chaîne.',
            'integer' => 'Le champ :attribute doit être un nombre entier.',
            'numeric' => 'Le champ :attribute doit être un nombre.',
            'boolean' => 'Le champ :attribute doit être vrai ou faux.',
            'date_format' => 'Le champ :attribute doit être au format AAAA-MM-JJ.',
            'unique' => 'La valeur du champ :attribute est déjà utilisée.',
            'exists' => 'La valeur sélectionnée pour :attribute est invalide.',
            'array' => 'Le champ :attribute doit être une liste.',
            'min' => 'Le champ :attribute doit être au moins :min.',
            'max' => 'Le champ :attribute ne doit pas dépasser :max.',
            'after_or_equal' => 'La :attribute doit être une date postérieure ou égale à la date de début.',
            'engagements.present' => 'La liste des engagements (même vide) doit être fournie.',
            'engagements.*.id.exists' => 'Un ID d\'engagement fourni est invalide ou n\'appartient pas à ce projet.', // Adjusted message might be useful
            'engagements.*.partenaire_id.required' => 'Le partenaire est requis pour chaque engagement.',
            'engagements.*.partenaire_id.exists' => 'Le partenaire sélectionné pour un engagement est invalide.',
            'engagements.*.montant_engage.required' => 'Le montant est requis pour chaque engagement.',
            'engagements.*.montant_engage.numeric' => 'Le montant doit être numérique pour chaque engagement.',
            'engagements.*.date_engagement.required' => 'La date est requise pour chaque engagement.',
            'engagements.*.date_engagement.date_format' => 'Format de date invalide pour un engagement.',
            'engagements.*.est_formalise.required' => 'Le statut formalisé est requis pour chaque engagement.',
            'engagements.*.est_formalise.boolean' => 'Le statut formalisé est invalide pour un engagement.',
            'confirm_cascade_delete.boolean' => 'La confirmation de suppression doit être une valeur booléenne.',
        ];


        $validator = Validator::make($request->all(), $validationRules, $validationMessages);

        if ($validator->fails()) {
            Log::warning("Validation failed during projet update (ID: {$id}):", $validator->errors()->toArray());
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $validatedData = $validator->validated();
        $confirmCascadeDelete = $validatedData['confirm_cascade_delete'] ?? false;

        // --- Database Transaction ---
        DB::beginTransaction();
        Log::info("Starting transaction for projet update ID: {$id}. Cascade Confirmation provided: " . ($confirmCascadeDelete ? 'Yes' : 'No'));

        try {
            // 1. Update the main Projet fields
            $projetInputData = collect($validatedData)->except(['engagements', 'confirm_cascade_delete'])->all();
            // Ensure 'fillable' in Projet model allows these fields
            $projet->update($projetInputData);
            Log::info("Projet main fields updated for ID: {$id}");

            // --- Engagement Synchronization Logic (Identical in both original codes) ---

            $existingEngagementIds = $projet->engagementsFinanciers()->pluck('id')->toArray();
            $submittedEngagements = $validatedData['engagements'] ?? [];
            $submittedEngagementIdsWithId = [];
            $engagementsToCreate = [];
            $engagementsToUpdate = [];

            foreach ($submittedEngagements as $engagementData) {
                $currentId = $engagementData['id'] ?? null;
                if ($currentId && in_array($currentId, $existingEngagementIds)) {
                    $submittedEngagementIdsWithId[] = $currentId;
                    $engagementsToUpdate[$currentId] = $engagementData;
                } elseif (!$currentId) {
                    $engagementsToCreate[] = $engagementData;
                }
                // Ignore submitted engagements with IDs not belonging to this project
            }

            $engagementIdsToDelete = array_diff($existingEngagementIds, $submittedEngagementIdsWithId);

            // --- Handle Deletions (with Confirmation Logic) ---
            if (!empty($engagementIdsToDelete)) {
                Log::info("Potential engagement IDs to delete for project {$id}: " . implode(', ', $engagementIdsToDelete));

                $versementsExistForDeleted = false;
                if (!$confirmCascadeDelete) {
                    // Check if any engagements slated for deletion have associated versements
                    $versementsExistForDeleted = Versement::whereIn('engagement_id', $engagementIdsToDelete)->exists();
                    Log::info("Checking for versements for IDs to delete (no confirmation). Found: " . ($versementsExistForDeleted ? 'Yes' : 'No'));
                }

                if ($versementsExistForDeleted) {
                    // CONFLICT: Versements exist, user hasn't confirmed. Rollback and ask for confirmation.
                    DB::rollBack();
                    Log::warning("Update halted for projet ID {$id}: User confirmation required for deleting engagements with associated versements.");

                    // Fetch details for the conflict message
                    $conflictingEngagements = EngagementFinancier::whereIn('id', $engagementIdsToDelete)
                                                ->with('partenaire:id,Description') // Load partner name efficiently
                                                ->get(['id', 'partenaire_id']);

                     $details = $conflictingEngagements->map(function ($eng) {
                         $partnerName = $eng->partenaire->Description ?? 'Partenaire ID '.$eng->partenaire_id;
                         return "Engagement avec {$partnerName} (ID: {$eng->id})";
                     })->toArray();

                    return response()->json([
                        'message' => 'Confirmation requise : La suppression de certains engagements entraînera la suppression définitive de leurs versements associés.',
                        'requires_confirmation' => true,
                        'details' => $details
                    ], 409); // HTTP 409 Conflict

                } else {
                    // OK TO DELETE: No versements found, or user confirmed.
                    Log::info("Proceeding with deletion of engagement IDs for project {$id}: " . implode(', ', $engagementIdsToDelete) . ". Confirmation was " . ($confirmCascadeDelete ? 'provided' : 'not needed/applicable'));
                    // Assuming ON DELETE CASCADE is set up in DB for versements, otherwise delete versements manually first if needed.
                    $deletedCount = EngagementFinancier::whereIn('id', $engagementIdsToDelete)->delete();
                    Log::info("Deleted {$deletedCount} engagements successfully for project {$id}.");
                }
            } else {
                 Log::info("No engagements marked for deletion for project {$id}.");
            }

            // --- Handle Updates ---
            if (!empty($engagementsToUpdate)) {
                Log::info("Updating " . count($engagementsToUpdate) . " engagements for project {$id}: " . implode(', ', array_keys($engagementsToUpdate)));
                foreach ($engagementsToUpdate as $idToUpdate => $dataToUpdate) {
                    unset($dataToUpdate['id']); // Remove 'id' from update payload
                    $dataToUpdate['projet_id'] = $projet->ID_Projet; // Ensure correct foreign key
                    // Ensure 'fillable' in EngagementFinancier allows these fields
                    EngagementFinancier::where('id', $idToUpdate)
                                       ->where('projet_id', $projet->ID_Projet) // Safety check
                                       ->update($dataToUpdate);
                }
                 Log::info("Finished updating engagements for project {$id}.");
            }

            // --- Handle Creations ---
            if (!empty($engagementsToCreate)) {
                Log::info('Creating ' . count($engagementsToCreate) . ' new engagements for project ' . $id);
                foreach ($engagementsToCreate as $engagementData) {
                    unset($engagementData['id']); // Remove 'id' if somehow present
                    $engagementData['projet_id'] = $projet->ID_Projet; // Set foreign key
                    // Ensure 'fillable' in EngagementFinancier allows these fields
                    EngagementFinancier::create($engagementData);
                }
                 Log::info('Finished creating new engagements for project ' . $id);
            }

            // 3. Commit Transaction
            DB::commit();
            Log::info("Transaction committed successfully for projet update ID: {$id}");

            // 4. Return Success Response
            $projet->refresh()->load(['domaine', 'programme', 'chantier', 'convention', 'engagementsFinanciers.partenaire']);
            return response()->json([
                'message' => 'Projet et engagements mis à jour avec succès.',
                'projet' => $projet
            ], 200); // HTTP 200 OK

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Failed to update projet (ID: {$id}) and engagements during transaction: " . $e->getMessage(), [
                'request_data' => $request->except(['password', 'password_confirmation']),
                'trace' => $e->getTraceAsString()
            ]);

            // Specific check for foreign key errors *after* supposed confirmation
            if ($e instanceof QueryException && str_contains($e->getMessage(), '1451') && $confirmCascadeDelete) {
                 return response()->json(['message' => 'Erreur de base de données : Impossible de supprimer un engagement même après confirmation. Vérifiez les contraintes ou la configuration cascade.'], 500);
            }

            return response()->json(['message' => 'Erreur serveur lors de la mise à jour du projet ou de ses engagements.'], 500);
        }
    }

    /**
     * Remove the specified resource from storage.
     * Handles deletion of associated engagements.
     */
    public function destroy(string $id): JsonResponse // $id is ID_Projet
    {
        Log::info("Attempting to delete projet with ID_Projet: {$id}");

        // --- Find Existing Projet First ---
        try {
            // Use where + firstOrFail to ensure we target the correct column if PK is not 'id'
            $projet = Projet::where('ID_Projet', $id)->firstOrFail();
        } catch (ModelNotFoundException $e) {
            Log::warning("Projet not found for deletion with ID_Projet: {$id}");
            return response()->json(['message' => 'Projet non trouvé.'], 404);
        }

        // --- Database Transaction ---
        DB::beginTransaction();
        Log::info("Starting transaction for projet deletion ID: {$id}");

        try {
            // 1. Delete related Engagements FIRST
            // This assumes no other critical relations prevent deletion.
            // If ON DELETE CASCADE is set for versements on engagement_id, they will be deleted too.
            // Otherwise, you might need to delete versements manually first.
            Log::info("Deleting associated engagements for projet ID: {$id}");
            $deletedEngagementsCount = $projet->engagementsFinanciers()->delete(); // Uses the relationship
            Log::info("Deleted {$deletedEngagementsCount} associated engagements.");

            // 2. Delete the Projet itself
            $projet->delete();
            Log::info("Projet deleted successfully ID: {$id}");

            // 3. Commit Transaction
            DB::commit();
            Log::info("Transaction committed for projet deletion ID: {$id}");

            return response()->json(['message' => 'Projet et engagements associés supprimés avec succès.'], 200); // 200 OK or 204 No Content

        } catch (\Exception $e) {
            // 4. Rollback Transaction on error
            DB::rollBack();
            // Log the error, including potential constraint violations
            Log::error("Failed to delete projet (ID: {$id}) or its engagements: " . $e->getMessage(), [
                 'trace' => $e->getTraceAsString()
            ]);
             // Check for foreign key constraint violation specifically
            if ($e instanceof QueryException && str_contains($e->getMessage(), '1451')) {
                 return response()->json(['message' => 'Impossible de supprimer le projet car il est référencé par d\'autres enregistrements (par exemple, versements non supprimés).'], 409); // Conflict
            }
            return response()->json(['message' => 'Erreur lors de la suppression du projet ou de ses engagements.'], 500);
        }
    }
}