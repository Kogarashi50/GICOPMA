<?php

namespace App\Http\Controllers;

// Required Model imports
use App\Models\Projet;
use App\Models\EngagementFinancier;
use App\Models\Versement; // Keep if used by engagement deletion logic

// Required Facades and Classes
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException as LaravelValidationException; // Using Laravel's own
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Database\QueryException;


class ProjetController extends Controller
{
    public function getUniqueFieldValues(Request $request, string $field): JsonResponse
{
    // A whitelist of fields allowed to be queried for security
    $allowedFields = ['maitre_ouvrage', 'maitre_ouvrage_delegue'];

    if (!in_array($field, $allowedFields)) {
        return response()->json(['message' => 'Champ non autorisé.'], 400);
    }

    try {
        $values = Projet::whereNotNull($field)
                        ->where($field, '!=', '')
                        ->distinct()
                        ->orderBy($field)
                        ->pluck($field);

        // Format for react-select
        $options = $values->map(fn($value) => ['value' => $value, 'label' => $value]);

        return response()->json($options);

    } catch (\Exception $e) {
        Log::error("Error fetching unique values for field '{$field}': " . $e->getMessage());
        return response()->json(['message' => 'Erreur serveur.'], 500);
    }
}
    public function getLocations(string $projet_code): JsonResponse
    {
        try {
            $projet = Projet::where('Code_Projet', $projet_code)
                            // Eager load relationships and select only the columns needed for efficiency
                            ->with(['provinces:Id,Description', 'communes:Id,Description'])
                            ->firstOrFail();

            return response()->json([
                'provinces' => $projet->provinces,
                'communes' => $projet->communes,
            ]);
        } catch (ModelNotFoundException $e) {
            return response()->json(['message' => 'Projet maître non trouvé.'], 404);
        } catch (\Exception $e) {
            Log::error('Error fetching project locations for ' . $projet_code . ': ' . $e->getMessage());
            return response()->json(['message' => 'Erreur serveur lors de la récupération des localisations.'], 500);
        }
    }
    /**
     * Display a listing of the resource.
     * Eager loads relationships including engagements.
     */
    public function index(): JsonResponse
    {
        try {
            $projets = Projet::with([
                    //'domaine',
                    'programme',
                    'provinces', 
                    'communes' ,
                    'convention',
                    'engagementsFinanciers.partenaire' // Eager load partenaire for engagements
                ])
                ->orderBy('created_at', 'desc')
                ->get();

            

            return response()->json(['projets' => $projets]);
        } catch (\Exception $e) {
            Log::error('Error fetching projets: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return response()->json(['message' => 'Erreur serveur lors de la récupération des projets.'], 500);
        }
    }

    /**
     * Get projets formatted for dropdowns.
     * GET /api/options/projets
     */
    public function getOptions(Request $request): JsonResponse
    {
        Log::info("API: Fetching Projet options for dropdown.");
        try {
            $projets = Projet::orderBy('Nom_Projet')
                               ->get(['ID_Projet', 'Code_Projet', 'Nom_Projet']);

            $options = $projets->map(function ($projet) {
                $label = $projet->Nom_Projet; // Default to Nom_Projet
                if (!empty($projet->Code_Projet) && !empty($projet->Nom_Projet)) {
                   $label = $projet->Code_Projet . ' - ' . $projet->Nom_Projet;
                } elseif (empty($label) && !empty($projet->Code_Projet)) { // Only Code_Projet is available
                    $label = $projet->Code_Projet;
                } elseif (empty($label)) { // Fallback if both are empty
                    $label = "Projet ID: {$projet->ID_Projet}";
                }
                return ['value' => $projet->ID_Projet, 'label' => $label];
            });

            return response()->json($options);
        } catch (\Exception $e) {
            Log::error('Error fetching Projet options: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return response()->json(['message' => 'Erreur serveur lors du chargement des options de projets.'], 500);
        }
    }


    /**
     * Display the specified resource.
     */
    public function show(string $id): JsonResponse
    {
        try {
            $projet = Projet::where('ID_Projet', $id) // Assuming ID_Projet is the column name
                ->with([
                    //'domaine',
                    'programme',
                    // 'chantier', 
                    'convention',
                    'provinces', 
                    'communes',  
                    'engagementsFinanciers' => function ($query) {
                        $query->with(['partenaire', 'versements']); // Eager load partenaire and versements for each engagement
                    }
                ])
                ->firstOrFail(); 

            return response()->json(['projet' => $projet]);

        } catch (ModelNotFoundException $e) {
             Log::warning("Projet not found with ID_Projet: {$id}");
             return response()->json(['message' => 'Projet non trouvé.'], 404);
        } catch (\Exception $e) {
            Log::error('Error fetching projet by ID_Projet ' . $id . ': ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return response()->json(['message' => 'Erreur serveur lors de la récupération du projet.'], 500);
        }
    }

    /**
     * Store a newly created resource in storage, including engagements.
     */
    public function store(Request $request): JsonResponse
    {
        // Define validation rules
        // Ensure table names and foreign key column names in 'exists' rules are correct
        $validationRules = [
            'Code_Projet' => ['required', 'integer', Rule::unique('projet', 'Code_Projet')], // Table 'projet', column 'Code_Projet'
            'Nom_Projet' => 'required|string|max:65535', // max:65535 might be too large if column is VARCHAR(255)
            'Id_Programme' => ['required', 'integer', Rule::exists('programme', 'Code_Programme')], // Assuming table 'programme', PK 'Id'
            'Convention_Code' => ['nullable', 'integer', Rule::exists('convention', 'id')],// Assuming table 'convention', PK 'id'
            'maitre_ouvrage' => 'nullable|string|max:255',
    'maitre_ouvrage_delegue' => 'nullable|string|max:255',
    'duree_projet_mois' => 'nullable|integer|min:0',
    'date_debut_prevue' => 'nullable|date_format:Y-m-d',
    'date_fin_prevue' => 'nullable|date_format:Y-m-d|after_or_equal:date_debut_prevue',
            'Cout_CRO' => 'nullable|numeric|min:0',
            'Date_Debut' => 'nullable|date_format:Y-m-d', // Ensure frontend sends this format
            'Observations' => 'nullable|string|max:65535',
            'Etat_Avan_Physi' => 'nullable|numeric|min:0|max:100',
            'Etat_Avan_Finan' => 'nullable|numeric|min:0|max:100',

            'Date_Fin' => 'nullable|date_format:Y-m-d|after_or_equal:Date_Debut',
            'Cout_Projet' => 'nullable|numeric|min:0',
            'id_fonctionnaire' => 'nullable|string', // Assuming this is a string of IDs like "1;2;3"
            'province_ids' => 'nullable|array', // Validate province_ids is an array
            'province_ids.*' => 'integer|exists:province,Id', // Validate each id exists
            'commune_ids' => 'nullable|array', // Validate commune_ids is an array
            'commune_ids.*' => 'integer|exists:commune,Id', // Validate each id exists
            'engagements' => 'present|array', // Ensure 'engagements' key is always present, even if an empty array
            'engagements.*.partenaire_id' => ['required', 'integer', Rule::exists('partenaire', 'Id')], // Assuming table 'partenaire', PK 'Id'
            'engagements.*.montant_engage' => 'required|numeric|min:0',
            'engagements.*.date_engagement' => 'required|date_format:Y-m-d', // Ensure frontend sends this format
            'engagements.*.est_formalise' => 'required|boolean',
            'engagements.*.commentaire' => 'nullable|string|max:65535',
        ];

$validationMessages = [
            'Code_Projet.required' => 'Le champ Code du Projet est obligatoire.',
            'Code_Projet.string' => 'Le champ Code du Projet doit être une chaîne de caractères.',
            'Code_Projet.max' => 'Le Code du Projet ne doit pas dépasser :max caractères.',
            'Code_Projet.unique' => 'Ce Code du Projet est déjà utilisé.',
            'Code_Projet.integer' => 'Le Code du Projet doit être un nombre entier.', // Ajouté pour la méthode update

            'Nom_Projet.required' => 'Le champ Nom du Projet est obligatoire.',
            'Nom_Projet.string' => 'Le champ Nom du Projet doit être une chaîne de caractères.',
            'Nom_Projet.max' => 'Le Nom du Projet ne doit pas dépasser :max caractères.', // Attention à la limite réelle de votre BDD

            // 'Id_Domaine.required' => 'Le champ Domaine est obligatoire.', // Supprimé
            // 'Id_Domaine.integer' => 'Le Domaine sélectionné est invalide.', // Supprimé
            // 'Id_Domaine.exists' => 'Le Domaine sélectionné n\'existe pas.', // Supprimé

            'Id_Programme.required' => 'Le champ Programme est obligatoire.',
            'Id_Programme.integer' => 'Le Programme sélectionné est invalide.',
            'Id_Programme.exists' => 'Le Programme sélectionné n\'existe pas.',

            // 'Id_Chantier.required' => 'Le champ Chantier est obligatoire.', // Supprimé
            // 'Id_Chantier.integer' => 'Le Chantier sélectionné est invalide.', // Supprimé
            // 'Id_Chantier.exists' => 'Le Chantier sélectionné n\'existe pas.', // Supprimé

            'Convention_Code.integer' => 'La Convention sélectionnée est invalide.',
            'Convention_Code.exists' => 'La Convention sélectionnée n\'existe pas.',

            'Cout_CRO.numeric' => 'Le Coût Part CRO doit être un nombre.',
            'Cout_CRO.min' => 'Le Coût Part CRO doit être au minimum de :min.',

            'Date_Debut.date_format' => 'Le format de la Date de Début est invalide (AAAA-MM-JJ).',

            'Observations.string' => 'Le champ Observations doit être une chaîne de caractères.',
            'Observations.max' => 'Les Observations ne doivent pas dépasser :max caractères.',

            'Etat_Avan_Physi.numeric' => 'L\'État d\'Avancement Physique doit être un nombre.',
            'Etat_Avan_Physi.min' => 'L\'État d\'Avancement Physique doit être au minimum de :min.',
            'Etat_Avan_Physi.max' => 'L\'État d\'Avancement Physique ne doit pas dépasser :max.',
            'Etat_Avan_Finan.numeric' => 'L\'État d\'Avancement Financier doit être un nombre.', // <-- ADD THIS
            'Etat_Avan_Finan.min' => 'L\'État d\'Avancement Financier doit être au minimum de :min.', // <-- ADD THIS
            'Etat_Avan_Finan.max' => 'L\'État d\'Avancement Financier ne doit pas dépasser :max.', // <-- ADD THIS
            'Date_Fin.date_format' => 'Le format de la Date de Fin est invalide (AAAA-MM-JJ).',
            'Date_Fin.after_or_equal' => 'La Date de Fin doit être une date postérieure ou égale à la Date de Début.',

            'Cout_Projet.numeric' => 'Le Coût Projet doit être un nombre.',
            'Cout_Projet.min' => 'Le Coût Projet doit être au minimum de :min.',

            'id_fonctionnaire.string' => 'Le champ Points Focaux est invalide.', // Message générique pour la chaîne d'IDs

            'engagements.present' => 'La section des engagements financiers est requise.',
            'engagements.array' => 'Les engagements financiers doivent être fournis sous forme de liste.',

            'engagements.*.partenaire_id.required' => 'Le partenaire est requis pour chaque engagement.',
            'engagements.*.partenaire_id.integer' => 'Le partenaire sélectionné pour l\'engagement est invalide.',
            'engagements.*.partenaire_id.exists' => 'Le partenaire sélectionné pour l\'engagement n\'existe pas.',

            'engagements.*.montant_engage.required' => 'Le montant engagé est requis pour chaque engagement.',
            'engagements.*.montant_engage.numeric' => 'Le montant engagé doit être un nombre pour chaque engagement.',
            'engagements.*.montant_engage.min' => 'Le montant engagé doit être au minimum de :min pour chaque engagement.',

            'engagements.*.date_engagement.required' => 'La date d\'engagement est requise pour chaque engagement.',
            'engagements.*.date_engagement.date_format' => 'Le format de la date d\'engagement est invalide (AAAA-MM-JJ) pour chaque engagement.',

            'engagements.*.est_formalise.required' => 'Le statut "Formalisé" est requis pour chaque engagement.',
            'engagements.*.est_formalise.boolean' => 'La valeur pour "Formalisé" est invalide pour chaque engagement.',

            'engagements.*.commentaire.string' => 'Le commentaire pour l\'engagement doit être une chaîne de caractères.',
            'engagements.*.commentaire.max' => 'Le commentaire pour l\'engagement ne doit pas dépasser :max caractères.',

            // Pour la méthode update, pour les engagements existants
            'engagements.*.id.integer' => 'L\'identifiant de l\'engagement est invalide.',
            'engagements.*.id.exists' => 'L\'engagement à mettre à jour n\'existe pas.',

            'confirm_cascade_delete.boolean' => 'La confirmation de suppression en cascade est invalide.',
        ];
        try {
            $validatedData = $request->validate($validationRules, $validationMessages);
            Log::info('Projet store validation passed.', $validatedData);
        } catch (LaravelValidationException $e) {
            Log::warning('Validation failed during projet store:', $e->errors());
            return response()->json(['message' => 'Les données fournies étaient invalides.', 'errors' => $e->errors()], 422);
        }

        DB::beginTransaction();
        try {
             $projetInputData = collect($validatedData)->except(['engagements', 'province_ids', 'commune_ids'])->all();
            $projet = Projet::create($projetInputData);

            // Sync relationships
            if (isset($validatedData['province_ids'])) {
                $projet->provinces()->sync($validatedData['province_ids']);
            }
            if (isset($validatedData['commune_ids'])) {
                $projet->communes()->sync($validatedData['commune_ids']);
            }
            // Separate projet data from engagements data
            $projetInputData = collect($validatedData)->except('engagements')->all();

            // Create the projet
            // Ensure Projet model has $primaryKey = 'ID_Projet' if not 'id', and $fillable allows these fields
            $projet = Projet::create($projetInputData);
            Log::info("Projet created with ID_Projet: {$projet->ID_Projet}");

            // Create engagements if any
            if (!empty($validatedData['engagements'])) {
                foreach ($validatedData['engagements'] as $engagementData) {
                    // Associate engagement with the newly created projet
                    // Ensure 'projet_id' matches the foreign key column name in 'engagements_financiers' table
                    $engagementData['projet_id'] = $projet->ID_Projet;
                    EngagementFinancier::create($engagementData);
                }
                Log::info(count($validatedData['engagements']) . " engagements created for projet ID_Projet: {$projet->ID_Projet}");
            }

            DB::commit();
            // Reload the projet with its relationships for the response
            $projet->load([//'domaine', 
                'programme', 
                //'chantier', 
                'convention', 'engagementsFinanciers.partenaire', 'provinces', 'communes']);
            return response()->json(['message' => 'Projet et engagements créés avec succès.', 'projet' => $projet], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to store projet and engagements: ' . $e->getMessage(), [
                'request_data' => $request->all(), // Log the original request data for full context
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['message' => 'Erreur serveur lors de la création du projet ou de ses engagements.'], 500);
        }
    }


    /**
     * Update the specified resource in storage, including engagements.
     */
    public function update(Request $request, string $id_projet_value): JsonResponse // Renamed $id to $id_projet_value for clarity
    {
        Log::info("Attempting to update projet with ID_Projet value: {$id_projet_value}");
        try {
            
            $projet = Projet::where('ID_Projet', $id_projet_value)->firstOrFail();
            Log::info("Projet found for update: ID_Projet {$projet->ID_Projet}");
        } catch (ModelNotFoundException $e) {
            Log::warning("Projet not found for update with ID_Projet value: {$id_projet_value}");
            return response()->json(['message' => 'Projet non trouvé.'], 404);
        }

        $validationRules = [
            'Code_Projet' => [
                'required',
                'integer',
                Rule::unique('projet', 'Code_Projet')->ignore($projet->ID_Projet, 'ID_Projet') // Table 'projet', PK 'ID_Projet'
            ],
            'Nom_Projet' => 'required|string|max:65535',
            //'Id_Domaine' => ['required', 'integer', Rule::exists('domaine', 'Id')],
            'Id_Programme' => ['required', 'integer', Rule::exists('programme', 'Code_Programme')],
            //'Id_Chantier' => ['required', 'integer', Rule::exists('chantier', 'Id')],
            'Convention_Code' => ['nullable', 'integer', Rule::exists('convention', 'id')],
            'Cout_CRO' => 'nullable|numeric|min:0',
            'Date_Debut' => 'nullable|date_format:Y-m-d',
            'maitre_ouvrage' => 'nullable|string|max:255',
    'maitre_ouvrage_delegue' => 'nullable|string|max:255',
    'duree_projet_mois' => 'nullable|integer|min:0',
    'date_debut_prevue' => 'nullable|date_format:Y-m-d',
    'date_fin_prevue' => 'nullable|date_format:Y-m-d|after_or_equal:date_debut_prevue',
            'Observations' => 'nullable|string|max:65535',
            'Etat_Avan_Physi' => 'nullable|numeric|min:0|max:100',
                    'Etat_Avan_Finan' => 'nullable|numeric|min:0|max:100', 
            'Date_Fin' => 'nullable|date_format:Y-m-d|after_or_equal:Date_Debut',
            'Cout_Projet' => 'nullable|numeric|min:0',
            'id_fonctionnaire' => 'nullable|string', // String of IDs like "1;2;3"
'province_ids' => 'nullable|array',
            'province_ids.*' => 'integer|exists:province,Id',
            'commune_ids' => 'nullable|array',
            'commune_ids.*' => 'integer|exists:commune,Id',
            'engagements' => 'present|array',
            'engagements.*.id' => ['sometimes', 'integer', Rule::exists('engagements_financiers', 'id')], // PK of 'engagements_financiers' table
            'engagements.*.partenaire_id' => ['required', 'integer', Rule::exists('partenaire', 'Id')], // PK of 'partenaire' table
            'engagements.*.montant_engage' => 'required|numeric|min:0',
            'engagements.*.date_engagement' => 'required|date_format:Y-m-d',
            'engagements.*.est_formalise' => 'required|boolean',
            'engagements.*.commentaire' => 'nullable|string|max:65535',
            'confirm_cascade_delete' => 'sometimes|boolean', // For confirming deletion of engagements with versements
        ];

        $validationMessages = [
            'Code_Projet.required' => 'Le champ Code du Projet est obligatoire.',
            'Code_Projet.string' => 'Le champ Code du Projet doit être une chaîne de caractères.',
            'Code_Projet.max' => 'Le Code du Projet ne doit pas dépasser :max caractères.',
            'Code_Projet.unique' => 'Ce Code du Projet est déjà utilisé.',
            'Code_Projet.integer' => 'Le Code du Projet doit être un nombre entier.', // Ajouté pour la méthode update
            'Etat_Avan_Finan.numeric' => 'L\'État d\'Avancement Financier doit être un nombre.', // <-- ADD THIS
        'Etat_Avan_Finan.min' => 'L\'État d\'Avancement Financier doit être au minimum de :min.', // <-- ADD THIS
        'Etat_Avan_Finan.max' => 'L\'État d\'Avancement Financier ne doit pas dépasser :max.',
            'Nom_Projet.required' => 'Le champ Nom du Projet est obligatoire.',
            'Nom_Projet.string' => 'Le champ Nom du Projet doit être une chaîne de caractères.',
            'Nom_Projet.max' => 'Le Nom du Projet ne doit pas dépasser :max caractères.', // Attention à la limite réelle de votre BDD

            // 'Id_Domaine.required' => 'Le champ Domaine est obligatoire.', // Supprimé
            // 'Id_Domaine.integer' => 'Le Domaine sélectionné est invalide.', // Supprimé
            // 'Id_Domaine.exists' => 'Le Domaine sélectionné n\'existe pas.', // Supprimé

            'Id_Programme.required' => 'Le champ Programme est obligatoire.',
            'Id_Programme.integer' => 'Le Programme sélectionné est invalide.',
            'Id_Programme.exists' => 'Le Programme sélectionné n\'existe pas.',

            // 'Id_Chantier.required' => 'Le champ Chantier est obligatoire.', // Supprimé
            // 'Id_Chantier.integer' => 'Le Chantier sélectionné est invalide.', // Supprimé
            // 'Id_Chantier.exists' => 'Le Chantier sélectionné n\'existe pas.', // Supprimé

            'Convention_Code.integer' => 'La Convention sélectionnée est invalide.',
            'Convention_Code.exists' => 'La Convention sélectionnée n\'existe pas.',

            'Cout_CRO.numeric' => 'Le Coût Part CRO doit être un nombre.',
            'Cout_CRO.min' => 'Le Coût Part CRO doit être au minimum de :min.',

            'Date_Debut.date_format' => 'Le format de la Date de Début est invalide (AAAA-MM-JJ).',

            'Observations.string' => 'Le champ Observations doit être une chaîne de caractères.',
            'Observations.max' => 'Les Observations ne doivent pas dépasser :max caractères.',

            'Etat_Avan_Physi.numeric' => 'L\'État d\'Avancement Physique doit être un nombre.',
            'Etat_Avan_Physi.min' => 'L\'État d\'Avancement Physique doit être au minimum de :min.',
            'Etat_Avan_Physi.max' => 'L\'État d\'Avancement Physique ne doit pas dépasser :max.',

            'Date_Fin.date_format' => 'Le format de la Date de Fin est invalide (AAAA-MM-JJ).',
            'Date_Fin.after_or_equal' => 'La Date de Fin doit être une date postérieure ou égale à la Date de Début.',

            'Cout_Projet.numeric' => 'Le Coût Projet doit être un nombre.',
            'Cout_Projet.min' => 'Le Coût Projet doit être au minimum de :min.',

            'id_fonctionnaire.string' => 'Le champ Points Focaux est invalide.', // Message générique pour la chaîne d'IDs

            'engagements.present' => 'La section des engagements financiers est requise.',
            'engagements.array' => 'Les engagements financiers doivent être fournis sous forme de liste.',

            'engagements.*.partenaire_id.required' => 'Le partenaire est requis pour chaque engagement.',
            'engagements.*.partenaire_id.integer' => 'Le partenaire sélectionné pour l\'engagement est invalide.',
            'engagements.*.partenaire_id.exists' => 'Le partenaire sélectionné pour l\'engagement n\'existe pas.',

            'engagements.*.montant_engage.required' => 'Le montant engagé est requis pour chaque engagement.',
            'engagements.*.montant_engage.numeric' => 'Le montant engagé doit être un nombre pour chaque engagement.',
            'engagements.*.montant_engage.min' => 'Le montant engagé doit être au minimum de :min pour chaque engagement.',

            'engagements.*.date_engagement.required' => 'La date d\'engagement est requise pour chaque engagement.',
            'engagements.*.date_engagement.date_format' => 'Le format de la date d\'engagement est invalide (AAAA-MM-JJ) pour chaque engagement.',

            'engagements.*.est_formalise.required' => 'Le statut "Formalisé" est requis pour chaque engagement.',
            'engagements.*.est_formalise.boolean' => 'La valeur pour "Formalisé" est invalide pour chaque engagement.',

            'engagements.*.commentaire.string' => 'Le commentaire pour l\'engagement doit être une chaîne de caractères.',
            'engagements.*.commentaire.max' => 'Le commentaire pour l\'engagement ne doit pas dépasser :max caractères.',

            // Pour la méthode update, pour les engagements existants
            'engagements.*.id.integer' => 'L\'identifiant de l\'engagement est invalide.',
            'engagements.*.id.exists' => 'L\'engagement à mettre à jour n\'existe pas.',

            'confirm_cascade_delete.boolean' => 'La confirmation de suppression en cascade est invalide.',
        ];

        try {
            $validatedData = $request->validate($validationRules, $validationMessages);
            Log::info("Validation passed for projet update (ID_Projet: {$projet->ID_Projet}).", $validatedData);
        } catch (LaravelValidationException $e) {
            Log::warning("Validation failed during projet update (ID_Projet: {$projet->ID_Projet}):", $e->errors());
            return response()->json(['message' => 'Les données fournies étaient invalides.', 'errors' => $e->errors()], 422);
        }

        $confirmCascadeDelete = $validatedData['confirm_cascade_delete'] ?? false;

        DB::beginTransaction();
        try {
             $projetInputData = collect($validatedData)->except(['engagements', 'province_ids', 'commune_ids', 'confirm_cascade_delete'])->all();
            $projet->update($projetInputData);
            
            // Sync relationships - sync() handles add/update/delete automatically
            $projet->provinces()->sync($validatedData['province_ids'] ?? []);
            $projet->communes()->sync($validatedData['commune_ids'] ?? []);
            // Prepare data for projet update (excluding engagements and confirmation flag)
            $projetInputData = collect($validatedData)->except(['engagements', 'confirm_cascade_delete'])->all();
            $projet->update($projetInputData);
            Log::info("Projet main fields updated for ID_Projet: {$projet->ID_Projet}");

            // --- Engagement Synchronization Logic ---
            $existingEngagementIds = $projet->engagementsFinanciers()->pluck('id')->toArray(); // Assuming PK of engagements_financiers is 'id'
            $submittedEngagementsData = $validatedData['engagements'] ?? [];
            $submittedEngagementIdsPresentInRequest = []; // IDs of engagements submitted with an 'id'
            $engagementsToCreate = [];
            $engagementsToUpdate = []; // Keyed by engagement 'id'

            foreach ($submittedEngagementsData as $engagementData) {
                $currentEngagementId = $engagementData['id'] ?? null;
                if ($currentEngagementId) { // It's an existing engagement to potentially update
                    $submittedEngagementIdsPresentInRequest[] = $currentEngagementId;
                    if (in_array($currentEngagementId, $existingEngagementIds)) {
                        $engagementsToUpdate[$currentEngagementId] = $engagementData;
                    } else {
                        // This case should ideally not happen if IDs are from existing records.
                        // Or it could be an attempt to update a non-existent/non-related engagement.
                        Log::warning("Submitted engagement ID {$currentEngagementId} not found among existing engagements for projet {$projet->ID_Projet}. Skipping update for this item.");
                    }
                } else {  
                    $engagementsToCreate[] = $engagementData;
                }
            }

            $engagementIdsToDelete = array_diff($existingEngagementIds, $submittedEngagementIdsPresentInRequest);

            // Handle Deletions
            if (!empty($engagementIdsToDelete)) {
                $versementsExistForAnyToBeDeleted = false;
                if (!$confirmCascadeDelete) { 
                    $versementsExistForAnyToBeDeleted = Versement::whereIn('engagement_id', $engagementIdsToDelete)->exists();
                }

                if ($versementsExistForAnyToBeDeleted) {
                    DB::rollBack();
                    $conflictingEngagements = EngagementFinancier::whereIn('id', $engagementIdsToDelete)->with('partenaire:Id,Description')->get(['id', 'partenaire_id']);
                    $details = $conflictingEngagements->map(fn($eng) => "Engagement avec " . (optional($eng->partenaire)->Description ?? 'Partenaire ID '.$eng->partenaire_id) . " (ID: {$eng->id})")->toArray();
                    Log::warning("Attempted to delete engagements with versements without confirmation for projet {$projet->ID_Projet}.", ['details' => $details]);
                    return response()->json([
                        'message' => 'Confirmation requise : Certains engagements à supprimer ont des versements associés.',
                        'requires_confirmation' => true,
                        'details' => $details
                    ], 409); // 409 Conflict
                } else {
                    // No versements, or deletion confirmed, proceed with deletion
                    $deletedCount = EngagementFinancier::destroy($engagementIdsToDelete); // More efficient for multiple deletions
                    Log::info("Deleted {$deletedCount} engagements for projet {$projet->ID_Projet}. IDs: " . implode(', ', $engagementIdsToDelete));
                }
            }

            // Handle Updates
            if (!empty($engagementsToUpdate)) {
                foreach ($engagementsToUpdate as $idToUpdate => $dataToUpdate) {
                    unset($dataToUpdate['id']); // Don't try to update the PK itself
                    $dataToUpdate['projet_id'] = $projet->ID_Projet; // Ensure association
                    EngagementFinancier::where('id', $idToUpdate)
                                      ->where('projet_id', $projet->ID_Projet) // Ensure it belongs to this projet
                                      ->update($dataToUpdate);
                }
                Log::info(count($engagementsToUpdate) . " engagements updated for projet {$projet->ID_Projet}.");
            }

            if (!empty($engagementsToCreate)) {
                foreach ($engagementsToCreate as $engagementData) {
                    unset($engagementData['id']);   
                    $engagementData['projet_id'] = $projet->ID_Projet;  
                    EngagementFinancier::create($engagementData);
                }
                Log::info(count($engagementsToCreate) . " new engagements created for projet {$projet->ID_Projet}.");
            }

            DB::commit();
            $projet->refresh()->load([//'domaine',
                'programme', 
                 //'chantier', 
                'convention', 'engagementsFinanciers.partenaire', 'engagementsFinanciers.versements', 'provinces', 'communes']);
            return response()->json(['message' => 'Projet et engagements mis à jour avec succès.', 'projet' => $projet]);

        } catch (QueryException $qe) {
            DB::rollBack();
            Log::error("DB error during projet update (ID_Projet: {$projet->ID_Projet}): " . $qe->getMessage(), [
                'sql_code' => $qe->getCode(),
                'request_data' => $request->all(),
            ]);
            if (str_contains($qe->getMessage(), '1451') && $confirmCascadeDelete) {
                 return response()->json(['message' => 'Erreur Base de Données: Impossible de supprimer un engagement référencé, même après confirmation. Veuillez vérifier les dépendances.'], 500);
            }
            return response()->json(['message' => 'Erreur Base de Données lors de la mise à jour.'], 500);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("General error during projet update (ID_Projet: {$projet->ID_Projet}): " . $e->getMessage(), [
                'request_data' => $request->all(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['message' => 'Erreur serveur lors de la mise à jour du projet ou de ses engagements.'], 500);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id_projet_value): JsonResponse
    {
        Log::info("Attempting to delete projet with ID_Projet value: {$id_projet_value}");
        try {
            $projet = Projet::where('ID_Projet', $id_projet_value)->firstOrFail();
        } catch (ModelNotFoundException $e) {
            Log::warning("Projet not found for deletion with ID_Projet value: {$id_projet_value}");
            return response()->json(['message' => 'Projet non trouvé.'], 404);
        }

        DB::beginTransaction();
        try {
            $projet->engagementsFinanciers()->delete();
            Log::info("Engagements deleted for projet ID_Projet: {$projet->ID_Projet}");

            $projet->delete();
            Log::info("Projet deleted: ID_Projet {$projet->ID_Projet}");

            DB::commit();
            return response()->json(['message' => 'Projet et engagements associés supprimés avec succès.'], 200);
        } catch (QueryException $qe) {
            DB::rollBack();
            Log::error("DB error deleting projet ID_Projet {$projet->ID_Projet}: " . $qe->getMessage(), ['sql_code' => $qe->getCode()]);
            if ($qe->errorInfo[1] == 1451) {
                return response()->json(['message' => 'Impossible de supprimer le projet car il est référencé par d\'autres enregistrements (par exemple, des marchés, avenants, etc.). Veuillez supprimer ces références d\'abord.'], 409); // 409 Conflict
            }
            return response()->json(['message' => 'Erreur base de données lors de la suppression.'], 500);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Failed to delete projet (ID_Projet: {$projet->ID_Projet}) or engagements: " . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return response()->json(['message' => 'Erreur lors de la suppression du projet.'], 500);
        }
    }
}