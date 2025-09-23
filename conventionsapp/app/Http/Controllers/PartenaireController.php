<?php

namespace App\Http\Controllers;

// Required Model imports
use App\Models\Partenaire;
use Illuminate\Http\JsonResponse; // Added for return type hinting

// Required Facades and Classes
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB; // Keep if transactions are used, otherwise can be removed if not directly used
use Illuminate\Validation\ValidationException;
use Illuminate\Validation\Rule;
use Illuminate\Database\Eloquent\ModelNotFoundException; // Added for specific exception catching
use Illuminate\Database\QueryException; // Added for catching DB constraints


class PartenaireController extends Controller
{
    /**
     * Display a listing of the partenaires.
     * GET /api/partenaires
     */
    public function index(Request $request): JsonResponse
    {
        Log::info('Récupération de la liste des partenaires...');
        try {
            $query = Partenaire::query();

            if ($request->filled('search')) {
                $searchTerm = '%' . $request->search . '%';
                Log::debug("Application du filtre de recherche partenaires: '{$request->search}'");
                 $query->where(function($q) use ($searchTerm) {
                     $q->where('Code', 'like', $searchTerm)
                       ->orWhere('Description', 'like', $searchTerm)
                       ->orWhere('Description_Arr', 'like', 'searchTerm'); // Typo corrected: $searchTerm
                 });
            }

             $sortBy = $request->query('sortBy', 'Description');
             $sortOrder = $request->query('sortOrder', 'asc');
             $allowedSorts = ['Code', 'Description', 'Description_Arr', 'created_at', 'Id'];
             if (in_array($sortBy, $allowedSorts)) {
                 $query->orderBy($sortBy, $sortOrder);
             } else {
                 Log::warning("Tri invalide demandé ('{$sortBy}'), utilisation du tri par défaut (Description).");
                 $query->orderBy('Description', 'asc');
             }

            $partenaires = $query->get();
            Log::info('Récupération réussie de ' . $partenaires->count() . ' partenaires.');
            return response()->json(['partenaires' => $partenaires]); // Removed 200, it's default for JSON

        } catch (\Exception $e) {
             Log::error('Erreur lors de la récupération des partenaires:', ['message' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
             return response()->json(['message' => 'Erreur serveur lors de la récupération des partenaires.'], 500);
        }
    }

    // *******************************************************************
    // *************   NEW METHOD TO ADD   *******************************
    // *******************************************************************
    /**
     * Get partenaires formatted for dropdowns.
     * GET /api/options/partenaires
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function getOptions(Request $request): JsonResponse
    {
        Log::info("API: Fetching Partenaire options for dropdown.");
        try {
            // Adjust 'Id', 'Code', 'Description', 'Description_Arr' if your Partenaire model uses different column names.
            // If your primary key is 'id' (lowercase), use 'id' instead of 'Id'.
            $partenaires = Partenaire::orderBy('Description_Arr') // Or 'Description' or 'Code'
                                   ->get(['Id', 'Code', 'Description', 'Description_Arr']); // Select necessary columns

            $options = $partenaires->map(function ($partenaire) {
                $label = $partenaire->Description_Arr ?: $partenaire->Description; // Prioritize Description_Arr, then Description
                if (empty($label)) {
                    $label = !empty($partenaire->Code) ? $partenaire->Code : "Partenaire ID: {$partenaire->Id}"; // Fallback to Code or ID
                }

                // Optionally, prepend Code if it exists and you want it in the label
                if (!empty($partenaire->Code) && ($partenaire->Description_Arr || $partenaire->Description)) {
                   $label = $partenaire->Code . ' - ' . $label;
                } elseif (empty($partenaire->Description_Arr) && empty($partenaire->Description) && !empty($partenaire->Code)) {
                    // If only Code exists, ensure it's not prepended to itself
                }


                return ['value' => $partenaire->Id, 'label' => $label];
            });

            Log::info("API: Returning " . $options->count() . " Partenaire options.");
            return response()->json($options); // Return the array of {value, label} directly
        } catch (\Exception $e) {
            Log::error('Error fetching Partenaire options: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return response()->json(['message' => 'Erreur serveur lors du chargement des options de partenaires.'], 500);
        }
    }
    // *******************************************************************
    // *******************************************************************


    /**
     * Store a newly created partenaire in storage.
     * POST /api/partenaires
     */
    public function store(Request $request): JsonResponse
    {
        Log::info('Requête de création de partenaire reçue...');
        Log::debug('Données brutes (store):', $request->all());

        try {
            $validatedData = $request->validate([
                'Code'          => 'required|integer|unique:partenaire,Code',
                'Description'     => 'required|string|max:255',
                'Description_Arr' => 'nullable|string|max:255',
            ], [
                'Code.required' => 'Le champ Code est obligatoire.',
                'Code.integer' => 'Le champ Code doit être un nombre entier.',
                'Code.unique' => 'Ce Code partenaire est déjà utilisé.',
                'Description.required' => 'Le champ Description (Français) est obligatoire.',
                'Description.max' => 'La Description (Français) ne doit pas dépasser :max caractères.',
                'Description_Arr.max' => 'La Description (Arabe) ne doit pas dépasser :max caractères.',
            ]);
            Log::info('Validation principale réussie (store partenaire).');

            // Create within a transaction for atomicity
            $partenaire = DB::transaction(function () use ($validatedData) {
                $newPartenaire = Partenaire::create($validatedData);
                Log::info("Partenaire créé: ID {$newPartenaire->Id}"); // Assumes PK is 'Id'
                return $newPartenaire;
            });

            return response()->json([
                "message" => "Partenaire créé avec succès!",
                "partenaire" => $partenaire
            ], 201);

        } catch (ValidationException $e) {
            Log::error('Échec validation (store partenaire):', ['errors' => $e->errors()]);
            return response()->json(['message' => 'Les données fournies étaient invalides.', 'errors' => $e->errors()], 422);
        } catch (\Exception $e) {
             Log::error('ERREUR GÉNÉRALE (store partenaire):', ['message' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
             return response()->json([
                 "message" => "Échec de la création du partenaire.",
                 "error_details" => config('app.debug') ? $e->getMessage() : null // Show details only in debug
                ], 500);
        }
    }


    /**
     * Display the specified partenaire.
     * GET /api/partenaires/{id}
     */
    public function show(string $id): JsonResponse
    {
        Log::info("API: Requête pour détails Partenaire ID: {$id}");
        try {
            // Use findOrFail to automatically handle 404 if not found
            // Assumes 'Id' is the primary key in your Partenaire model
            $partenaire = Partenaire::findOrFail($id);
            // $partenaire->load([]); // Eager load relationships if needed

            Log::info("API: Succès récupération détails Partenaire ID: {$id}");
            return response()->json($partenaire); // Return model directly, or nest: ['partenaire' => $partenaire]

        } catch (ModelNotFoundException $e) {
            Log::warning("API: Partenaire ID {$id} non trouvé.");
            return response()->json(['message' => 'Partenaire non trouvé.'], 404);
        } catch (\Exception $e) {
            Log::error("API: Erreur récupération détaillée Partenaire ID {$id}:", ['message' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            return response()->json(['message' => 'Erreur serveur lors de la récupération du partenaire.'], 500);
        }
    }


    /**
     * Update the specified partenaire in storage.
     * PUT/PATCH /api/partenaires/{id}
     */
    public function update(Request $request, string $id): JsonResponse
    {
        Log::info("Requête MAJ reçue pour Partenaire ID {$id}...");
        Log::debug('Données brutes MAJ (partenaire):', $request->all());

        try {
            $partenaire = Partenaire::findOrFail($id); // Assumes PK is 'Id'

            $validatedData = $request->validate([
                'Code'          => ['required', 'integer', Rule::unique('partenaire', 'Code')->ignore($partenaire->Id, 'Id')], // Ensure 'Id' is the PK column
                'Description'     => 'required|string|max:255',
                'Description_Arr' => 'nullable|string|max:255',
            ], [
                 'Code.required' => 'Le champ Code est obligatoire.',
                 'Code.integer' => 'Le champ Code doit être un nombre entier.',
                 'Code.unique' => 'Ce Code partenaire est déjà utilisé par un autre partenaire.',
                 'Description.required' => 'Le champ Description (Français) est obligatoire.',
                 // ... other messages
            ]);
            Log::info('Validation principale réussie (update partenaire).');

            // Update within a transaction
            DB::transaction(function () use ($partenaire, $validatedData) {
                $partenaire->update($validatedData);
                Log::info("Partenaire MAJ: ID {$partenaire->Id}");
            });


            return response()->json([
                'message' => 'Partenaire mis à jour avec succès!',
                'partenaire' => $partenaire->fresh() // Return the updated model reloaded from DB
            ]);

        } catch (ModelNotFoundException $e) {
             Log::warning("Partenaire non trouvé pour MAJ. ID: {$id}");
             return response()->json(['message' => 'Partenaire non trouvé.'], 404);
        } catch (ValidationException $e) {
             Log::error('Échec validation (update partenaire):', ['id' => $id, 'errors' => $e->errors()]);
             return response()->json(['message' => 'Les données fournies étaient invalides.', 'errors' => $e->errors()], 422);
        } catch (\Exception $e) {
             Log::error('ERREUR GÉNÉRALE (update partenaire):', ['id' => $id, 'message' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
             return response()->json([
                 "message" => "Échec de la modification du partenaire.",
                 "error_details" => config('app.debug') ? $e->getMessage() : null
                ], 500);
        }
    }

    /**
     * Remove the specified partenaire from storage.
     * DELETE /api/partenaires/{id}
     */
    public function destroy(string $id): JsonResponse
    {
        Log::info("Tentative suppression Partenaire ID: {$id}...");

        try {
            $partenaire = Partenaire::findOrFail($id); // Assumes PK is 'Id'

            // Use a transaction for the delete operation
            DB::transaction(function () use ($partenaire, $id) {
                $partenaire->delete();
                Log::info("Partenaire supprimé (DB): ID {$id}");
            });

            return response()->json(['message' => 'Partenaire supprimé avec succès!'], 200); // Or 204 No Content

        } catch (ModelNotFoundException $e) {
            Log::warning("Partenaire ID: {$id} non trouvé pour suppression.");
            return response()->json(['message' => 'Partenaire non trouvé.'], 404);
        } catch (QueryException $qe) {
            Log::error('Erreur QueryException (destroy partenaire):', ['id' => $id, 'message' => $qe->getMessage(), 'sql_code' => $qe->getCode()]);
            if (str_contains($qe->getMessage(), 'constraint violation') || $qe->getCode() == '23000' || $qe->errorInfo[1] == 1451) { // More robust FK check
                 return response()->json([
                     'message' => 'Impossible de supprimer ce partenaire car il est lié à d\'autres enregistrements (engagements, conventions, etc.).'
                 ], 409); // 409 Conflict
            }
            return response()->json(['message' => 'Erreur base de données lors de la suppression.'], 500);
        } catch (\Exception $e) {
             Log::error('ERREUR GÉNÉRALE (destroy partenaire):', ['id' => $id, 'message' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
             return response()->json([
                 "message" => "Erreur lors de la suppression du partenaire.",
                 "error_details" => config('app.debug') ? $e->getMessage() : null
             ], 500);
        }
    }


    // --- Financial summary methods (kept as is from your provided code) ---
    public function getFinancialSummary(Request $request)
    {
        try {
            Log::debug("Fetching partner financial summary...");
            $query = Partenaire::query()
                ->withSum('engagementsFinanciers as total_engage', 'montant_engage')
                ->select('partenaire.*')
                ->selectSub(function ($subQuery) {
                    $subQuery->selectRaw('IFNULL(SUM(versements.montant_verse), 0)')
                             ->from('versements')
                             ->join('engagements_financiers', 'versements.engagement_id', '=', 'engagements_financiers.id')
                             ->whereColumn('engagements_financiers.partenaire_id', 'partenaire.Id');
                }, 'total_verse');

            if ($request->has('search') && !empty($request->search)) {
                $searchTerm = '%' . $request->search . '%';
                Log::debug("Applying financial summary search: " . $searchTerm);
                $query->where(function($q) use ($searchTerm) {
                    $q->where('partenaire.Description', 'like', $searchTerm)
                      ->orWhere('partenaire.Code', 'like', $searchTerm);
                });
            }

            $sortBy = $request->query('sortBy', 'Description');
            $sortOrder = $request->query('sortOrder', 'asc');
            $allowedSorts = ['Description', 'Code', 'total_engage', 'total_verse'];
            if (in_array($sortBy, $allowedSorts)) {
                 $query->orderBy($sortBy, $sortOrder);
            } else {
                 $query->orderBy('Description', 'asc');
                 Log::warning("Financial Summary: Attempted to sort by invalid column '{$sortBy}'. Using default.");
            }

            $perPage = $request->query('perPage', 15);
            $partnersSummary = $query->paginate($perPage);

            $partnersSummary->getCollection()->transform(function ($partner) {
                 $totalEngage = (float) ($partner->total_engage ?? 0);
                 $totalVerse = (float) ($partner->total_verse ?? 0);
                 $partner->reste_a_payer = $totalEngage - $totalVerse;
                 return $partner;
            });

            Log::debug('Partner Summary data structure before response:', $partnersSummary->toArray());
            return response()->json([
                'partnerSummary' => $partnersSummary->items(),
                'pagination' => [
                    'currentPage' => $partnersSummary->currentPage(),
                    'totalPages' => $partnersSummary->lastPage(),
                    'totalItems' => $partnersSummary->total(),
                    'perPage' => $partnersSummary->perPage(),
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching partner financial summary: ' . $e->getMessage(), [
                'exception' => $e,
                'request' => $request->all()
            ]);
            return response()->json(['message' => 'Erreur lors de la récupération du résumé financier des partenaires.'], 500);
        }
    }

    // details method seems redundant if getDetailsWithSummary is primary, or serves a different purpose.
    // If it's just a simpler version, it's fine.
    public function details(string $id)
    {
        try {
            $partenaire = Partenaire::with(['conventions', 'engagementsFinanciers']) // Specify actual relationships
                                    ->findOrFail($id); // Assumes PK 'Id'
            return response()->json($partenaire); // Nest if preferred: ['partenaireDetails' => $partenaire]

        } catch (ModelNotFoundException $e) {
            return response()->json(['message' => 'Partenaire non trouvé.'], 404);
        } catch (\Exception $e) {
            Log::error("Error fetching details for partenaire ID {$id}: " . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return response()->json(['message' => 'Erreur lors de la récupération des détails du partenaire.'], 500);
        }
    }

    public function getDetailsWithSummary(string $id)
    {
        try {
            Log::debug("Fetching details with summary for partner ID: {$id}");
            $partner = Partenaire::findOrFail($id); // Assumes PK 'Id'

            $partner->loadCount('engagementsFinanciers');
            $partner->loadSum('engagementsFinanciers as total_engage_explicit', 'montant_engage');

            $totalVerse = DB::table('versements')
                             ->join('engagements_financiers', 'versements.engagement_id', '=', 'engagements_financiers.id')
                             ->where('engagements_financiers.partenaire_id', $partner->Id)
                             ->sum('versements.montant_verse');
            $partner->total_verse = $totalVerse ?? 0;

            Log::info("Partner After Explicit Loads (ID: {$id}): ", $partner->toArray());
            Log::info("Count of Engagements: " . $partner->engagements_financiers_count);
            Log::info("Explicit Sum Engagements: " . ($partner->total_engage_explicit ?? 'NULL'));
            Log::info("Calculated total_verse: " . $partner->total_verse);

            $totalEngage = (float) ($partner->total_engage_explicit ?? 0);
            $totalVerseCal = (float) ($partner->total_verse ?? 0); // Use the calculated one
            $partner->reste_a_payer = $totalEngage - $totalVerseCal;
            $partner->total_engage = $totalEngage;

            Log::debug("Final partner data with reste_a_payer:", $partner->toArray());
            return response()->json(['partenaireDetails' => $partner]);
        } catch (ModelNotFoundException $e) {
            Log::warning("Partner not found for details with summary. ID: {$id}");
            return response()->json(['message' => 'Partenaire non trouvé.'], 404);
        } catch (\Exception $e) {
            Log::error("Error fetching details with summary for partner ID {$id}: " . $e->getMessage(), ['exception' => $e, 'trace' => $e->getTraceAsString()]);
            return response()->json(['message' => 'Erreur lors de la récupération des détails du partenaire.'], 500);
        }
    }
}