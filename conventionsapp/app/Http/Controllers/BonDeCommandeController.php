<?php

namespace App\Http\Controllers;

use App\Models\BonDeCommande;
use App\Models\FichierBonCommandeEtContrat; // Import the file model
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Http\JsonResponse;

class BonDeCommandeController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(): JsonResponse
    {
        try {
            $bonsDeCommande = BonDeCommande::with(['marche_public', 'contrat', 'fichiers']) // Eager load files
                ->orderBy('date_emission', 'desc')
                ->get();
            // Use a key like 'bons_de_commande' for clarity in frontend
            return response()->json(['bons_de_commande' => $bonsDeCommande], 200);
        } catch (\Exception $e) {
            Log::error('Error fetching bons de commande: ' . $e->getMessage());
            return response()->json(['failed' => 'Erreur lors de la récupération des bons de commande'], 500);
        }
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'numero_bc' => 'required|string|max:50|unique:bon_de_commande,numero_bc',
            'date_emission' => 'required|date',
            'objet' => 'required|string',
            'montant_total' => 'required|numeric|min:0',
            'fournisseur_nom' => 'required|string|max:255',
            'id_fonctionnaire'=>'nullable|string',
            'mode_paiement' => 'nullable|string|max:50',
            'etat' => ['nullable', Rule::in(['en préparation', 'validé', 'envoyé', 'reçu', 'annulé'])],
            'marche_id' => 'nullable|integer|exists:marche_public,id', // Ensure 'marche' table exists
            'contrat_id' => 'nullable|integer|exists:contrat_droit_commun,id', // Ensure table exists
            'fichiers' => 'nullable|array', // Expect an array of files
            'fichiers.*' => 'file|mimes:pdf,doc,docx,xls,xlsx,jpg,png|max:10240' // Example validation (10MB max)
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $validatedData = $validator->validated();

        DB::beginTransaction();
        try {
            // Create the Bon de Commande record
            $bonDeCommande = BonDeCommande::create($validatedData);

            // Handle File Uploads
            if ($request->hasFile('fichiers')) {
                foreach ($request->file('fichiers') as $file) {
                    $originalName = $file->getClientOriginalName();
                    // Store in 'bc_files/{bc_id}' directory within the public disk
                    $path = $file->store('bc_files/' . $bonDeCommande->id, 'public');

                    // Create file record in the database
                    FichierBonCommandeEtContrat::create([
                        'id_bc' => $bonDeCommande->id,
                        'id_cdc' => null, // File specifically linked to BC here
                        'nom_fichier' => $originalName,
                        'chemin_fichier' => $path,
                        'type_fichier' => $file->getClientMimeType(),
                    ]);
                }
            }

            DB::commit();

            // Reload the model with its files for the response
            $bonDeCommande->load('fichiers');

            return response()->json([
                'success' => 'Bon de commande créé avec succès',
                'bon_de_commande' => $bonDeCommande
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to store bon de commande: ' . $e->getMessage(), ['exception' => $e]);
            return response()->json([
                'failed' => 'Échec de la création du bon de commande.',
                'error_details' => config('app.debug') ? $e->getMessage() : 'Erreur interne du serveur.',
            ], 500);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id): JsonResponse
    {
        try {
            $bonDeCommande = BonDeCommande::with(['marche_public', 'contrat', 'fichiers'])->findOrFail($id);
            return response()->json(['bon_de_commande' => $bonDeCommande], 200);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['failed' => 'Bon de commande non trouvé.'], 404);
        } catch (\Exception $e) {
            Log::error('Error fetching bon de commande ID ' . $id . ': ' . $e->getMessage());
            return response()->json(['failed' => 'Erreur serveur lors de la récupération du bon de commande'], 500);
        }
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id): JsonResponse
    {
         try {
            $bonDeCommande = BonDeCommande::findOrFail($id);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['failed' => 'Bon de commande non trouvé pour modification.'], 404);
        }

         $validator = Validator::make($request->all(), [
            // Use Rule::unique to ignore the current BC's numero_bc
            'numero_bc' => ['required', 'string', 'max:50', Rule::unique('bon_de_commande', 'numero_bc')->ignore($bonDeCommande->id)],
            'date_emission' => 'required|date',
            'objet' => 'required|string',
            'montant_total' => 'required|numeric|min:0',
            'fournisseur_nom' => 'required|string|max:255',
            'mode_paiement' => 'nullable|string|max:50',
            'id_fonctionnaire'=>'nullable|string',
            'etat' => ['nullable', Rule::in(['en préparation', 'validé', 'envoyé', 'reçu', 'annulé'])],
            'marche_id' => 'nullable|integer|exists:marche_public,id',
            'contrat_id' => 'nullable|integer|exists:contrat_droit_commun,id',
            'fichiers' => 'nullable|array',
            'fichiers.*' => 'file|mimes:pdf,doc,docx,xls,xlsx,jpg,png|max:10240', // Allow adding new files
             // Add field for deleting files if needed: 'fichiers_a_supprimer' => 'nullable|array', 'fichiers_a_supprimer.*' => 'integer|exists:fichier_bon_commande_et_contrat,id'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $validatedData = $validator->validated();

        DB::beginTransaction();
        try {
            // Update the Bon de Commande main data
             // Manually handle 'etat' if it's not sent but nullable/defaulted
            if (!$request->filled('etat')) {
                 unset($validatedData['etat']); // Don't update if not provided, keep existing or default
            } else {
                $validatedData['etat'] = $request->input('etat') ?: 'en préparation'; // Ensure default if empty
            }
            // Exclude file array from main update data
            $bcDataToUpdate = collect($validatedData)->except('fichiers', 'fichiers_a_supprimer')->toArray();
            $bonDeCommande->update($bcDataToUpdate);

            // --- Handle ADDING new files ---
            if ($request->hasFile('fichiers')) {
                foreach ($request->file('fichiers') as $file) {
                    $originalName = $file->getClientOriginalName();
                    $path = $file->store('bc_files/' . $bonDeCommande->id, 'public');
                    FichierBonCommandeEtContrat::create([
                        'id_bc' => $bonDeCommande->id,
                        'id_cdc' => null,
                        'nom_fichier' => $originalName,
                        'chemin_fichier' => $path,
                        'type_fichier' => $file->getClientMimeType(),
                    ]);
                }
            }

             // --- OPTIONAL: Handle DELETING existing files ---
             if ($request->filled('fichiers_a_supprimer')) {
                 $filesToDeleteIds = $request->input('fichiers_a_supprimer');
                 // Ensure we only delete files BELONGING to this BC
                 $filesToDelete = FichierBonCommandeEtContrat::where('id_bc', $bonDeCommande->id)
                                                              ->whereIn('id', $filesToDeleteIds)
                                                              ->get();
                 foreach ($filesToDelete as $fileRecord) {
                     Storage::disk('public')->delete($fileRecord->chemin_fichier);
                     $fileRecord->delete();
                 }
             }

            DB::commit();

            $bonDeCommande->load(['marche_public', 'contrat', 'fichiers']); // Reload relationships
            return response()->json([
                'success' => 'Bon de commande mis à jour avec succès',
                'bon_de_commande' => $bonDeCommande
            ], 200);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to update bon de commande ID ' . $id . ': ' . $e->getMessage(), ['exception' => $e]);
            return response()->json([
                'failed' => 'Échec de la mise à jour du bon de commande.',
                'error_details' => config('app.debug') ? $e->getMessage() : 'Erreur interne du serveur.',
             ], 500);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id): JsonResponse
    {
        try {
            $bonDeCommande = BonDeCommande::findOrFail($id);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['failed' => 'Bon de commande non trouvé pour suppression.'], 404);
        }

        DB::beginTransaction();
        try {
            // Find and delete associated files first
            $fichiers = FichierBonCommandeEtContrat::where('id_bc', $bonDeCommande->id)->get();
            foreach ($fichiers as $fichier) {
                // Delete physical file from storage
                 if ($fichier->chemin_fichier) {
                    Storage::disk('public')->delete($fichier->chemin_fichier);
                 }
                // Delete file record from database
                $fichier->delete();
            }

            // Delete the Bon de Commande record
            $bonDeCommande->delete();

            DB::commit();
            return response()->json(['success' => 'Bon de commande et fichiers associés supprimés avec succès'], 200); // Or 204 No Content

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to delete bon de commande ID ' . $id . ': ' . $e->getMessage());
            return response()->json(['failed' => 'Échec de la suppression du bon de commande.'], 500);
        }
    }
}