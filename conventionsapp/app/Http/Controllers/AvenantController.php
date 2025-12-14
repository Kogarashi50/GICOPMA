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
                'convention:id,Code,Intitule,Cout_Global', // Ensure Cout_Global is available if needed
                'documents',
                'partnerCommitments'
            ]);

            if ($request->has('include')) {
                $relations = explode(',', $request->input('include'));
                $query->with($relations);
            }

            $avenants = $query->orderBy('date_creation', 'desc')->get();
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
            'date_signature' => 'nullable|required_if:statut,signé|date',
            'objet' => 'nullable|string',
            'type_modification' => 'required|array',
            'type_modification.*' => ['required', Rule::in(['montant', 'durée', 'partenaire', 'technique_administratif', 'autre'])],
            
            // MODIFIED: Added validation for the new field
            'montant_avenant' => 'nullable|numeric',
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
        Log::info("Requête MAJ reçue pour Avenant ID {$id}...");
        try {
            $avenant = Avenant::findOrFail($id);
        } catch (ModelNotFoundException $e) {
            Log::error("Avenant non trouvé pour MAJ. ID: {$id}");
            return response()->json(['message' => 'Avenant non trouvé.'], 404);
        }

        // --- Validation Rules (Aligned with your working ConventionController) ---
        $validator = Validator::make($request->all(), [
            'convention_id' => 'required|integer|exists:convention,id',
            'numero_avenant' => 'required|string|max:255',
            'date_signature' => 'nullable|required_if:statut,signé|date',
            'objet' => 'nullable|string',
            'type_modification' => 'required|array',
            'type_modification.*' => ['required', Rule::in(['montant', 'durée', 'partenaire', 'technique_administratif', 'autre'])],
            'montant_avenant' => 'nullable|numeric',
            'montant_modifie' => 'nullable|numeric|min:0',
            'nouvelle_date_fin' => 'nullable|date',
            'id_fonctionnaire' => 'nullable|string', // Keep as string for semicolon separated values
            'annee_avenant' => 'required|integer|digits:4',
            'session' => 'required|string|max:50',
            'numero_approbation' => 'required|string|max:100',
            'statut' => ['nullable', Rule::in(["approuvé", "non visé", "en cours de visa", "visé", "signé"])],
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
            Log::error("Échec validation MAJ Avenant ID {$id}:", ['errors' => $validator->errors()]);
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
            // --- Update Avenant main record ---
            $avenantData = Arr::except($validatedData, ['fichiers', 'intitules', 'existing_documents_meta', 'fichiers_to_delete', 'avenant_partner_commitments']);
            $avenant->update($avenantData);
            Log::info("Avenant MAJ: ID {$avenant->id}");

            // --- Handle Document metadata, deletions, and new uploads (Keep existing logic) ---
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

            // --- START: Smart Sync Partner Commitments (ConvPart) ---
            Log::info("Synchronisation engagements partenaires pour Avenant ID: {$id}");
            
            // Only proceed if 'partenaire' modification type is selected
            if (in_array('partenaire', $validatedData['type_modification'])) {
                $existingConvPartIds = $avenant->partnerCommitments()->pluck('Id_CP')->toArray();
                $submittedCommitmentsData = collect(json_decode($validatedData['avenant_partner_commitments'] ?? '[]', true));
                
                // Use 'id_cp' key from frontend for existing items
                $submittedConvPartIds = $submittedCommitmentsData->pluck('id_cp')->filter()->unique()->toArray();
                $convPartIdsToDelete = array_diff($existingConvPartIds, $submittedConvPartIds);

                // Handle Deletions
                if (!empty($convPartIdsToDelete)) {
                    Log::info("Avenant Update: Deleting ConvPart IDs: " . implode(', ', $convPartIdsToDelete));
                    ConvPart::whereIn('Id_CP', $convPartIdsToDelete)->delete();
                }

                // Handle Updates and Creates
                Log::info("Traitement MAJ/Création pour " . $submittedCommitmentsData->count() . " engagements soumis.");
                foreach ($submittedCommitmentsData as $commitmentData) {
                    $dataToSync = [
                        'Id_Convention' => $avenant->convention_id,
                        'Montant_Convenu' => $commitmentData['Montant_Convenu'] ?? null,
                        'autre_engagement' => $commitmentData['autre_engagement'] ?? null,
                         'engagement_type_id' => $commitmentData['engagement_type_id'], // <-- ADD THIS LINE
                        'engagement_description' => $commitmentData['engagement_description'] ?? null,
                        'is_signatory' => $commitmentData['is_signatory'] ?? false,
                        'date_signature' => ($commitmentData['is_signatory'] && !empty($commitmentData['date_signature'])) ? $commitmentData['date_signature'] : null,
                        'details_signature' => ($commitmentData['is_signatory'] && !empty($commitmentData['details_signature'])) ? $commitmentData['details_signature'] : null,
                    ];
                    
                    // Use updateOrCreate to find existing commitment or create a new one
                    $convPart = $avenant->partnerCommitments()->updateOrCreate(
                        [
                            'Id_Partenaire' => $commitmentData['Id_Partenaire'],
                            'engagement_type_id' => $commitmentData['engagement_type_id'],
                        ],
                        $dataToSync
                    );

                    // Sync yearly engagements for this specific commitment
                    if (isset($commitmentData['engagements_annuels']) && is_array($commitmentData['engagements_annuels'])) {
                        $submittedYears = [];
                        foreach ($commitmentData['engagements_annuels'] as $engagementAnnuelData) {
                            if (isset($engagementAnnuelData['annee']) && isset($engagementAnnuelData['montant_prevu'])) {
                                $convPart->engagementsAnnuels()->updateOrCreate(
                                    ['annee' => $engagementAnnuelData['annee']],
                                    ['montant_prevu' => $engagementAnnuelData['montant_prevu']]
                                );
                                $submittedYears[] = $engagementAnnuelData['annee'];
                            }
                        }
                        // Remove any yearly records that were deselected
                        $convPart->engagementsAnnuels()->whereNotIn('annee', $submittedYears)->delete();
                    } else {
                        // If no yearly breakdown is submitted, ensure no old records are left behind
                        $convPart->engagementsAnnuels()->delete();
                    }
                }
            } else {
                 // If 'partenaire' type is unchecked, delete all associated commitments
                Log::info("Le type de modification 'partenaire' n'est pas sélectionné. Suppression de tous les engagements pour l'avenant ID {$id}.");
                $avenant->partnerCommitments()->delete();
            }
            // --- END: Smart Sync Partner Commitments ---

            DB::commit();
            $avenant->refresh()->load('convention', 'documents', 'partnerCommitments.partenaire', 'partnerCommitments.engagementsAnnuels');
            return response()->json(['message' => 'Avenant mis à jour avec succès', 'avenant' => $avenant], 200);

        } catch (Throwable $e) {
            DB::rollBack();
            Log::error("[AVENANT UPDATE] Failed for ID {$id}: " . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
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