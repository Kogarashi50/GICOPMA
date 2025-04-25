<?php

namespace App\Http\Controllers;

// Required Model imports
use App\Models\Partenaire;
use Illuminate\Http\JsonResponse; // Added for return type hinting

// Required Facades and Classes
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Illuminate\Validation\Rule;
use Illuminate\Database\Eloquent\ModelNotFoundException; // Added for specific exception catching
use Illuminate\Database\QueryException; // Added for catching DB constraints


class PartenaireController extends Controller
{
    /**
     * Display a listing of the partenaires.
     * GET /api/partenaires
     * Mirroring ConventionController's index structure (fetching all, non-paginated)
     */
    public function index(Request $request): JsonResponse
    {
        Log::info('Récupération de la liste des partenaires...');
        try {
            $query = Partenaire::query(); // Start query builder

            // --- Search Logic (Optional - Keep if needed) ---
            if ($request->filled('search')) {
                $searchTerm = '%' . $request->search . '%';
                Log::debug("Application du filtre de recherche partenaires: '{$request->search}'");
                 $query->where(function($q) use ($searchTerm) {
                     $q->where('Code', 'like', $searchTerm)
                       ->orWhere('Description', 'like', $searchTerm)
                       ->orWhere('Description_Arr', 'like', $searchTerm);
                 });
            }

            // --- Sorting Logic (Optional - Keep if needed) ---
             $sortBy = $request->query('sortBy', 'Description'); // Default sort
             $sortOrder = $request->query('sortOrder', 'asc');
             $allowedSorts = ['Code', 'Description', 'Description_Arr', 'created_at', 'Id']; // Include PK if sortable
             if (in_array($sortBy, $allowedSorts)) {
                 $query->orderBy($sortBy, $sortOrder);
             } else {
                 Log::warning("Tri invalide demandé ('{$sortBy}'), utilisation du tri par défaut (Description).");
                 $query->orderBy('Description', 'asc');
             }

            // --- Fetch ALL Results ---
            // We removed pagination based on previous requirement.
            // Consider adding it back if the list becomes very large.
            $partenaires = $query->get();

            Log::info('Récupération réussie de ' . $partenaires->count() . ' partenaires.');

            // Return the data wrapped in a key matching the frontend expectation
            return response()->json(['partenaires' => $partenaires], 200);

        } catch (\Exception $e) {
             Log::error('Erreur lors de la récupération des partenaires:', ['message' => $e->getMessage()]);
             return response()->json(['message' => 'Erreur serveur lors de la récupération des partenaires.'], 500);
        }
    }

