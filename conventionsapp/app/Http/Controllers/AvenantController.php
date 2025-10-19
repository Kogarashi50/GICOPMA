<?php

namespace App\Http\Controllers;

use App\Models\Avenant;
use App\Models\Document;
use App\Models\ConvPart;
use App\Models\EngagementAnnuel;
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

class AvenantController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $query = Avenant::with([
                'convention:id,Code,Intitule',
                'documents',
                'partnerCommitments'
            ]);

            if ($request->has('include')) {
                $relations = explode(',', $request->input('include'));
                $query->with($relations);
            }

            $avenants = $query->orderBy('date_creation', 'desc')->get(); // Changed to date_creation for logical order
            return response()->json(['avenants' => $avenants], 200);

        } catch (\Exception $e) {
            Log::error('Error fetching avenants: ' . $e->getMessage());
            return response()->json(['message' => 'Erreur lors de la récupération des avenants.'], 500);
        }
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'convention_id' => 'required|integer|exists:convention,id',
            'numero_avenant' => 'required|string|max:255',
            
            // MISSION 2: date_signature is now required only if statut is 'signé'
            'date_signature' => 'nullable|required_if:statut,signé|date',
            
            'objet' => 'nullable|string',
            
            // MISSION 1: Added 'technique_administratif' to the list of allowed types - now supports multiple values
            'type_modification' => 'required|array',
            'type_modification.*' => ['required', Rule::in(['montant', 'durée', 'partenaire', 'technique_administratif', 'autre'])],
            
            'montant_modifie' => 'nullable|numeric|min:0',
            'nouvelle_date_fin' => 'nullable|date|after_or_equal:date_signature',
            'id_fonctionnaire' => 'nullable|string',
            'code' => 'nullable|string|max:50',
            'annee_avenant' => 'required|integer|digits:4',
            'session' => 'required|string|max:50',
            'numero_approbation' => 'required|string|max:100',
            'statut' => ['nullable', Rule::in(["en cours d'approbation", "approuvé", "non visé", "en cours de visa", "visé", "signé"])],
            'date_visa' => 'nullable|required_if:statut,visé|date',
            'remarques' => 'nullable|string',
            'fichiers' => 'nullable|array',
            'fichiers.*' => 'file|mimes:pdf,doc,docx,xls,xlsx,jpg,jpeg,png|max:10240',
            'intitules' => 'nullable|array',
            'intitules.*' => 'nullable|string|max:255',
            'avenant_partner_commitments' => 'nullable|json',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Erreur de validation.', 'errors' => $validator->errors()], 422);
        }

        $validatedData = $validator->validated();
 $sessionValue = $validatedData['session'] ?? 'NS';
        $sessionFormatted = is_numeric($sessionValue) ? str_pad($sessionValue, 2, '0', STR_PAD_LEFT) : 'NS';
        $validatedData['code'] = sprintf(
            '%s/%s/%s',
            $validatedData['numero_approbation'] ?? 'NA',
            $sessionFormatted,
            $validatedData['annee_avenant']
        );
        DB::beginTransaction();
        try {
            $avenantData = Arr::except($validatedData, ['fichiers', 'intitules', 'avenant_partner_commitments']);
            $avenant = Avenant::create($avenantData);

            if ($request->hasFile('fichiers')) {
                foreach ($request->file('fichiers') as $index => $file) {
                    $originalName = $file->getClientOriginalName();
                    $path = $file->store('avenant_documents/' . $avenant->id, 'public');
                    $intitule = $request->input("intitules.{$index}", pathinfo($originalName, PATHINFO_FILENAME));

                    $avenant->documents()->create([
                        'Intitule' => $intitule,
                        'file_name' => $originalName,
                        'file_path' => $path,
                        'mime_type' => $file->getClientMimeType(),
                    ]);
                }
            }

            if (in_array('partenaire', $validatedData['type_modification']) && !empty($validatedData['avenant_partner_commitments'])) {
                $partnerCommitments = json_decode($validatedData['avenant_partner_commitments'], true);
                foreach ($partnerCommitments as $commitmentData) {
                    $convPart = $avenant->partnerCommitments()->create([
                        'Id_Convention' => $avenant->convention_id,
                        'Id_Partenaire' => $commitmentData['id'],
                        'Montant_Convenu' => $commitmentData['montant'],
                        'autre_engagement' => $commitmentData['autre_engagement'],
                        'is_signatory' => $commitmentData['is_signatory'],
                        'date_signature' => $commitmentData['date_signature'],
                        'details_signature' => $commitmentData['details_signature'],
                    ]);
                    
                    if (!empty($commitmentData['engagements_annuels'])) {
                        foreach ($commitmentData['engagements_annuels'] as $yearlyData) {
                            $convPart->engagementsAnnuels()->create([
                                'annee' => $yearlyData['annee'],
                                'montant_prevu' => $yearlyData['montant_prevu'],
                            ]);
                        }
                    }
                }
            }

            DB::commit();
            $avenant->load('convention', 'documents', 'partnerCommitments.partenaire', 'partnerCommitments.engagementsAnnuels');
            return response()->json(['message' => 'Avenant créé avec succès.', 'avenant' => $avenant], 201);

        } catch (Throwable $e) {
            DB::rollBack();
            Log::error('Failed to store avenant: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return response()->json(['message' => 'Échec de la création de l\'avenant.'], 500);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id): JsonResponse
    {
        try {
            $avenant = Avenant::with(['convention', 'documents', 'partnerCommitments.partenaire', 'partnerCommitments.engagementsAnnuels'])->findOrFail($id);
            return response()->json(['avenant' => $avenant], 200);
        } catch (ModelNotFoundException $e) {
            return response()->json(['message' => 'Avenant non trouvé.'], 404);
        } catch (\Exception $e) {
            Log::error('Error fetching avenant ID ' . $id . ': ' . $e->getMessage());
            return response()->json(['message' => 'Erreur serveur lors de la récupération.'], 500);
        }
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $avenant = Avenant::findOrFail($id);
        
        $validator = Validator::make($request->all(), [
            'convention_id' => 'required|integer|exists:convention,id',
            'numero_avenant' => 'required|string|max:255',

            // MISSION 2: date_signature is now required only if statut is 'signé'
            'date_signature' => 'nullable|required_if:statut,signé|date',

            'objet' => 'nullable|string',

            // MISSION 1: Added 'technique_administratif' to the list of allowed types - now supports multiple values
            'type_modification' => 'required|array',
            'type_modification.*' => ['required', Rule::in(['montant', 'durée', 'partenaire', 'technique_administratif', 'autre'])],
            
            'montant_modifie' => 'nullable|numeric|min:0',
            'nouvelle_date_fin' => 'nullable|date|after_or_equal:date_signature',
            'id_fonctionnaire' => 'nullable|string',
            'code' => 'nullable|string|max:50',
            'annee_avenant' => 'required|integer|digits:4',
            'session' => 'required|string|max:50',
            'numero_approbation' => 'required|string|max:100',
            'statut' => ['nullable', Rule::in(["en cours d'approbation", "approuvé", "non visé", "en cours de visa", "visé", "signé"])],
            'date_visa' => 'nullable|required_if:statut,visé|date',
            'remarques' => 'nullable|string',
            'fichiers' => 'nullable|array',
            'fichiers.*' => 'file|mimes:pdf,doc,docx,xls,xlsx,jpg,jpeg,png|max:10240',
            'intitules' => 'nullable|array',
            'intitules.*' => 'nullable|string|max:255',
            'existing_documents_meta' => 'nullable|json',
            'fichiers_to_delete' => 'nullable|array',
            'fichiers_to_delete.*' => 'integer|exists:document,id',
            'avenant_partner_commitments' => 'nullable|json',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Erreur de validation.', 'errors' => $validator->errors()], 422);
        }

        $validatedData = $validator->validated();
         $sessionValue = $validatedData['session'] ?? 'NS';
        $sessionFormatted = is_numeric($sessionValue) ? str_pad($sessionValue, 2, '0', STR_PAD_LEFT) : 'NS';
        $validatedData['code'] = sprintf(
            '%s/%s/%s',
            $validatedData['numero_approbation'] ?? 'NA',
            $sessionFormatted,
            $validatedData['annee_avenant']
        );
        DB::beginTransaction();
        try {
            $avenantData = Arr::except($validatedData, ['fichiers', 'intitules', 'existing_documents_meta', 'fichiers_to_delete', 'avenant_partner_commitments']);
            $avenant->update($avenantData);

            if ($request->has('existing_documents_meta')) {
                $existingDocsMeta = json_decode($request->input('existing_documents_meta', '[]'), true);
                foreach ($existingDocsMeta as $meta) {
                    if (!empty($meta['id']) && isset($meta['intitule'])) {
                        Document::where('id', $meta['id'])->where('avenant_id', $avenant->id)->update(['Intitule' => $meta['intitule']]);
                    }
                }
            }
            
            if (!empty($validatedData['fichiers_to_delete'])) {
                $filesToDelete = Document::where('avenant_id', $avenant->id)->whereIn('id', $validatedData['fichiers_to_delete'])->get();
                foreach ($filesToDelete as $fileRecord) {
                    Storage::disk('public')->delete($fileRecord->file_path);
                    $fileRecord->delete();
                }
            }

            if ($request->hasFile('fichiers')) {
                foreach ($request->file('fichiers') as $index => $file) {
                     $originalName = $file->getClientOriginalName();
                     $path = $file->store('avenant_documents/' . $avenant->id, 'public');
                     $intitule = $request->input("intitules.{$index}", pathinfo($originalName, PATHINFO_FILENAME));
                     $avenant->documents()->create(['Intitule' => $intitule, 'file_name' => $originalName, 'file_path' => $path, 'mime_type' => $file->getClientMimeType()]);
                }
            }

            $avenant->partnerCommitments()->delete();
            
            if (in_array('partenaire', $validatedData['type_modification']) && !empty($validatedData['avenant_partner_commitments'])) {
                $partnerCommitments = json_decode($validatedData['avenant_partner_commitments'], true);
                foreach ($partnerCommitments as $commitmentData) {
                    $convPart = $avenant->partnerCommitments()->create([
                        'Id_Convention' => $avenant->convention_id,
                        'Id_Partenaire' => $commitmentData['id'],
                        'Montant_Convenu' => $commitmentData['montant'],
                        'autre_engagement' => $commitmentData['autre_engagement'],
                        'is_signatory' => $commitmentData['is_signatory'],
                        'date_signature' => $commitmentData['date_signature'],
                        'details_signature' => $commitmentData['details_signature'],
                    ]);

                    if (!empty($commitmentData['engagements_annuels'])) {
                        foreach ($commitmentData['engagements_annuels'] as $yearlyData) {
                            $convPart->engagementsAnnuels()->create(['annee' => $yearlyData['annee'], 'montant_prevu' => $yearlyData['montant_prevu']]);
                        }
                    }
                }
            }

            DB::commit();
            $avenant->refresh()->load('convention', 'documents', 'partnerCommitments.partenaire', 'partnerCommitments.engagementsAnnuels');
            return response()->json(['message' => 'Avenant mis à jour avec succès', 'avenant' => $avenant], 200);

        } catch (Throwable $e) {
            DB::rollBack();
            Log::error("[AVENANT UPDATE] Failed to update avenant ID {$id}: " . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return response()->json(['message' => 'Échec de la mise à jour de l\'avenant.'], 500);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id): JsonResponse
    {
        DB::beginTransaction();
        try {
            $avenant = Avenant::findOrFail($id);
            Storage::disk('public')->deleteDirectory('avenant_documents/' . $avenant->id);
            $avenant->delete();
            DB::commit();
            return response()->json(['message' => 'Avenant supprimé avec succès'], 200);

        } catch (ModelNotFoundException $e) {
            DB::rollBack();
            return response()->json(['message' => 'Avenant non trouvé.'], 404);
        } catch (Throwable $e) {
            DB::rollBack();
            Log::error('Failed to delete avenant ID ' . $id . ': ' . $e->getMessage());
            return response()->json(['message' => 'Échec de la suppression de l\'avenant.'], 500);
        }
    }
}