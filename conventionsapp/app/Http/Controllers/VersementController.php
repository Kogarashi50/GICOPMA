<?php

namespace App\Http\Controllers;

use App\Models\Versement;
use App\Models\EngagementFinancier;
use App\Models\Projet; // Needed for fetching partners by project
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Database\QueryException; // Specifically for DB constraint errors
use Exception; // Catch generic exceptions
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB; // Although not directly used for transactions here, good practice to keep if needed elsewhere

// Assuming a helper function exists for formatting currency, like:
// if (!function_exists('formatCurrency')) {
//     function formatCurrency($amount, $decimals = 2, $decPoint = ',', $thousandsSep = ' ') {
//         return number_format($amount, $decimals, $decPoint, $thousandsSep);
//     }
// }

class VersementController extends Controller
{
    /**
     * Display a listing of the resource.
     * Handles fetching data for the DynamicTable.
     *
     * @param \Illuminate\Http\Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function index(Request $request)
    {
        try {
            Log::debug("Fetching versements list...");

            // Eager load necessary relationships for display
            $query = Versement::with([
                'engagementFinancier.projet:ID_Projet,Code_Projet,Nom_Projet', // Select specific project fields
                'engagementFinancier.partenaire:Id,Code,Description,Description_Arr' // Select specific partner fields (check 'Id' is PK)
            ]);

            // Sorting
            $sortBy = $request->query('sortBy', 'date_versement');
            $sortOrder = $request->query('sortOrder', 'desc');
            // Basic validation to prevent SQL injection via column name
            if (Schema::hasColumn('versements', $sortBy)) {
                 $query->orderBy($sortBy, $sortOrder);
            } else {
                 Log::warning("Attempted to sort by invalid or non-existent column: {$sortBy}. Defaulting to date_versement.");
                 $query->orderBy('date_versement', 'desc'); // Safe default
            }


            // Search/Filtering
            if ($request->has('search') && !empty($request->search)) {
                $searchTerm = '%' . $request->search . '%';
                Log::debug("Applying search term: " . $request->search); // Log the raw search term
                $query->where(function ($q) use ($searchTerm) {
                    $q->Where('commentaire', 'like', $searchTerm)
                      // Search in related project fields
                      ->orWhereHas('engagementFinancier.projet', function($subQ) use ($searchTerm) {
                          $subQ->where('Nom_Projet', 'like', $searchTerm)
                               ->orWhere('Code_Projet', 'like', $searchTerm); // Make sure Code_Projet is string/varchar type
                      })
                      // Search in related partner fields
                      ->orWhereHas('engagementFinancier.partenaire', function($subQ) use ($searchTerm) {
                          $subQ->where('Description', 'like', $searchTerm)
                               ->orWhere('Code', 'like', $searchTerm) // Make sure Code is string/varchar type
                               ->orWhere('Description_Arr', 'like', $searchTerm);
                      });
                });
            }


            // Pagination
            $perPage = $request->query('perPage', 10); // Default to 10 items per page
            $versements = $query->paginate($perPage);

            // Log the structure being sent for debugging frontend issues
            // Log::debug('Versements data structure before response:', $versements->toArray());

            // Return JSON structure suitable for a dynamic table component
            return response()->json([
                'versements' => $versements->items(), // The actual data items for the current page
                'pagination' => [
                    'currentPage' => $versements->currentPage(),
                    'totalPages' => $versements->lastPage(),
                    'totalItems' => $versements->total(),
                    'perPage' => $versements->perPage(),
                    'from' => $versements->firstItem(), // Optional: for display like "Showing X to Y of Z"
                    'to' => $versements->lastItem(),   // Optional
                ],
            ]);

        } catch (Exception $e) {
            Log::error('Error fetching versements: ' . $e->getMessage(), ['exception' => $e]);
            return response()->json(['message' => 'Erreur lors de la récupération des versements.'], 500);
        }
    }

    /**
     * Store a newly created resource in storage.
     *
     * @param \Illuminate\Http\Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function store(Request $request)
    {
        // --- Validation Rules (Using Code 2's nullable moyen_paiement) ---
        $validator = Validator::make($request->all(), [
            'engagement_id' => 'required|integer|exists:engagements_financiers,id',
            'date_versement' => 'required|date_format:Y-m-d',
            'montant_verse' => 'required|numeric|min:0.01', // Ensure positive amount
            'commentaire' => 'nullable|string',
        ], [ /* Custom messages */
            'engagement_id.required' => 'L\'engagement financier est requis.',
            'engagement_id.exists' => 'L\'engagement financier sélectionné est invalide.',
            'date_versement.required' => 'La date de versement est requise.',
            'date_versement.date_format' => 'Le format de la date de versement doit être AAAA-MM-JJ.',
            'montant_verse.required' => 'Le montant versé est requis.',
            'montant_verse.numeric' => 'Le montant versé doit être un nombre.',
            'montant_verse.min' => 'Le montant versé doit être strictement positif.',
            // No message needed for moyen_paiement required
            'moyen_paiement.max' => 'Le moyen de paiement ne doit pas dépasser 50 caractères.',
         ]);

        if ($validator->fails()) {
            Log::warning('Versement store validation failed:', $validator->errors()->toArray());
            return response()->json(['message' => 'Erreurs de validation.', 'errors' => $validator->errors()], 422);
        }

        $validatedData = $validator->validated();
        $engagementId = $validatedData['engagement_id'];
        $newMontantVerse = (float) $validatedData['montant_verse'];

        try {
            // --- Check Amount Limit ---
            $engagement = EngagementFinancier::findOrFail($engagementId);
            $montantEngage = (float) $engagement->montant_engage;
            $totalDejaVerse = (float) Versement::where('engagement_id', $engagementId)->sum('montant_verse');
            $nouveauTotal = $totalDejaVerse + $newMontantVerse;
            $tolerance = 0.001; // For floating point comparisons

            Log::debug("Versement Store Check: Engagement ID {$engagementId}, Engagé={$montantEngage}, Déjà Versé={$totalDejaVerse}, Nouveau Montant={$newMontantVerse}, Nouveau Total={$nouveauTotal}");

            if (($nouveauTotal - $montantEngage) > $tolerance) {
                 $maxAutorise = max(0, $montantEngage - $totalDejaVerse); // Calculate remaining allowed amount
                 $maxAutoriseFormatted = number_format($maxAutorise, 2, ',', ' '); // Format for user display
                 $montantEngageFormatted = number_format($montantEngage, 2, ',', ' ');
                 $nouveauTotalFormatted = number_format($nouveauTotal, 2, ',', ' ');


                 Log::warning("Versement Store Rejected: Amount limit exceeded for Engagement ID {$engagementId}.");

                 return response()->json([
                     'message' => 'Le montant dépasse l\'engagement.',
                     'errors' => [
                         'montant_verse' => [
                             "Le montant total versé ({$nouveauTotalFormatted} MAD) dépasserait le montant engagé ({$montantEngageFormatted} MAD). Montant maximum autorisé pour ce versement: {$maxAutoriseFormatted} MAD."
                         ]
                     ]
                 ], 422);
            }
            // --- End Check Amount Limit ---

            // Create the Versement
            $versement = Versement::create($validatedData);

            // Eager load relationships for the response (consistent with index/show)
            $versement->load([
                'engagementFinancier:id,montant_engage,projet_id,partenaire_id',
                'engagementFinancier.projet:ID_Projet,Code_Projet,Nom_Projet',
                'engagementFinancier.partenaire:Id,Code,Description,Description_Arr'
            ]);

            Log::info("Versement created successfully with ID: {$versement->id} for Engagement ID: {$engagementId}");
            return response()->json([
                'message' => 'Versement créé avec succès!',
                'versement' => $versement
            ], 201); // HTTP 201 Created

        } catch (ModelNotFoundException $e) {
             // Should not happen if validation passes, but good safety net
             Log::error("Versement Store Error: EngagementFinancier ID {$engagementId} not found unexpectedly.");
             return response()->json(['message' => 'Erreur: Engagement financier associé non trouvé.'], 404);
        } catch (Exception $e) {
            Log::error('Error creating versement: ' . $e->getMessage(), [
                'exception' => $e,
                'request_data' => $request->except(['password', 'password_confirmation']) // Log request safely
            ]);
            return response()->json(['message' => 'Erreur serveur lors de la création du versement.'], 500);
        }
    }
    /**
     * Display the specified resource.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  int  $id The ID of the Versement
     * @return \Illuminate\Http\JsonResponse
     */
    public function show(Request $request, $id)
    {
        try {
             $withDetails = $request->query('include') === 'engagementDetails';

             $query = Versement::query();

             // Eager load necessary fields for display/context
             $query->with([
                 'engagementFinancier:id,montant_engage,projet_id,partenaire_id',
                 'engagementFinancier.projet:ID_Projet,Code_Projet,Nom_Projet',
                 'engagementFinancier.partenaire:Id,Code,Description,Description_Arr'
                ]);


             $versement = $query->findOrFail($id);

             $responseData = ['versement' => $versement];

             // If details were requested AND the engagement relationship loaded correctly
             if ($withDetails && $versement->engagementFinancier) {
                 // Calculate total paid for the specific engagement
                 $totalDejaVersePourEngagement = Versement::where('engagement_id', $versement->engagement_id)
                                                          ->sum('montant_verse');
                 // Add calculated sum to the response
                 $responseData['total_deja_verse_pour_engagement'] = $totalDejaVersePourEngagement ?? 0;

                 Log::debug("Show Versement ID {$id} with details: Total Versé for Engagement {$versement->engagement_id} = {$responseData['total_deja_verse_pour_engagement']}");

             } elseif ($versement->engagementFinancier) {
                 Log::debug("Show Versement ID {$id} without extra details.");
             } else {
                 // Should not happen if data is consistent, but good to log
                 Log::warning("Versement ID {$id} loaded, but its engagementFinancier relation is missing!");
             }


            return response()->json($responseData);

        } catch (ModelNotFoundException $e) {
            Log::warning("Versement ID {$id} not found.");
            return response()->json(['message' => 'Versement non trouvé.'], 404);
        } catch (Exception $e) {
            Log::error("Error fetching versement ID {$id}: " . $e->getMessage(), ['exception' => $e]);
            return response()->json(['message' => 'Erreur serveur lors de la récupération du versement.'], 500);
        }
    }
    /**
     * Update the specified resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  int  $id The ID of the Versement to update
     * @return \Illuminate\Http\JsonResponse
     */
    public function update(Request $request, $id)
    {
        // --- Validation Rules (Using Code 2's nullable moyen_paiement) ---
        $validator = Validator::make($request->all(), [
            'engagement_id' => 'sometimes|required|integer|exists:engagements_financiers,id', // Required if present
            'date_versement' => 'sometimes|required|date_format:Y-m-d', // Required if present
            'montant_verse' => 'sometimes|required|numeric|min:0.01', // Required if present, must be positive

            'commentaire' => 'nullable|string', // Always optional
        ], [ /* Custom error messages - can reuse from store */
            'engagement_id.required' => 'L\'engagement financier est requis si fourni.',
            'engagement_id.exists' => 'L\'engagement financier sélectionné est invalide.',
            'date_versement.required' => 'La date de versement est requise si fournie.',
            'date_versement.date_format' => 'Le format de la date de versement doit être AAAA-MM-JJ.',
            'montant_verse.required' => 'Le montant versé est requis si fourni.',
            'montant_verse.numeric' => 'Le montant versé doit être un nombre.',
            'montant_verse.min' => 'Le montant versé doit être strictement positif.',

         ]);

         if ($validator->fails()) {
             Log::warning("Versement update validation failed for ID {$id}:", $validator->errors()->toArray());
             return response()->json(['message' => 'Erreurs de validation.', 'errors' => $validator->errors()], 422);
         }
         $validatedData = $validator->validated();

         // Prevent empty updates
         if (empty($validatedData)) {
             return response()->json(['message' => 'Aucune donnée fournie pour la mise à jour.'], 400);
         }


        try {
            $versement = Versement::with('engagementFinancier')->findOrFail($id); // Load current engagement

            // Determine the engagement ID to check against (new one if provided, else the existing one)
            $engagementId = $validatedData['engagement_id'] ?? $versement->engagement_id;
            // Determine the new amount if provided, otherwise use the current amount for checks
            $newMontantVerse = isset($validatedData['montant_verse']) ? (float)$validatedData['montant_verse'] : (float)$versement->montant_verse;

            // --- Check Amount Limit only if relevant fields changed ---
            $needsAmountCheck = isset($validatedData['montant_verse']) || isset($validatedData['engagement_id']);

            if ($needsAmountCheck) {
                // Fetch the relevant engagement (could be the old one or a new one)
                $engagement = ($engagementId == $versement->engagement_id && $versement->relationLoaded('engagementFinancier'))
                               ? $versement->engagementFinancier
                               : EngagementFinancier::findOrFail($engagementId); // Fetch if changed or not loaded

                $montantEngage = (float) $engagement->montant_engage;

                // Calculate sum of OTHER existing versements for the target engagement
                $totalAutresVersements = (float) Versement::where('engagement_id', $engagementId)
                                                           ->where('id', '!=', $id) // Exclude the versement being updated
                                                           ->sum('montant_verse');

                $nouveauTotal = $totalAutresVersements + $newMontantVerse; // Potential total with the new/updated amount
                $tolerance = 0.001;

                Log::debug("Versement Update Check: Versement ID {$id}, Engagement ID {$engagementId}, Engagé={$montantEngage}, Autres Versés={$totalAutresVersements}, Nouveau Montant={$newMontantVerse}, Nouveau Total={$nouveauTotal}");

                if (($nouveauTotal - $montantEngage) > $tolerance) {
                    $maxAutorise = max(0, $montantEngage - $totalAutresVersements);
                    $maxAutoriseFormatted = number_format($maxAutorise, 2, ',', ' ');
                    $montantEngageFormatted = number_format($montantEngage, 2, ',', ' ');
                    $nouveauTotalFormatted = number_format($nouveauTotal, 2, ',', ' ');


                    Log::warning("Versement Update Rejected: Amount limit exceeded for Engagement ID {$engagementId} on Versement ID {$id}.");

                    return response()->json([
                        'message' => 'Le montant dépasse l\'engagement.',
                        'errors' => [
                            'montant_verse' => [
                                "Le montant total versé ({$nouveauTotalFormatted} MAD) dépasserait le montant engagé ({$montantEngageFormatted} MAD). Montant maximum autorisé pour ce versement: {$maxAutoriseFormatted} MAD."
                            ]
                        ]
                    ], 422);
                }
           }
           // --- End Check Amount Limit ---

           // Update the Versement with only the validated fields provided
           $versement->update($validatedData);

           // Reload fresh data with relations for the response
           $versement->refresh()->load([
               'engagementFinancier:id,montant_engage,projet_id,partenaire_id',
               'engagementFinancier.projet:ID_Projet,Code_Projet,Nom_Projet',
               'engagementFinancier.partenaire:Id,Code,Description,Description_Arr'
           ]);

           Log::info("Versement updated successfully with ID: {$id}");
           return response()->json([
               'message' => 'Versement mis à jour avec succès!',
               'versement' => $versement
           ]);

       } catch (ModelNotFoundException $e) {
            Log::error("Versement Update Error: Versement ID {$id} or related Engagement not found.");
            // Distinguish between Versement not found vs Engagement not found if possible/needed
            $message = str_contains($e->getMessage(), 'EngagementFinancier')
                       ? 'Engagement financier associé non trouvé.'
                       : 'Versement non trouvé.';
            return response()->json(['message' => $message], 404);
       } catch (Exception $e) {
           Log::error("Error updating versement ID {$id}: " . $e->getMessage(), [
               'exception' => $e,
               'request_data' => $request->except(['password', 'password_confirmation'])
            ]);
           return response()->json(['message' => 'Erreur serveur lors de la mise à jour du versement.'], 500);
       }
    }

    /**
     * Remove the specified resource from storage.
     *
     * @param  int  $id The ID of the Versement to delete
     * @return \Illuminate\Http\JsonResponse
     */
    public function destroy($id)
    {
        try {
            $versement = Versement::findOrFail($id);
            $engagementId = $versement->engagement_id; // Store before deleting for logging
            $versement->delete();

            Log::info("Versement deleted successfully with ID: {$id} (was associated with Engagement ID: {$engagementId})");
            return response()->json(['message' => 'Versement supprimé avec succès!'], 200); // 200 OK or 204 No Content

        } catch (ModelNotFoundException $e) {
            Log::warning("Attempted to delete non-existent Versement ID: {$id}");
            return response()->json(['message' => 'Versement non trouvé.'], 404);
        } catch (QueryException $e) {
            // Catch potential foreign key constraint issues
            // Error codes can vary by database, 1451 is common for MySQL FK constraint
            if ($e->getCode() == '23000' || str_contains($e->getMessage(), 'constraint fails')) { // General integrity constraint or specific message check
                 Log::warning("Attempted to delete versement ID {$id} which has dependent records.", ['error_code' => $e->getCode()]);
                 // Provide a user-friendly message, avoid exposing DB details
                 return response()->json(['message' => 'Impossible de supprimer ce versement car il est référencé par d\'autres données.'], 409); // 409 Conflict
            }
            // Log other query exceptions
            Log::error("Database error deleting versement ID {$id}: " . $e->getMessage(), ['exception' => $e]);
            return response()->json(['message' => 'Erreur de base de données lors de la suppression du versement.'], 500);
        } catch (Exception $e) {
            Log::error("Generic error deleting versement ID {$id}: " . $e->getMessage(), ['exception' => $e]);
            return response()->json(['message' => 'Erreur lors de la suppression du versement.'], 500);
        }
    }

    // ==========================================================================
    // == HELPER METHODS FOR DYNAMIC FORM INTERACTIONS ==
    // ==========================================================================

    /**
     * Get partners who have a financial engagement for a specific project.
     *
     * @param  int $projetId The ID_Projet of the selected project.
     * @return \Illuminate\Http\JsonResponse
     */
    public function getEngagedPartnersForProject($projetId)
    {
        // Basic validation of input
        if (!filter_var($projetId, FILTER_VALIDATE_INT)) {
             return response()->json(['message' => 'ID de projet invalide.'], 400);
        }

        try {
            // Find engagements for the project, ensuring the project actually exists implicitly
            $engagements = EngagementFinancier::where('projet_id', $projetId)
                            ->with('partenaire:Id,Code,Description,Description_Arr') // Eager load only needed partner fields
                            ->whereHas('partenaire') // Ensure partner exists
                            ->get();

            // Extract unique partners
            $partners = $engagements->map->partenaire // Equivalent to map(fn($e) => $e->partenaire)
                                     ->unique('Id')   // Get unique based on partner ID
                                     ->values();      // Re-index array

            return response()->json(['partenaires' => $partners]);

        } catch (Exception $e) {
            Log::error("Error fetching partners for project ID {$projetId}: " . $e->getMessage(), ['exception' => $e]);
            return response()->json(['message' => 'Erreur lors de la récupération des partenaires pour ce projet.'], 500);
        }
    }


     /**
      * Get the engagement details (ID, amount engaged, amount already paid)
      * for a specific Project and Partner pair.
      *
      * @param  \Illuminate\Http\Request $request (expects 'projet_id' and 'partenaire_id')
      * @return \Illuminate\Http\JsonResponse
      */
      public function getEngagementIdForProjectPartner(Request $request)
      {
          // Validate incoming request parameters
          $validator = Validator::make($request->all(), [
              'projet_id' => 'required|integer|exists:projet,ID_Projet', // Ensure projet exists
              'partenaire_id' => 'required|integer|exists:partenaire,Id', // Ensure partenaire exists
          ]);

           if ($validator->fails()) {
               return response()->json(['message' => 'Projet ou Partenaire manquant/invalide.', 'errors' => $validator->errors()], 400); // Bad Request
           }

          try {
              $projetId = $request->input('projet_id');
              $partenaireId = $request->input('partenaire_id');

              // Find the *first* engagement linking this specific project and partner
              // Assumes only one active engagement per pair matters for versements. Adjust if needed.
              $engagement = EngagementFinancier::where('projet_id', $projetId)
                                                ->where('partenaire_id', $partenaireId)
                                                ->select('id', 'montant_engage') // Select only ID and amount
                                                ->first(); // Use first() as we expect one or none

              if ($engagement) {
                  // Calculate the total already paid for THIS specific engagement
                  $totalDejaVerse = Versement::where('engagement_id', $engagement->id)->sum('montant_verse');

                  Log::debug("Fetched engagement details for Project {$projetId}, Partner {$partenaireId}: EngagementID={$engagement->id}, MontantEngage={$engagement->montant_engage}, TotalDejaVerse={$totalDejaVerse}");

                  // Return all three pieces of data needed by the frontend form
                  return response()->json([
                      'engagement_id' => $engagement->id,
                      'montant_engage' => (float) $engagement->montant_engage, // Cast to float for consistency
                      'total_deja_verse' => (float) ($totalDejaVerse ?? 0) // Cast to float, default to 0
                  ]);
              } else {
                  // No engagement found for this specific pair
                  Log::warning("No engagement found for Project {$projetId} and Partner {$partenaireId}.");
                  return response()->json(['message' => 'Aucun engagement financier trouvé pour ce projet et ce partenaire.'], 404); // Not Found
              }

          } catch (Exception $e) {
               Log::error("Error fetching engagement details for projet {$request->input('projet_id')} / partenaire {$request->input('partenaire_id')}: " . $e->getMessage(), ['exception' => $e]);
               return response()->json(['message' => 'Erreur lors de la récupération des détails de l\'engagement.'], 500); // Internal Server Error
          }
      }
}