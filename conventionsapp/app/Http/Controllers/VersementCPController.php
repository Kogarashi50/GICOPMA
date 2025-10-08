<?php

namespace App\Http\Controllers; // Ensure this matches your project structure

use App\Models\VersementCP;
use App\Models\ConvPart;      // Ensure ConvPart model is imported
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\Rule;
use Illuminate\Database\Eloquent\ModelNotFoundException; // Good practice for show/update/destroy

class VersementCPController extends Controller
{
    /**
     * Display a listing of the payments.
     * Can be filtered by 'convpart_id' query parameter.
     * Includes related Convention and Partenaire details.
     * MERGED: No changes needed.
     *
     * @param  \Illuminate\Http\Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function index(Request $request): JsonResponse
    {
        $convPartId = $request->query('convpart_id');
        $logContext = $convPartId ? " pour ConvPart ID: {$convPartId}" : " (tous)";
        Log::info("API: Récupération des versements{$logContext}");
        try {
            $query = VersementCP::query()->with([
                'convPart.convention:id,code,intitule', // Select specific columns for efficiency
                'convPart.partenaire:Id,Description,Description_Arr,Code' // Include Code if needed
            ]);

            if ($convPartId) {
                 // Validate the ID format
                 if (!ctype_digit((string)$convPartId) || (int)$convPartId <= 0) {
                     Log::warning("API: Invalid ConvPart ID format provided for filtering: {$convPartId}");
                     return response()->json(['message' => 'ID ConvPart invalide fourni pour le filtrage.'], 400);
                 }
                 $query->where('id_CP', (int)$convPartId);
            }

            $versements = $query->orderBy('date_versement', 'desc')->get();

            Log::info("API: Récupéré " . $versements->count() . " versement(s){$logContext}.");
            return response()->json(['versements' => $versements], 200);

        } catch (\Exception $e) {
            Log::error("API: Erreur récupération versements{$logContext}:", [ 'message' => $e->getMessage(), 'trace' => $e->getTraceAsString() ]); // Limit trace in production
            return response()->json(['message' => 'Erreur serveur lors de la récupération des versements.'], 500);
        }
    }

    /**
     * Store a newly created payment record.
     * Includes check to prevent exceeding Montant Convenu.
     *
     * @param  \Illuminate\Http\Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function store(Request $request): JsonResponse
    {
        Log::info("API: Tentative création versement.");
        Log::debug("Store VersementCP request data:", $request->all());

        $validator = Validator::make($request->all(), [
            'id_CP'              => ['required', 'integer', Rule::exists('convention_partenaire', 'Id_CP')],
            'date_versement'     => 'required|date_format:Y-m-d',
            'montant_verse'      => ['required', 'numeric', 'min:0.01', 'regex:/^\d+(\.\d{1,2})?$/'], // Positive, max 2 decimal places
           
            'commentaire'        => 'nullable|string|max:65535',
        ], [
            // French messages (examples)
            'id_CP.required' => 'L\'engagement partenaire (ID_CP) est obligatoire.',
            'id_CP.exists' => 'L\'engagement partenaire sélectionné est invalide.',
            'date_versement.required' => 'La date de versement est obligatoire.',
            'date_versement.date_format' => 'Le format de la date de versement est invalide (AAAA-MM-JJ).',
            'montant_verse.required' => 'Le montant versé est obligatoire.',
            'montant_verse.numeric' => 'Le montant versé doit être un nombre.',
            'montant_verse.min' => 'Le montant versé doit être positif.',
            'montant_verse.regex' => 'Le montant versé peut avoir au maximum 2 décimales.',
          
            'reference_paiement.max' => 'La référence de paiement ne doit pas dépasser :max caractères.',
        ]);

        if ($validator->fails()) {
            Log::warning("API: Échec validation création versement:", $validator->errors()->toArray());
            return response()->json(['message' => 'Données invalides fournies.', 'errors' => $validator->errors()], 422);
        }

        $validatedData = $validator->validated();
        $idCp = $validatedData['id_CP'];
        $newMontantVerse = (float) $validatedData['montant_verse'];

        try {
            // --- 2. Fetch Commitment Details & Check Existing Payments ---
            $convPart = ConvPart::find($idCp); // Consider findOrFail for stricter check

            if (!$convPart) {
                 // This case should technically be caught by Rule::exists, but good failsafe
                 Log::error("API: Échec création versement - ConvPart ID {$idCp} non trouvé post-validation.");
                 return response()->json(['message' => 'Erreur interne: Engagement non trouvé après validation.'], 500); // Or 404/422
            }

            $montantConvenu = (float) $convPart->Montant_Convenu;
            // Efficiently get sum of existing payments
            $totalDejaVerse = (float) VersementCP::where('id_CP', $idCp)->sum('montant_verse');

            // --- 3. Apply the Overpayment Check (Existing + New) ---
            $potentialTotal = $totalDejaVerse + $newMontantVerse;
            $tolerance = 0.001; // Small tolerance for floating point comparisons

            Log::debug("--- DEBUG: Versement Overpayment Check (Store) ---", [
                'ID_CP' => $idCp,
                'Montant_Convenu' => $montantConvenu,
                'Total_Deja_Verse' => $totalDejaVerse,
                'Nouveau_Montant_Verse' => $newMontantVerse,
                'Total_Potentiel' => $potentialTotal,
                'Limite' => $montantConvenu + $tolerance
            ]);


            if ($potentialTotal > ($montantConvenu + $tolerance)) {
                 Log::warning("API: Blocage création versement pour ID_CP {$idCp} - Dépassement montant convenu.");
                 return response()->json([
                     'message' => 'Le montant de ce versement ajouté au total déjà versé dépasse le montant convenu pour cet engagement.',
                     'errors' => [
                         'montant_verse' => [ "Le total versé ne peut excéder " . number_format($montantConvenu, 2, ',', ' ') . " MAD. (Déjà versé: " . number_format($totalDejaVerse, 2, ',', ' ') . " MAD)" ]
                     ],
                     'montant_convenu' => $montantConvenu,
                     'total_deja_verse' => $totalDejaVerse,
                     'montant_actuel' => $newMontantVerse,
                 ], 422); // 422 Unprocessable Entity is appropriate
            }

            // --- 4. Create the New Versement (If Check Passes) ---
            $versement = VersementCP::create($validatedData);
            Log::info("API: Versement créé avec ID: {$versement->id}, lié à ConvPart ID: {$idCp}");

            // Load relations for the response object
            $versement->load([
                'convPart.convention:id,code,intitule',
                'convPart.partenaire:Id,Description,Description_Arr,Code' // Include Code if needed
            ]);

            return response()->json([ 'message' => 'Versement ajouté avec succès!', 'versement' => $versement ], 201);

        } catch (\Exception $e) {
            Log::error("API: Erreur création versement (ID_CP: {$idCp}):", [ 'message' => $e->getMessage(), 'trace' => $e->getTraceAsString() ]);
            return response()->json(['message' => 'Erreur serveur lors de la création du versement.'], 500);
        }
    }

    /**
     * Display the specified payment record.
     * MERGED: No changes needed. Added ModelNotFoundException catch.
     */
    public function show(string $id): JsonResponse // Accept ID as string from route
    {
        Log::info("API: Récupération versement ID: {$id}");
        try {
            $versement = VersementCP::with([
                'convPart.convention',
                'convPart.partenaire'
            ])->findOrFail($id); 

             Log::info("API: Versement trouvé ID: {$id}");
             return response()->json(['versement' => $versement], 200);

        } catch (ModelNotFoundException $e) {
             Log::warning("API: Versement non trouvé ID: {$id}");
             return response()->json(['message' => 'Versement non trouvé.'], 404);
        } catch (\Exception $e) {
             Log::error("API: Erreur récupération versement ID {$id}:", [ 'message' => $e->getMessage(), 'trace' => $e->getTraceAsString() ]);
             return response()->json(['message' => 'Erreur serveur lors de la récupération du versement.'], 500);
        }
    }

