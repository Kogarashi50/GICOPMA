<?php

namespace App\Http\Controllers;

use App\Models\ContratDroitCommun;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use App\Models\FichierBonCommandeEtContrat;
use Illuminate\Support\Facades\Storage;
// --- ADD THIS LINE ---
use Illuminate\Validation\Rule;
// --- END OF ADD ---
use Illuminate\Database\Eloquent\ModelNotFoundException;
class ContratDroitCommunController extends Controller
{
    protected $fileDisk = 'public'; // e.g., 'public', 's3'
    protected $filePathPrefix = 'contrats_cdc_files'; 
    public function index(): JsonResponse
    {

        try {
           
            $contrats = ContratDroitCommun::withCount(['bonsDeCommande', 'fichiers']) 
                ->orderBy('date_signature', 'desc') // Example ordering
                ->get();

            return response()->json(['contrats' => $contrats], 200);

        } catch (\Exception $e) {
            Log::error('Error fetching Contrats Droit Commun: ' . $e->getMessage());
            return response()->json(['failed' => 'Erreur lors de la récupération des contrats.'], 500);
        }
    }
    public function store(Request $request)
    {
        // --- Validation ---
        $validator = Validator::make($request->all(), [
            'numero_contrat' => 'required|string|max:50|unique:contrat_droit_commun,numero_contrat',
            'objet' => 'required|string',
            'fournisseur_nom' => 'required|string|max:255',
            'date_signature' => 'required|date_format:Y-m-d',
            'montant_total' => 'required|numeric|min:0',
            'duree_contrat' => 'nullable|string|max:100',
            'type_contrat' => 'nullable|string|max:100',
            'mode_paiement' => 'nullable|string|max:50',
            'observations' => 'nullable|string',
            'id_fonctionnaire'=>'nullable|string',
            'fichiers' => 'nullable|array', // Expect an array of files
            'fichiers.*' => 'nullable|file|mimes:pdf,doc,docx,xls,xlsx,jpg,png|max:10240', // Max 10MB example
        ], [
             'numero_contrat.required' => 'Le numéro de contrat est obligatoire.',
             'numero_contrat.unique' => 'Ce numéro de contrat existe déjà.',
             'objet.required' => 'L\'objet du contrat est obligatoire.',
             'fournisseur_nom.required' => 'Le nom du fournisseur est obligatoire.',
             'date_signature.required' => 'La date de signature est obligatoire.',
             'date_signature.date_format' => 'Le format de la date de signature doit être AAAA-MM-JJ.',
             'montant_total.required' => 'Le montant total est obligatoire.',
             'montant_total.numeric' => 'Le montant total doit être un nombre.',
             'fichiers.*.mimes' => 'Format de fichier non supporté.',
             'fichiers.*.max' => 'Le fichier ne doit pas dépasser 10 Mo.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Erreurs de validation.',
                'errors' => $validator->errors()
            ], 422);
        }