    /**
     * Store a newly created partenaire in storage.
     * POST /api/partenaires
     */
    public function store(Request $request): JsonResponse
    {
        Log::info('Requête de création de partenaire reçue...');
        Log::debug('Données brutes (store):', $request->all());

        try {
            // 1. Validate the incoming request data
            $validatedData = $request->validate([
                'Code'          => 'required|integer|unique:partenaire,Code', // Unique check on 'partenaire' table, 'Code' column
                'Description'     => 'required|string|max:255',
                'Description_Arr' => 'nullable|string|max:255',
                // Add other fillable fields if they exist and need validation
            ], [
                // Custom French Validation Messages
                'Code.required' => 'Le champ Code est obligatoire.',
                'Code.integer' => 'Le champ Code doit être un nombre entier.',
                'Code.unique' => 'Ce Code partenaire est déjà utilisé.',
                'Description.required' => 'Le champ Description (Français) est obligatoire.',
                'Description.max' => 'La Description (Français) ne doit pas dépasser :max caractères.',
                'Description_Arr.max' => 'La Description (Arabe) ne doit pas dépasser :max caractères.',
            ]);
            Log::info('Validation principale réussie (store partenaire).');

            // 2. Create the Partenaire Record within a transaction
            $partenaire = null;
            DB::beginTransaction();
            Log::info('Transaction DB démarrée (store partenaire).');

            try {
                // Ensure $fillable in Partenaire model includes these fields
                $partenaire = Partenaire::create($validatedData);
                Log::info("Partenaire créé: ID {$partenaire->Id}"); // Use correct PK 'Id'

                DB::commit();
                Log::info('Transaction DB validée (store partenaire).');

            } catch (\Exception $dbException) {
                 DB::rollBack();
                 Log::error('ERREUR DB pendant création partenaire:', ['message' => $dbException->getMessage()]);
                 // Re-throw to be caught by the outer catch block
                 throw $dbException;
            }

            // 3. Return Success Response
            // Load any relationships if needed immediately by the frontend after creation
            // $partenaire->load([]);
            return response()->json([
                "message" => "Partenaire créé avec succès!",
                "partenaire" => $partenaire // Return the newly created partner
            ], 201); // 201 Created status code

        // --- Catch Blocks ---
        } catch (ValidationException $e) {
            Log::error('Échec validation (store partenaire):', ['errors' => $e->errors()]);
            return response()->json(['message' => 'Données invalides.', 'errors' => $e->errors()], 422);
        } catch (\Exception $e) {
             // General error catch (includes DB errors re-thrown from inner catch)
             Log::error('ERREUR GÉNÉRALE (store partenaire):', ['message' => $e->getMessage()]);
             return response()->json([
                 "message" => "Échec de la création du partenaire.",
                 "error_details" => $e->getMessage() // Provide details in non-production if helpful
                ], 500);
        }
    }