    /**
     * Update the specified payment record in storage.
     */
    public function update(Request $request, string $id): JsonResponse // Accept ID as string from route
    {
        Log::info("API: Tentative MAJ versement ID: {$id}");
        Log::debug("Update VersementCP request data (ID: {$id}):", $request->all());

        try {
            // Find the record first
            $versement = VersementCP::findOrFail($id);

            $validator = Validator::make($request->all(), [
                'date_versement'     => 'sometimes|required|date_format:Y-m-d',
                'montant_verse'      => ['sometimes','required','numeric','min:0.01','regex:/^\d+(\.\d{1,2})?$/'],
                
                'commentaire'        => 'nullable|string|max:65535',
                // id_CP should not be updatable here
            ], [
                // Add relevant messages...
                'required' => 'Le champ :attribute est obligatoire.',
                'date_format' => 'Le format de la date de versement est invalide (AAAA-MM-JJ).',
                'numeric' => 'Le montant versé doit être un nombre.',
                'min' => 'Le montant versé doit être positif.',
                'regex' => 'Le montant versé peut avoir au maximum 2 décimales.',
                'max' => 'Le champ :attribute ne doit pas dépasser :max caractères.',
            ]);

            if ($validator->fails()) {
                Log::warning("API: Échec validation MAJ versement ID {$id}:", $validator->errors()->toArray());
                return response()->json(['message' => 'Données invalides fournies.', 'errors' => $validator->errors()], 422);
            }

            $validatedData = $validator->validated();
            $idCp = $versement->id_CP; // Get related commitment ID

            // --- Overpayment Check (if montant_verse is being updated) ---
            if (isset($validatedData['montant_verse'])) {
                $newMontantVerse = (float) $validatedData['montant_verse'];
                $convPart = $versement->convPart ?? ConvPart::find($idCp); // Load if not already loaded

                if (!$convPart) {
                    Log::error("API: Échec MAJ versement - ConvPart ID {$idCp} non trouvé pour versement ID {$versement->id}.");
                    return response()->json(['message' => 'Erreur interne: Engagement associé non trouvé.'], 500); // Or 404/422
                }

                $montantConvenu = (float) $convPart->Montant_Convenu;
                $totalVerseAutres = (float) VersementCP::where('id_CP', $idCp)
                                                      ->where('id', '!=', $versement->id) // Exclude THIS payment
                                                      ->sum('montant_verse');

                $potentialTotal = $totalVerseAutres + $newMontantVerse;
                $tolerance = 0.001;

                Log::debug("--- DEBUG: Versement UPDATE Overpayment Check ---", [
                    'ID_CP' => $idCp,
                    'Versement_ID' => $versement->id,
                    'Montant_Convenu' => $montantConvenu,
                    'Total_Verse_Autres' => $totalVerseAutres,
                    'Nouveau_Montant' => $newMontantVerse,
                    'Total_Potentiel' => $potentialTotal,
                    'Limite' => $montantConvenu + $tolerance
                ]);

                if ($potentialTotal > ($montantConvenu + $tolerance)) {
                    Log::warning("API: Blocage MAJ versement ID {$versement->id} - Dépassement montant convenu.");
                    return response()->json([
                        'message' => 'Le montant modifié de ce versement ajouté au total des autres versements dépasse le montant convenu.',
                        'errors' => [
                            'montant_verse' => [ "Le total versé ne peut excéder " . number_format($montantConvenu, 2, ',', ' ') . " MAD. (Total autres: " . number_format($totalVerseAutres, 2, ',', ' ') . " MAD)" ]
                        ],
                        'montant_convenu' => $montantConvenu,
                        'total_autres_versements' => $totalVerseAutres,
                        'montant_propose' => $newMontantVerse,
                    ], 422);
                }
            }
            // --- End Overpayment Check ---


            // --- Perform the update ---
            $updated = $versement->update($validatedData);
            Log::info("API: Versement MAJ avec ID: {$versement->id}. Success: " . ($updated ? 'true' : 'false'));

             // Reload relationships to return the updated state
             // Use fresh() to ensure we get data after potential model events/mutators
             $versement->refresh()->load([
                 'convPart.convention:id,code,intitule',
                 'convPart.partenaire:Id,Description,Description_Arr,Code'
             ]);

            return response()->json([
                 'message' => 'Versement mis à jour avec succès!',
                 'versement' => $versement
            ], 200);

        } catch (ModelNotFoundException $e) {
             Log::warning("API: Versement non trouvé pour MAJ ID: {$id}");
             return response()->json(['message' => 'Versement non trouvé.'], 404);
        } catch (\Exception $e) {
            Log::error("API: Erreur MAJ versement ID {$id}:", [ 'message' => $e->getMessage(), 'trace' => $e->getTraceAsString() ]);
            return response()->json(['message' => 'Erreur serveur lors de la mise à jour du versement.'], 500);
        }
    }

    /**
     * Remove the specified payment record from storage.
     * MERGED: No changes needed. Added ModelNotFoundException catch.
     */
    public function destroy(string $id): JsonResponse // Accept ID as string from route
    {
        Log::info("API: Tentative suppression versement ID: {$id}");
        try {
            $versement = VersementCP::findOrFail($id); // Use findOrFail
            $deleted = $versement->delete();

            // Log::info("API: Versement delete operation result for ID {$id}: " . ($deleted ? 'true' : 'false'));
            // Delete() returns true/false, not the number of rows usually

            Log::info("API: Versement supprimé ID: {$id}");
            return response()->json(['message' => 'Versement supprimé avec succès!'], 200);

        } catch (ModelNotFoundException $e) {
             Log::warning("API: Versement non trouvé pour suppression ID: {$id}");
             return response()->json(['message' => 'Versement non trouvé.'], 404);
        } catch (\Exception $e) {
            Log::error("API: Erreur suppression versement ID {$id}:", [ 'message' => $e->getMessage(), 'trace' => $e->getTraceAsString() ]);
            // Consider checking for foreign key constraint errors if needed
            return response()->json(['message' => 'Erreur serveur lors de la suppression du versement.'], 500);
        }
    }
}