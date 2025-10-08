<?php

namespace App\Http\Controllers;

use App\Models\ContratDroitCommun;
use App\Models\FichierBonCommandeEtContrat;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Arr;
use Throwable;
use Illuminate\Database\Eloquent\ModelNotFoundException;

class ContratDroitCommunController extends Controller
{
    public function index(): JsonResponse
    {
        try {
            $contrats = ContratDroitCommun::with(['fichiers'])
                ->withCount(['bonsDeCommande', 'fichiers'])
                ->orderBy('date_signature', 'desc')
                ->get();
            return response()->json(['contrats' => $contrats], 200);
        } catch (\Exception $e) {
            Log::error('Error fetching Contrats Droit Commun: ' . $e->getMessage());
            return response()->json(['message' => 'Erreur lors de la récupération des contrats.'], 500);
        }
    }

    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'numero_contrat' => ['required', 'string', 'max:50', Rule::unique('contrat_droit_commun', 'numero_contrat')],
            'objet' => 'required|string',
            'fournisseur_nom' => 'required|string|max:255',
            'date_signature' => 'required|date',
            'montant_total' => 'required|numeric|min:0',
            'duree_contrat' => 'nullable|string|max:100',
            'type_contrat' => 'nullable|string|max:100',
            'observations' => 'nullable|string',
            'id_fonctionnaire' => 'nullable|string',
            'fichiers' => 'nullable|array',
            'fichiers.*' => 'file|mimes:pdf,doc,docx,xls,xlsx,jpg,png|max:10240',
            'intitules' => 'nullable|array',
            'intitules.*' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Erreur de validation.', 'errors' => $validator->errors()], 422);
        }

        $validatedData = $validator->validated();

        DB::beginTransaction();
        try {
            $contratData = Arr::except($validatedData, ['fichiers', 'intitules']);
            $contrat = ContratDroitCommun::create($contratData);

            if ($request->hasFile('fichiers')) {
                foreach ($request->file('fichiers') as $index => $file) {
                    $originalName = $file->getClientOriginalName();
                    $path = $file->store('cdc_files/' . $contrat->id, 'public');
                    $intitule = $request->input("intitules.{$index}", pathinfo($originalName, PATHINFO_FILENAME));

                    FichierBonCommandeEtContrat::create([
                        'id_cdc' => $contrat->id,
                        'intitule' => $intitule,
                        'nom_fichier' => $originalName,
                        'chemin_fichier' => $path,
                        'type_fichier' => $file->getClientMimeType(),
                        'date_ajout' => now(),
                    ]);
                }
            }

            DB::commit();
            $contrat->load('fichiers');

            return response()->json([
                'message' => 'Contrat créé avec succès.',
                'contrat_droit_commun' => $contrat
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Error creating Contrat CDC: " . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return response()->json(['message' => 'Erreur interne lors de la création du contrat.'], 500);
        }
    }

    public function show($id): JsonResponse
    {
        try {
            $contrat = ContratDroitCommun::with(['fichiers'])->findOrFail($id);
            return response()->json(['contrat_droit_commun' => $contrat]);
        } catch (ModelNotFoundException $e) {
            return response()->json(['message' => 'Contrat non trouvé.'], 404);
        } catch (\Exception $e) {
            Log::error("Error fetching Contrat CDC ID {$id}: " . $e->getMessage());
            return response()->json(['message' => 'Erreur lors du chargement du contrat.'], 500);
        }
    }

    public function update(Request $request, $id): JsonResponse
    {
        $contrat = ContratDroitCommun::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'numero_contrat' => ['required', 'string', 'max:50', Rule::unique('contrat_droit_commun')->ignore($contrat->id)],
            'objet' => 'required|string',
            'fournisseur_nom' => 'required|string|max:255',
            'date_signature' => 'required|date',
            'montant_total' => 'required|numeric|min:0',
            'duree_contrat' => 'nullable|string|max:100',
            'type_contrat' => 'nullable|string|max:100',
            'observations' => 'nullable|string',
            'id_fonctionnaire' => 'nullable|string',
            'fichiers' => 'nullable|array',
            'fichiers.*' => 'file|mimes:pdf,doc,docx,xls,xlsx,jpg,jpeg,png|max:10240',
            'intitules' => 'nullable|array',
            'intitules.*' => 'nullable|string|max:255',
            'existing_documents_meta' => 'nullable|json',
            'fichiers_a_supprimer' => 'nullable|array',
            'fichiers_a_supprimer.*' => ['integer', Rule::exists('fichier_bon_commande', 'id')->where('id_cdc', $id)],
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Erreur de validation.', 'errors' => $validator->errors()], 422);
        }
        $validatedData = $validator->validated();

        DB::beginTransaction();
        try {
            $contratDataToUpdate = Arr::except($validatedData, [
                'fichiers', 'intitules', 'existing_documents_meta', 'fichiers_a_supprimer'
            ]);
            $contrat->update($contratDataToUpdate);

            // 1. Update metadata (titles) for existing files
            $existingDocumentsMeta = json_decode($request->input('existing_documents_meta', '[]'), true);
            if (!empty($existingDocumentsMeta)) {
                foreach ($existingDocumentsMeta as $meta) {
                    if (!empty($meta['id']) && isset($meta['intitule'])) {
                        FichierBonCommandeEtContrat::where('id', $meta['id'])
                            ->where('id_cdc', $contrat->id) // Security check
                            ->update(['intitule' => $meta['intitule']]);
                    }
                }
            }

            // 2. Delete files marked for deletion
            if (!empty($validatedData['fichiers_a_supprimer'])) {
                $filesToDelete = FichierBonCommandeEtContrat::where('id_cdc', $contrat->id)
                    ->whereIn('id', $validatedData['fichiers_a_supprimer'])->get();
                foreach ($filesToDelete as $fileRecord) {
                    Storage::disk('public')->delete($fileRecord->chemin_fichier);
                    $fileRecord->delete();
                }
            }

            // 3. Add new files
            if ($request->hasFile('fichiers')) {
                foreach ($request->file('fichiers') as $index => $file) {
                    $originalName = $file->getClientOriginalName();
                    $path = $file->store('cdc_files/' . $contrat->id, 'public');
                    $intitule = $request->input("intitules.{$index}", pathinfo($originalName, PATHINFO_FILENAME));

                    FichierBonCommandeEtContrat::create([
                        'id_cdc' => $contrat->id,
                        'intitule' => $intitule,
                        'nom_fichier' => $originalName,
                        'chemin_fichier' => $path,
                        'type_fichier' => $file->getClientMimeType(),
                        'date_ajout' => now(),
                    ]);
                }
            }

            DB::commit();
            $contrat->refresh()->load('fichiers');

            return response()->json([
                'message' => 'Contrat mis à jour avec succès.',
                'contrat_droit_commun' => $contrat
            ]);
        } catch (Throwable $e) {
            DB::rollBack();
            Log::error("[CDC UPDATE] Failed to update contrat ID {$id}: " . $e->getMessage());
            return response()->json(['message' => 'Échec de la mise à jour du contrat.'], 500);
        }
    }

    public function destroy($id): JsonResponse
    {
        DB::beginTransaction();
        try {
            $contrat = ContratDroitCommun::with('fichiers')->findOrFail($id);
            
            // Delete associated files/directory from storage
            Storage::disk('public')->deleteDirectory('cdc_files/' . $contrat->id);
            
            // Delete file records from the database
            $contrat->fichiers()->delete();
            
            // Delete the Contrat record
            $contrat->delete();

            DB::commit();
            return response()->json(['message' => 'Contrat et fichiers associés supprimés avec succès.']);

        } catch (ModelNotFoundException $e) {
            DB::rollBack();
            return response()->json(['message' => 'Contrat non trouvé.'], 404);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Error during delete Contrat CDC ID {$id}: " . $e->getMessage());
             if (str_contains(strtolower($e->getMessage()), 'foreign key constraint')) {
                 return response()->json(['message' => 'Impossible de supprimer: ce contrat est lié à des bons de commande.'], 409);
             }
            return response()->json(['message' => 'Erreur lors de la suppression du contrat.'], 500);
        }
    }
}