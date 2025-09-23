<?php

namespace App\Http\Controllers;

use App\Models\Commune;
use App\Models\Projet;
use App\Models\Province;
use App\Models\SousProjet;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class SousProjetController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(): JsonResponse
    {
        try {
            $sousprojets = SousProjet::with(['projet', 'province', 'commune'])
                ->orderBy('created_at', 'desc')
                ->get();
            return response()->json(['sousprojets' => $sousprojets], 200);
        } catch (\Exception $e) {
            Log::error('Error fetching sousprojets: ' . $e->getMessage());
            return response()->json(['failed' => 'Erreur lors de la récupération des sous projets'], 500);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id): JsonResponse
    {
        try {
            $sousprojet = SousProjet::where('Code_Sous_Projet', $id)
                                    ->with(['projet', 'province', 'commune'])
                                    ->firstOrFail();
            return response()->json(['sousprojet' => $sousprojet], 200);
        } catch (ModelNotFoundException $e) {
            return response()->json(['error' => 'Sous Projet n\'existe pas.'], 404);
        }
    }

    /**
     * Store a newly created resource and sync its location with the parent project.
     */
    public function store(Request $request): JsonResponse
    {
        $validatedData = $request->validate([
            'Code_Sous_Projet' => 'required|string|max:255|unique:sous_projet,Code_Sous_Projet',
            'Nom_Projet' => 'required|string|max:65535',
            'ID_Projet_Maitre' => ['required', Rule::exists('projet', 'Code_Projet')],
            'Id_Province' => ['required', Rule::exists('province', 'Id')],
            'Id_Commune' => ['nullable', Rule::exists('commune', 'Id')],
            'Observations' => 'nullable|string',
            'Etat_Avan_Physi' => 'nullable|numeric|min:0|max:100',
            'Etat_Avan_Finan' => 'nullable|numeric|min:0|max:100',
            'Estim_Initi' => 'nullable|numeric|min:0',
            'Secteur' => 'nullable|string|max:255',
            'Localite' => 'nullable|string|max:255',
            'Centre' => 'nullable|string|max:255',
            'Site' => 'nullable|string|max:255',
            'Surface' => 'nullable|numeric|min:0',
            'Lineaire' => 'nullable|numeric|min:0',
            'Status' => 'nullable|string|max:255',
            'Douars_Desservis' => 'nullable|string',
            'Financement' => 'nullable|string',
            'Nature_Intervention' => 'nullable|string',
            'Benificiaire' => 'nullable|string',
            'id_fonctionnaire'=>'nullable|string',
        ]);

        DB::beginTransaction();
        try {
            $sousProjet = SousProjet::create($validatedData);

            $parentProjet = Projet::where('Code_Projet', $validatedData['ID_Projet_Maitre'])->first();
            if ($parentProjet) {
                if (!empty($validatedData['Id_Province'])) {
                    $parentProjet->provinces()->syncWithoutDetaching([$validatedData['Id_Province']]);
                }
                if (!empty($validatedData['Id_Commune'])) {
                    $parentProjet->communes()->syncWithoutDetaching([$validatedData['Id_Commune']]);
                }
            }

            DB::commit();
            return response()->json([
                'success' => 'Sous-projet créé avec succès',
                'sousprojet' => $sousProjet->load(['projet', 'province', 'commune'])
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to store sousprojet: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return response()->json(['failed' => 'Échec de la création du sous-projet'], 500);
        }
    }


    /**
     * Update the specified resource in storage with revised and simplified parent location syncing.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        Log::info('Attempting to update sousprojet with Code: ' . $id);

        DB::beginTransaction();
        try {
            $sousprojet = SousProjet::where('Code_Sous_Projet', $id)->firstOrFail();

            $oldParentCode = $sousprojet->ID_Projet_Maitre;
            $oldProvinceId = $sousprojet->Id_Province;
            $oldCommuneId = $sousprojet->Id_Commune;

            $validatedData = $request->validate([
                'Nom_Projet' => 'required|string|max:65535',
                'ID_Projet_Maitre' => ['required', Rule::exists('projet', 'Code_Projet')],
                'Id_Province' => ['required', Rule::exists('province', 'Id')],
                'Id_Commune' => ['nullable', Rule::exists('commune', 'Id')],
                'Observations' => 'nullable|string',
                'Etat_Avan_Physi' => 'nullable|numeric|min:0|max:100',
                'Etat_Avan_Finan' => 'nullable|numeric|min:0|max:100',
                'Estim_Initi' => 'nullable|numeric|min:0',
                'Secteur' => 'nullable|string|max:255',
                'Localite' => 'nullable|string|max:255',
                'Centre' => 'nullable|string|max:255',
                'Site' => 'nullable|string|max:255',
                'Surface' => 'nullable|numeric|min:0',
                'Lineaire' => 'nullable|numeric|min:0',
                'Status' => 'nullable|string|max:255',
                'Douars_Desservis' => 'nullable|string',
                'Financement' => 'nullable|string',
                'Nature_Intervention' => 'nullable|string',
                'Benificiaire' => 'nullable|string',
                'id_fonctionnaire' => 'nullable|string',
            ]);

            $newParentCode = $validatedData['ID_Projet_Maitre'];
            $newProvinceId = $validatedData['Id_Province'] ?? null;
            $newCommuneId = $validatedData['Id_Commune'] ?? null;

            // Step 1: Perform the update on the sub-project itself. This happens first.
            $sousprojet->update($validatedData);

            // Step 2: Ensure the new locations are attached to the new parent project.
            $newParent = Projet::where('Code_Projet', $newParentCode)->first();
            if ($newParent) {
                if ($newProvinceId) $newParent->provinces()->syncWithoutDetaching([$newProvinceId]);
                if ($newCommuneId) $newParent->communes()->syncWithoutDetaching([$newCommuneId]);
            }

            // --- REVISED AND INLINED CLEANUP LOGIC ---
            // Step 3: Clean up old locations from the old parent project if they are no longer needed.
            $parentToClean = Projet::where('Code_Projet', $oldParentCode)->first();
            if ($parentToClean) {
                // If the parent project itself was changed, we check both old locations on the old parent.
                if ($oldParentCode !== $newParentCode) {
                    // Check if the old province is still in use by any other sub-project on the old parent.
                    if ($oldProvinceId && !SousProjet::where('ID_Projet_Maitre', $oldParentCode)->where('Id_Province', $oldProvinceId)->exists()) {
                        $parentToClean->provinces()->detach($oldProvinceId);
                    }
                    // Check if the old commune is still in use by any other sub-project on the old parent.
                    if ($oldCommuneId && !SousProjet::where('ID_Projet_Maitre', $oldParentCode)->where('Id_Commune', $oldCommuneId)->exists()) {
                        $parentToClean->communes()->detach($oldCommuneId);
                    }
                } else {
                    // The parent is the same, so we only check the specific locations that were changed.
                    if ($oldProvinceId != $newProvinceId && $oldProvinceId) {
                        // The province changed. Check if the OLD province is still needed by any sub-project.
                        if (!SousProjet::where('ID_Projet_Maitre', $oldParentCode)->where('Id_Province', $oldProvinceId)->exists()) {
                            $parentToClean->provinces()->detach($oldProvinceId);
                        }
                    }
                    if ($oldCommuneId != $newCommuneId && $oldCommuneId) {
                        // The commune changed. Check if the OLD commune is still needed by any sub-project.
                        if (!SousProjet::where('ID_Projet_Maitre', $oldParentCode)->where('Id_Commune', $oldCommuneId)->exists()) {
                            $parentToClean->communes()->detach($oldCommuneId);
                        }
                    }
                }
            }
            // --- END REVISED LOGIC ---

            DB::commit();
            return response()->json([
                'success' => 'Sous-projet mis à jour avec succès',
                'sousprojet' => $sousprojet->fresh()->load(['projet', 'province', 'commune'])
            ], 200);

        } catch (ModelNotFoundException $e) {
            DB::rollBack();
            return response()->json(['failed' => 'Sous-projet non trouvé'], 404);
        } catch (ValidationException $e) {
            DB::rollBack();
            return response()->json(['errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to update sousprojet ' . $id . ': ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return response()->json(['failed' => 'Échec de la mise à jour du sous-projet'], 500);
        }
    }

    /**
     * Remove the specified resource from storage and clean up parent project locations.
     */
    public function destroy(string $id): JsonResponse
    {
        DB::beginTransaction();
        try {
            $sousprojet = SousProjet::where('Code_Sous_Projet', $id)->firstOrFail();

            $parentCode = $sousprojet->ID_Projet_Maitre;
            $provinceId = $sousprojet->Id_Province;
            $communeId = $sousprojet->Id_Commune;

            $sousprojet->delete();

            // After deleting the sub-project, run cleanup on its former parent locations.
            $this->cleanupParentLocations($parentCode, $provinceId, $communeId);

            DB::commit();
            return response()->json(['success' => 'Sous-projet supprimé avec succès'], 200);

        } catch (ModelNotFoundException $e) {
            DB::rollBack();
            return response()->json(['failed' => 'Sous-projet non trouvé'], 404);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to delete sousprojet ' . $id . ': ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return response()->json(['failed' => 'Erreur lors de la suppression'], 500);
        }
    }

    /**
     * SIMPLIFIED Helper function to detach locations from a parent project if they are no longer
     * used by any of its sub-projects. This is now only used by the destroy() method.
     */
    private function cleanupParentLocations(?string $parentCode, ?int $provinceId, ?int $communeId): void
    {
        if (!$parentCode) {
            return;
        }
        $parent = Projet::where('Code_Projet', $parentCode)->first();
        if (!$parent) {
            return;
        }

        // If a province was associated, check if any sub-project still uses it for this parent.
        if ($provinceId) {
            if (!SousProjet::where('ID_Projet_Maitre', $parentCode)->where('Id_Province', $provinceId)->exists()) {
                $parent->provinces()->detach($provinceId);
            }
        }

        // If a commune was associated, check if any sub-project still uses it for this parent.
        if ($communeId) {
            if (!SousProjet::where('ID_Projet_Maitre', $parentCode)->where('Id_Commune', $communeId)->exists()) {
                $parent->communes()->detach($communeId);
            }
        }
    }
}