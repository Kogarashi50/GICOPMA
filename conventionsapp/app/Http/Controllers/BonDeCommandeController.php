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
use Illuminate\Support\Arr;
use Throwable;

class BonDeCommandeController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(): JsonResponse
    {
        try {
            $bonsDeCommande = BonDeCommande::with(['marche_public', 'contrat', 'fichiers'])
                ->orderBy('date_emission', 'desc')
                ->get();
            return response()->json(['bons_de_commande' => $bonsDeCommande], 200);
        } catch (\Exception $e) {
            Log::error('Error fetching bons de commande: ' . $e->getMessage());
            return response()->json(['message' => 'Erreur lors de la récupération des bons de commande'], 500);
        }
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        // FIX: Renamed 'fichiers' to 'files' to match the frontend key, but will use 'fichiers' internally for consistency.
        $validator = Validator::make($request->all(), [
            'numero_bc' => 'required|string|max:50|unique:bon_de_commande,numero_bc',
            'date_emission' => 'required|date',
            'objet' => 'required|string',
            'montant_total' => 'required|numeric|min:0',
            'fournisseur_nom' => 'required|string|max:255',
            'id_fonctionnaire'=>'nullable|string',
            'etat' => ['nullable', Rule::in(['en préparation', 'validé', 'envoyé', 'reçu', 'annulé'])],
            'marche_id' => 'nullable|integer|exists:marche_public,id',
            'contrat_id' => 'nullable|integer|exists:contrat_droit_commun,id',
            'fichiers' => 'nullable|array',
            'fichiers.*' => 'file|mimes:pdf,doc,docx,xls,xlsx,jpg,png|max:10240',
            // ADDED: Validation for file titles, mirroring AvenantController
            'intitules' => 'nullable|array',
            'intitules.*' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Erreur de validation.', 'errors' => $validator->errors()], 422);
        }

        $validatedData = $validator->validated();

        DB::beginTransaction();
        try {
            $bonDeCommandeData = Arr::except($validatedData, ['fichiers', 'intitules']);
            $bonDeCommande = BonDeCommande::create($bonDeCommandeData);

            // FIX: Adopt the robust file handling logic from AvenantController
            if ($request->hasFile('fichiers')) {
                foreach ($request->file('fichiers') as $index => $file) {
                    $originalName = $file->getClientOriginalName();
                    $path = $file->store('bc_files/' . $bonDeCommande->id, 'public');

                    // Get the corresponding title from the intitules array
                    $intitule = $request->input("intitules.{$index}", pathinfo($originalName, PATHINFO_FILENAME));

                    FichierBonCommandeEtContrat::create([
                        'id_bc' => $bonDeCommande->id,
                        'id_cdc' => null,
                        'intitule' => $intitule, // Save the title
                        'nom_fichier' => $originalName,
                        'chemin_fichier' => $path,
                        'type_fichier' => $file->getClientMimeType(),
                    ]);
                }
            }

            DB::commit();

            $bonDeCommande->load('fichiers');

            return response()->json([
                'message' => 'Bon de commande créé avec succès',
                'bon_de_commande' => $bonDeCommande
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to store bon de commande: ' . $e->getMessage(), ['exception' => $e]);
            return response()->json(['message' => 'Échec de la création du bon de commande.'], 500);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id): JsonResponse
    {
        try {
            // FIX: Ensure 'fichiers' relationship is loaded.
            $bonDeCommande = BonDeCommande::with(['marche_public', 'contrat', 'fichiers'])->findOrFail($id);
            return response()->json(['bon_de_commande' => $bonDeCommande], 200);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['message' => 'Bon de commande non trouvé.'], 404);
        } catch (\Exception $e) {
            Log::error('Error fetching bon de commande ID ' . $id . ': ' . $e->getMessage());
            return response()->json(['message' => 'Erreur serveur lors de la récupération du bon de commande'], 500);
        }
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $bonDeCommande = BonDeCommande::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'numero_bc' => ['required', 'string', 'max:50', Rule::unique('bon_de_commande', 'numero_bc')->ignore($bonDeCommande->id)],
            'date_emission' => 'required|date_format:Y-m-d',
            'objet' => 'required|string',
            'montant_total' => 'required|numeric|min:0',
            'fournisseur_nom' => 'required|string|max:255',
            'id_fonctionnaire'=>'nullable|string',
            'etat' => ['nullable', Rule::in(['en préparation', 'validé', 'envoyé', 'reçu', 'annulé'])],
            'marche_id' => 'nullable|integer|exists:marche_public,id',
            'contrat_id' => 'nullable|integer|exists:contrat_droit_commun,id',
            // --- ADOPTED FROM AVENANT CONTROLLER ---
            'fichiers' => 'nullable|array',
            'fichiers.*' => 'file|mimes:pdf,doc,docx,xls,xlsx,jpg,jpeg,png|max:10240',
            'intitules' => 'nullable|array',
            'intitules.*' => 'nullable|string|max:255',
            'existing_documents_meta' => 'nullable|json',
            'fichiers_a_supprimer' => 'nullable|array',
            'fichiers_a_supprimer.*' => 'integer|exists:fichier_bon_commande_et_contrat,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Erreur de validation.', 'errors' => $validator->errors()], 422);
        }

        $validatedData = $validator->validated();

        DB::beginTransaction();
        try {
            // FIX: Exclude all file-related fields from the main update payload.
            $bcDataToUpdate = Arr::except($validatedData, [
                'fichiers', 'intitules', 'existing_documents_meta', 'fichiers_a_supprimer'
            ]);
            $bonDeCommande->update($bcDataToUpdate);

            // --- FILE HANDLING LOGIC FROM AVENANT CONTROLLER ---

            // 1. Update metadata for existing files
            $existingDocumentsMeta = json_decode($request->input('existing_documents_meta', '[]'), true);
            if (is_array($existingDocumentsMeta) && !empty($existingDocumentsMeta)) {
                foreach ($existingDocumentsMeta as $meta) {
                    if (!empty($meta['id']) && isset($meta['intitule'])) {
                        FichierBonCommandeEtContrat::where('id', $meta['id'])
                            ->where('id_bc', $bonDeCommande->id) // Security check
                            ->update(['intitule' => $meta['intitule']]);
                    }
                }
            }

            // 2. Delete files marked for deletion
            if (!empty($validatedData['fichiers_a_supprimer'])) {
                $filesToDelete = FichierBonCommandeEtContrat::where('id_bc', $bonDeCommande->id)
                    ->whereIn('id', $validatedData['fichiers_a_supprimer'])
                    ->get();
                foreach ($filesToDelete as $fileRecord) {
                    Storage::disk('public')->delete($fileRecord->chemin_fichier);
                    $fileRecord->delete();
                }
            }

            // 3. Add new files
            if ($request->hasFile('fichiers')) {
                foreach ($request->file('fichiers') as $index => $file) {
                    $originalName = $file->getClientOriginalName();
                    $path = $file->store('bc_files/' . $bonDeCommande->id, 'public');
                    $intitule = $request->input("intitules.{$index}", pathinfo($originalName, PATHINFO_FILENAME));
                    FichierBonCommandeEtContrat::create([
                        'id_bc' => $bonDeCommande->id,
                        'intitule' => $intitule,
                        'nom_fichier' => $originalName,
                        'chemin_fichier' => $path,
                        'type_fichier' => $file->getClientMimeType(),
                    ]);
                }
            }

            DB::commit();

            $bonDeCommande->refresh()->load(['marche_public', 'contrat', 'fichiers']);

            return response()->json([
                'message' => 'Bon de commande mis à jour avec succès',
                'bon_de_commande' => $bonDeCommande
            ], 200);

        } catch (Throwable $e) {
            DB::rollBack();
            Log::error("[BC UPDATE] Failed to update bon de commande ID {$id}: " . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return response()->json(['message' => 'Échec de la mise à jour du bon de commande.'], 500);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id): JsonResponse
    {
        $bonDeCommande = BonDeCommande::findOrFail($id);

        DB::beginTransaction();
        try {
            // Delete associated files from storage and DB
            foreach ($bonDeCommande->fichiers as $fichier) {
                Storage::disk('public')->delete($fichier->chemin_fichier);
                $fichier->delete();
            }
            
            // Attempt to delete the directory if it's empty
            Storage::disk('public')->deleteDirectory('bc_files/' . $bonDeCommande->id);

            // Delete the Bon de Commande record
            $bonDeCommande->delete();

            DB::commit();
            return response()->json(['message' => 'Bon de commande supprimé avec succès'], 200);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to delete bon de commande ID ' . $id . ': ' . $e->getMessage());
            return response()->json(['message' => 'Échec de la suppression du bon de commande.'], 500);
        }
    }
}