        // --- Database Transaction ---
        DB::beginTransaction();
        try {
            $validatedData = $validator->validated();

            // Create Contrat
            $contrat = ContratDroitCommun::create([
                'numero_contrat' => $validatedData['numero_contrat'],
                'objet' => $validatedData['objet'],
                'fournisseur_nom' => $validatedData['fournisseur_nom'],
                'date_signature' => $validatedData['date_signature'],
                'montant_total' => $validatedData['montant_total'],
                'duree_contrat' => $validatedData['duree_contrat'] ?? null,
                'type_contrat' => $validatedData['type_contrat'] ?? null,
                'mode_paiement' => $validatedData['mode_paiement'] ?? null,
                'observations' => $validatedData['observations'] ?? null,
                'id_fonctionnaire' => $validatedData['id_fonctionnaire'] ?? null, 
            ]);

            // Handle File Uploads
            if ($request->hasFile('fichiers')) {
                foreach ($request->file('fichiers') as $file) {
                    if ($file->isValid()) {
                        $originalName = $file->getClientOriginalName();
                        $extension = $file->getClientOriginalExtension();
                        $uniqueName = uniqid('cdc_') . '_' . time() . '.' . $extension;
                        $path = $file->storeAs($this->filePathPrefix, $uniqueName, $this->fileDisk);

                        FichierBonCommandeEtContrat::create([
                            'id_cdc' => $contrat->id, // Link to this contrat
                            'id_bc' => null,        // Not linked to a BC
                            'nom_fichier' => $originalName,
                            'chemin_fichier' => $path,
                            'type_fichier' => $file->getClientMimeType(),
                            'date_ajout' => now(), // Set current timestamp
                            
                        ]);
                    } else {
                         Log::warning("Uploaded file invalid for Contrat CDC {$contrat->id}: " . $file->getClientOriginalName());
                         // Optionally add a non-blocking warning to the response
                    }
                }
            }

            DB::commit();

            // Reload files relation for response
            $contrat->load('fichiers');

            return response()->json([
                'success' => true,
                'message' => 'Contrat créé avec succès.',
                'contrat_droit_commun' => $contrat
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Error creating Contrat CDC: " . $e->getMessage() . "\n" . $e->getTraceAsString());
             // Provide specific error message if possible
             if (str_contains($e->getMessage(), 'Duplicate entry')) {
                 return response()->json(['success' => false, 'message' => 'Erreur: Le numéro de contrat existe déjà.'], 409); // Conflict
             }
            return response()->json(['success' => false, 'message' => 'Erreur interne lors de la création du contrat.'], 500);
        }
    }

    /**
     * Display the specified resource.
     */
  
    /**
     * Display the specified resource using explicit ID lookup.
     *
     * @param  int|string  $id The ID from the URL segment.
     * @return \Illuminate\Http\JsonResponse
     */
    public function show($id) // Accept ID directly
    {
        Log::info("Attempting to show Contrat CDC using explicit ID: " . $id);
        try {
            // Find the model by ID or fail with a 404 exception
            $contratDroitCommun = ContratDroitCommun::with('fichiers')->findOrFail($id);
            // Alternatively, load after finding:
            // $contratDroitCommun = ContratDroitCommun::findOrFail($id);
            // $contratDroitCommun->load('fichiers');

            Log::info("Found Contrat CDC ID: " . $id);
            return response()->json([
                'success' => true,
                'contrat_droit_commun' => $contratDroitCommun
            ]);

        } catch (ModelNotFoundException $e) {
            Log::warning("Contrat CDC not found for ID [show]: " . $id);
            return response()->json(['success' => false, 'message' => 'Contrat non trouvé.'], 404);
        } catch (\Exception $e) {
            Log::error("Error fetching Contrat CDC ID {$id}: " . $e->getMessage() . "\n" . $e->getTraceAsString());
            return response()->json(['success' => false, 'message' => 'Erreur lors du chargement du contrat.'], 500);
        }
    }

    /**
     * Update the specified resource in storage using explicit ID lookup.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  int|string  $id The ID from the URL segment.
     * @return \Illuminate\Http\JsonResponse
     */
    public function update(Request $request, $id) // Accept ID directly
    {
        Log::info("Attempting to update Contrat CDC using explicit ID: " . $id);
        try {
            // Find the model by ID first or fail
            $contratDroitCommun = ContratDroitCommun::findOrFail($id);
            Log::info("Found Contrat CDC for update, ID: " . $id);

            // --- Validation ---
            $validator = Validator::make($request->all(), [
                'numero_contrat' => [
                    'required',
                    'string',
                    'max:50',
                    // Use the found ID to ignore the current record in the unique check
                    Rule::unique('contrat_droit_commun')->ignore($contratDroitCommun->id),
                    // OR Rule::unique('contrat_droit_commun')->ignore($id), // Using $id directly also works
                ],
                'objet' => 'required|string',
                'fournisseur_nom' => 'required|string|max:255',
                'date_signature' => 'required|date_format:Y-m-d',
                'montant_total' => 'required|numeric|min:0',
                'duree_contrat' => 'nullable|string|max:100',
                'type_contrat' => 'nullable|string|max:100',
                'mode_paiement' => 'nullable|string|max:50',
                'observations' => 'nullable|string',
                'fichiers' => 'nullable|array',
                'fichiers.*' => 'nullable|sometimes|file|mimes:pdf,doc,docx,xls,xlsx,jpg,png|max:10240',
                'fichiers_to_delete' => 'nullable|array',
                'fichiers_to_delete.*' => 'integer|exists:fichier_bon_commande,id',
                'id_fonctionnaire'=>'nullable|string',
            ], [ /* ... validation messages ... */ ]);

            if ($validator->fails()) {
                Log::warning("Validation failed for update Contrat CDC ID {$id}: ", $validator->errors()->toArray());
                return response()->json([
                    'success' => false,
                    'message' => 'Erreurs de validation.',
                    'errors' => $validator->errors()
                ], 422);
            }

            // --- Database Transaction ---
            DB::beginTransaction();
            try {
                $validatedData = $validator->validated();

                // Update the found model instance
                $contratDroitCommun->update([
                    'numero_contrat' => $validatedData['numero_contrat'],
                    'objet' => $validatedData['objet'],
                    'fournisseur_nom' => $validatedData['fournisseur_nom'],
                    'date_signature' => $validatedData['date_signature'],
                    'montant_total' => $validatedData['montant_total'],
                    'duree_contrat' => $validatedData['duree_contrat'] ?? $contratDroitCommun->duree_contrat,
                    'type_contrat' => $validatedData['type_contrat'] ?? $contratDroitCommun->type_contrat,
                    'mode_paiement' => $validatedData['mode_paiement'] ?? $contratDroitCommun->mode_paiement,
                    'observations' => $validatedData['observations'] ?? $contratDroitCommun->observations,
                    'id_fonctionnaire' => $validatedData['id_fonctionnaire'] ?? $contratDroitCommun->id_fonctionnaire
                ]);

                // --- Handle File Deletions ---
                if (!empty($validatedData['fichiers_to_delete'])) {
                    // Use the ID of the found model
                    $filesToDelete = FichierBonCommandeEtContrat::where('id_cdc', $contratDroitCommun->id)
                                        ->whereIn('id', $validatedData['fichiers_to_delete'])
                                        ->get();
                    foreach ($filesToDelete as $fileRecord) {
                        if ($fileRecord->chemin_fichier && Storage::disk($this->fileDisk)->exists($fileRecord->chemin_fichier)) {
                            Storage::disk($this->fileDisk)->delete($fileRecord->chemin_fichier);
                        }
                        $fileRecord->delete(); // Delete DB record
                    }
                }

                // --- Handle New File Uploads ---
                if ($request->hasFile('fichiers')) {
                    foreach ($request->file('fichiers') as $file) {
                        if ($file->isValid()) {
                            $originalName = $file->getClientOriginalName();
                            $path = $file->store($this->filePathPrefix, $this->fileDisk);
                            FichierBonCommandeEtContrat::create([
                                'id_cdc' => $contratDroitCommun->id, // Link to the found model's ID
                                'id_bc' => null,
                                'nom_fichier' => $originalName,
                                'chemin_fichier' => $path,
                                'type_fichier' => $file->getClientMimeType(),
                                'date_ajout' => now(),
                            ]);
                        }
                    }
                }

                DB::commit();
                Log::info("Successfully updated Contrat CDC ID: " . $id);

                $contratDroitCommun->load('fichiers'); // Reload relationships for the response

                return response()->json([
                    'success' => true,
                    'message' => 'Contrat mis à jour avec succès.',
                    'contrat_droit_commun' => $contratDroitCommun
                ]);

            } catch (\Exception $e) { // Catch exceptions within the transaction
                DB::rollBack();
                Log::error("Error during DB transaction for update Contrat CDC ID {$id}: " . $e->getMessage() . "\n" . $e->getTraceAsString());
                // Handle specific exceptions like duplicate entry if needed
                if (str_contains($e->getMessage(), 'Duplicate entry')) {
                     return response()->json(['success' => false, 'message' => 'Erreur: Le numéro de contrat existe déjà pour un autre contrat.'], 409);
                 }
                return response()->json(['success' => false, 'message' => 'Erreur interne lors de la mise à jour.'], 500);
            }

        } catch (ModelNotFoundException $e) {
            Log::warning("Contrat CDC not found for update, ID: " . $id);
            return response()->json(['success' => false, 'message' => 'Contrat non trouvé pour la mise à jour.'], 404);
        } catch (\Exception $e) { // Catch general errors before transaction
             Log::error("Error preparing update for Contrat CDC ID {$id}: " . $e->getMessage());
             return response()->json(['success' => false, 'message' => 'Erreur interne.'], 500);
        }
    }

    /**
     * Remove the specified resource from storage using explicit ID lookup.
     *
     * @param  int|string  $id The ID from the URL segment.
     * @return \Illuminate\Http\JsonResponse
     */
    public function destroy($id) // Accept ID directly
    {
        Log::info("Attempting to delete Contrat CDC using explicit ID: " . $id);
        try {
            // Find the model by ID first or fail
            $contratDroitCommun = ContratDroitCommun::findOrFail($id);
            Log::info("Found Contrat CDC for deletion, ID: " . $id);

            DB::beginTransaction();
            try {
                // --- Delete Associated Files from Storage FIRST ---
                // It's safer to delete storage files before deleting the DB record
                // which might cascade-delete the file records needed to find the paths.
                $fichiers = FichierBonCommandeEtContrat::where('id_cdc', $contratDroitCommun->id)->get();
                foreach ($fichiers as $fichier) {
                    // Delete physical file from storage
                     if ($fichier->chemin_fichier) {
                        Storage::disk('public')->delete($fichier->chemin_fichier);
                     }
                    // Delete file record from database
                    $fichier->delete();
                    // You might still want to explicitly delete the file record if cascade isn't set/trusted
                    // $fileRecord->delete();
                }

                // --- Delete the Contrat (this might trigger cascade deletion of file records if set) ---
                $contratDroitCommun->delete();

                DB::commit();
                Log::info("Successfully deleted Contrat CDC ID: " . $id);
                return response()->json(['success' => true, 'message' => 'Contrat et fichiers associés supprimés avec succès.']);

            } catch (\Exception $e) { // Catch exceptions within the transaction
                DB::rollBack();
                Log::error("Error during DB transaction for delete Contrat CDC ID {$id}: " . $e->getMessage() . "\n" . $e->getTraceAsString());
                 // Check for foreign key constraint errors if related records prevent deletion
                if (str_contains(strtolower($e->getMessage()), 'foreign key constraint')) {
                     return response()->json(['success' => false, 'message' => 'Impossible de supprimer ce contrat car il est lié à d\'autres enregistrements (ex: Bons de Commande).'], 409);
                 }
                return response()->json(['success' => false, 'message' => 'Erreur lors de la suppression du contrat.'], 500);
            }

        } catch (ModelNotFoundException $e) {
            Log::warning("Contrat CDC not found for deletion, ID: " . $id);
            return response()->json(['success' => false, 'message' => 'Contrat non trouvé pour la suppression.'], 404);
        } catch (\Exception $e) { // Catch general errors before transaction
             Log::error("Error preparing delete for Contrat CDC ID {$id}: " . $e->getMessage());
             return response()->json(['success' => false, 'message' => 'Erreur interne.'], 500);
        }
    }
}
 
    