    /**
     * Display the specified partenaire.
     * GET /api/partenaires/{id}
     * Note: Laravel uses route model binding if the parameter name matches the type hint variable name.
     * However, since the primary key is 'Id' not 'id', we manually find it.
     */
    public function show(string $id): JsonResponse
    {
        Log::info("API: Requête pour détails Partenaire ID: {$id}");
        try {
            // Find by primary key 'Id'
            $partenaire = Partenaire::findOrFail($id);

            // Eager load relationships if needed for the detailed view
            // $partenaire->load(['engagementsFinanciers', 'conventions']);

            Log::info("API: Succès récupération détails Partenaire ID: {$id}");
            return response()->json(['partenaire' => $partenaire], 200);

        } catch (ModelNotFoundException $e) {
            Log::warning("API: Partenaire ID {$id} non trouvé.");
            return response()->json(['message' => 'Partenaire non trouvé.'], 404);
        } catch (\Exception $e) {
            Log::error("API: Erreur récupération détaillée Partenaire ID {$id}:", ['message' => $e->getMessage()]);
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
            // 1. Find the existing partner
            $partenaire = Partenaire::findOrFail($id);

            // 2. Validate the incoming request data
            $validatedData = $request->validate([
                // Use Rule::unique to ignore the current partner's ID based on its primary key 'Id'
                'Code'          => ['required', 'integer', Rule::unique('partenaire', 'Code')->ignore($partenaire->Id, 'Id')],
                'Description'     => 'required|string|max:255',
                'Description_Arr' => 'nullable|string|max:255',
            ], [
                 // Custom French Validation Messages (similar to store)
                 'Code.required' => 'Le champ Code est obligatoire.',
                 'Code.integer' => 'Le champ Code doit être un nombre entier.',
                 'Code.unique' => 'Ce Code partenaire est déjà utilisé par un autre partenaire.',
                 'Description.required' => 'Le champ Description (Français) est obligatoire.',
                 'Description.max' => 'La Description (Français) ne doit pas dépasser :max caractères.',
                 'Description_Arr.max' => 'La Description (Arabe) ne doit pas dépasser :max caractères.',
            ]);
            Log::info('Validation principale réussie (update partenaire).');

            // 3. Update the Partenaire Record within a transaction
            DB::beginTransaction();
            Log::info('Transaction DB démarrée (update partenaire).');
            try {
                $updated = $partenaire->update($validatedData);

                if (!$updated) {
                     // Should not happen often if validation passes and model exists, but good practice
                     Log::warning("La mise à jour du partenaire ID {$id} a retourné false.");
                     throw new \Exception("La mise à jour en base de données a échoué sans exception.");
                 }
                Log::info("Partenaire MAJ: ID {$partenaire->Id}");

                DB::commit();
                Log::info('Transaction DB validée (update partenaire).');

            } catch (\Exception $dbException) {
                DB::rollBack();
                Log::error('ERREUR DB pendant MAJ partenaire:', ['id' => $id, 'message' => $dbException->getMessage()]);
                throw $dbException; // Re-throw
            }

            // 4. Return Success Response
            return response()->json([
                'message' => 'Partenaire mis à jour avec succès!',
                'partenaire' => $partenaire->fresh() // Return the updated model
            ], 200);

        // --- Catch Blocks ---
        } catch (ModelNotFoundException $e) {
             Log::warning("Partenaire non trouvé pour MAJ. ID: {$id}");
             return response()->json(['message' => 'Partenaire non trouvé.'], 404);
        } catch (ValidationException $e) {
             Log::error('Échec validation (update partenaire):', ['id' => $id, 'errors' => $e->errors()]);
             return response()->json(['message' => 'Données invalides.', 'errors' => $e->errors()], 422);
        } catch (\Exception $e) {
             Log::error('ERREUR GÉNÉRALE (update partenaire):', ['id' => $id, 'message' => $e->getMessage()]);
             return response()->json([
                 "message" => "Échec de la modification du partenaire.",
                 "error_details" => $e->getMessage()
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
            // 1. Find the partner
            $partenaire = Partenaire::findOrFail($id);

            // 2. Perform Deletion within a Transaction
            DB::beginTransaction();
            Log::info("Transaction DB (destroy partenaire) ID: {$id}");
            try {
                // Attempt to delete the partner
                $deleted = $partenaire->delete();

                if (!$deleted) {
                     Log::warning("La suppression du partenaire ID {$id} a retourné false.");
                     throw new \Exception("La suppression en base de données a échoué sans exception.");
                }

                Log::info("Partenaire supprimé (DB): ID {$id}");
                DB::commit();
                Log::info("Transaction DB validée (destroy partenaire).");

            } catch (\Exception $dbException) {
                DB::rollBack();
                Log::error('ERREUR DB pendant suppression partenaire:', ['id' => $id, 'message' => $dbException->getMessage()]);
                // Re-throw specific types if needed, otherwise let the outer catch handle
                throw $dbException;
            }

            // 3. Return Success Response
            return response()->json(['message' => 'Partenaire supprimé avec succès!'], 200); // 200 OK or 204 No Content

        // --- Catch Blocks ---
        } catch (ModelNotFoundException $e) {
            Log::warning("Partenaire ID: {$id} non trouvé pour suppression.");
            return response()->json(['message' => 'Partenaire non trouvé.'], 404);
        } catch (QueryException $qe) {
            // Catch foreign key constraint violations specifically
            DB::rollBack(); // Ensure rollback if transaction was started
            // Common MySQL foreign key violation code
            if ($qe->errorInfo[1] == 1451) {
                 Log::warning("Tentative suppression Partenaire ID {$id} échouée (FK Constraint).", ['error_code' => $qe->errorInfo[1]]);
                 return response()->json([
                     'message' => 'Impossible de supprimer ce partenaire car il est lié à d\'autres enregistrements (engagements, conventions, etc.). Veuillez d\'abord supprimer ou dissocier ces enregistrements.'
                 ], 409); // 409 Conflict status code
            }
            // Log other query exceptions
            Log::error('Erreur QueryException (destroy partenaire):', ['id' => $id, 'message' => $qe->getMessage(), 'sql_code' => $qe->errorInfo[1]]);
            return response()->json(['message' => 'Erreur base de données lors de la suppression.'], 500);
        } catch (\Exception $e) {
            // Catch any other exceptions (including those re-thrown from the inner try-catch)
             DB::rollBack(); // Ensure rollback just in case
             Log::error('ERREUR GÉNÉRALE (destroy partenaire):', ['id' => $id, 'message' => $e->getMessage()]);
             return response()->json([
                 "message" => "Erreur lors de la suppression du partenaire.",
                 "error_details" => $e->getMessage()
             ], 500);
        }
    }


    // --- Keep financial summary methods if still needed ---

    /**
     * Get a financial summary for each partner.
     */
    public function getFinancialSummary(Request $request)
    {
        try {
            Log::debug("Fetching partner financial summary...");

            $query = Partenaire::query()
                // Calculate Total Engaged using Eloquent's withSum on the relationship
                // Use the relationship name defined in the Partenaire model
                // Alias the sum as 'total_engage'
                ->withSum('engagementsFinanciers as total_engage', 'montant_engage')

                // Calculate Total Versé (Paid) using a subquery for efficiency
                // Select all original columns from partenaire table (using the correct table name)
                ->select('partenaire.*')
                // Define the subquery to sum versements linked through engagements
                ->selectSub(function ($subQuery) {
                    $subQuery->selectRaw('IFNULL(SUM(versements.montant_verse), 0)') // Sum versements, default to 0 if none
                             ->from('versements') // Target the versements table
                             // Join versements to engagements_financiers on the FK
                             ->join('engagements_financiers', 'versements.engagement_id', '=', 'engagements_financiers.id')
                             // Link the engagements back to the outer query's partner ID
                             // Ensure 'partenaire.Id' matches the outer table's PK alias/name
                             // Ensure 'engagements_financiers.partenaire_id' is the correct FK column name
                             ->whereColumn('engagements_financiers.partenaire_id', 'partenaire.Id');
                }, 'total_verse'); // Alias the subquery result as 'total_verse'


            // --- Optional: Add Search ---
            if ($request->has('search') && !empty($request->search)) {
                $searchTerm = '%' . $request->search . '%';
                Log::debug("Applying financial summary search: " . $searchTerm);
                $query->where(function($q) use ($searchTerm) {
                    $q->where('partenaire.Description', 'like', $searchTerm) // Qualify column name
                      ->orWhere('partenaire.Code', 'like', $searchTerm);      // Qualify column name
                });
                // Note: Searching directly on 'total_engage' or 'total_verse' calculated fields
                // usually requires ->having() instead of ->where(), which can impact performance.
                // Example: ->having('total_engage', '>', 10000)
            }

            // --- Optional: Add Sorting ---
            $sortBy = $request->query('sortBy', 'Description'); // Default sort column
            $sortOrder = $request->query('sortOrder', 'asc');   // Default sort order

            // Allow sorting by calculated fields (use the alias) or partner fields
            $allowedSorts = ['Description', 'Code', 'total_engage', 'total_verse'];
            // Add 'reste_a_payer' later if calculated in DB or handle client-side sorting

            if (in_array($sortBy, $allowedSorts)) {
                 // Sorting by aliases from withSum and selectSub should generally work with orderBy
                 $query->orderBy($sortBy, $sortOrder);
            } else {
                 $query->orderBy('Description', 'asc'); // Fallback sort
                 Log::warning("Financial Summary: Attempted to sort by invalid column '{$sortBy}'. Using default.");
            }


            // --- Pagination ---
            $perPage = $request->query('perPage', 15); // Sensible default
            $partnersSummary = $query->paginate($perPage);

            // --- Calculate Reste à Payer (in PHP after fetching) ---
            $partnersSummary->getCollection()->transform(function ($partner) {
                 // Ensure values are numeric and handle potential NULL from withSum
                 $totalEngage = (float) ($partner->total_engage ?? 0);
                 $totalVerse = (float) ($partner->total_verse ?? 0); // Already defaulted to 0 by IFNULL in SQL

                 $partner->reste_a_payer = $totalEngage - $totalVerse;

                 // You can keep total_engage and total_verse for display or unset them
                 // unset($partner->total_engage);
                 // unset($partner->total_verse);

                 return $partner;
            });


            Log::debug('Partner Summary data structure before response:', $partnersSummary->toArray());

            // Return structured JSON response
            return response()->json([
                'partnerSummary' => $partnersSummary->items(), // Key matches frontend expectation
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
                'request' => $request->all() // Log request params for debugging
            ]);
            return response()->json(['message' => 'Erreur lors de la récupération du résumé financier des partenaires.'], 500);
        }
    }


    public function details(string $id)
    {
        try {
            $partenaire = Partenaire::with(['conventions', 'engagementsFinanciers']) // Example eager loading
                                    ->findOrFail($id);
            return response()->json(['partenaireDetails' => $partenaire]);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['message' => 'Partenaire non trouvé.'], 404);
        } catch (\Exception $e) {
            Log::error("Error fetching details for partenaire ID {$id}: " . $e->getMessage());
            return response()->json(['message' => 'Erreur lors de la récupération des détails du partenaire.'], 500);
        }
    }
    public function getDetailsWithSummary(string $id)
    {
        try {
            Log::debug("Fetching details with summary for partner ID: {$id}");

            // 1. Find the partner first
            $partner = Partenaire::findOrFail($id);

            // 2. Explicitly load count and sum for debugging
            $partner->loadCount('engagementsFinanciers'); // Loads engagements_financiers_count
            $partner->loadSum('engagementsFinanciers as total_engage_explicit', 'montant_engage'); // Loads total_engage_explicit

            // 3. Calculate total_verse using the subquery (attach it to the found partner)
            $totalVerse = DB::table('versements')
                             ->join('engagements_financiers', 'versements.engagement_id', '=', 'engagements_financiers.id')
                             ->where('engagements_financiers.partenaire_id', $partner->Id) // Use the found partner's Id
                             ->sum('versements.montant_verse');
            // Add total_verse to the partner object
            $partner->total_verse = $totalVerse ?? 0; // Use found value or 0


            // *** Logging after explicit loads/calculation ***
            Log::info("Partner After Explicit Loads (ID: {$id}): ", $partner->toArray());
            Log::info("Count of Engagements: " . $partner->engagements_financiers_count);
            Log::info("Explicit Sum Engagements: " . ($partner->total_engage_explicit ?? 'NULL'));
            Log::info("Calculated total_verse: " . $partner->total_verse);
            // *** End Logging ***


            // Calculate Reste à Payer using the explicitly loaded/calculated values
            // Use 'total_engage_explicit' which was loaded by loadSum
            $totalEngage = (float) ($partner->total_engage_explicit ?? 0);
            $totalVerse = (float) ($partner->total_verse ?? 0); // Already calculated and added
            $partner->reste_a_payer = $totalEngage - $totalVerse;

            // Optionally add total_engage in the format the frontend expects if different from explicit
            $partner->total_engage = $totalEngage; // Add the standard key back

            Log::debug("Final partner data with reste_a_payer:", $partner->toArray());

            return response()->json(['partenaireDetails' => $partner]);

        } catch (ModelNotFoundException $e) {
            Log::warning("Partner not found for details with summary. ID: {$id}");
            return response()->json(['message' => 'Partenaire non trouvé.'], 404);
        } catch (\Exception $e) {
            Log::error("Error fetching details with summary for partner ID {$id}: " . $e->getMessage(), ['exception' => $e]);
            return response()->json(['message' => 'Erreur lors de la récupération des détails du partenaire.'], 500);
        }
    }

    // Add back details method if it serves a different purpose than getDetailsWithSummary
    /**
     * Get basic details for a specific partner.
     */

} // End of PartenaireController class