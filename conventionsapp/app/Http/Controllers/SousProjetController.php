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
use Illuminate\Support\Arr; // <-- IMPORTED Arr HELPER

class SousProjetController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(): JsonResponse
    {
        try {
            // NOTE: Eager loading 'province' and 'commune' might be incorrect if they don't exist as direct relationships.
            // Assuming 'SousProjet' model has relationships defined for these. If not, this part might need adjustment.
            $sousprojets = SousProjet::with(['projet'/*, 'provinces', 'communes'*/]) // It's better to name relationships in plural form for arrays
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
                                    ->with(['projet'/*, 'provinces', 'communes'*/])
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
        // --- FIX [1]: FLATTEN NESTED ARRAYS BEFORE VALIDATION ---
        // This transforms incoming data like [['2', '3']] into a flat ['2', '3'] array.
        if ($request->has('Id_Province') && is_array($request->input('Id_Province'))) {
            $request->merge(['Id_Province' => Arr::flatten($request->input('Id_Province'))]);
        }
        if ($request->has('Id_Commune') && is_array($request->input('Id_Commune'))) {
            $request->merge(['Id_Commune' => Arr::flatten($request->input('Id_Commune'))]);
        }
        // --- END FIX [1] ---

        $validatedData = $request->validate([
            'Code_Sous_Projet' => 'required|string|max:255|unique:sous_projet,Code_Sous_Projet',
            'Nom_Projet' => 'required|string|max:65535',
            'ID_Projet_Maitre' => ['required', Rule::exists('projet', 'Code_Projet')],
            'Id_Province' => 'required|array',
            'Id_Province.*' => ['required', Rule::exists('province', 'Id')], // Validation now works correctly
            'Id_Commune' => 'nullable|array',
            'Id_Commune.*' => ['nullable', Rule::exists('commune', 'Id')], // Validation now works correctly
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
            // The create method works correctly with arrays because of the 'array' cast in the SousProjet model.
            $sousProjet = SousProjet::create($validatedData);

            // Sync the new locations to the parent project
            $parentProjet = Projet::where('Code_Projet', $validatedData['ID_Projet_Maitre'])->first();
            if ($parentProjet) {
                if (!empty($validatedData['Id_Province'])) {
                    $parentProjet->provinces()->syncWithoutDetaching($validatedData['Id_Province']);
                }
                if (!empty($validatedData['Id_Commune'])) {
                    $parentProjet->communes()->syncWithoutDetaching($validatedData['Id_Commune']);
                }
            }

            DB::commit();
            return response()->json([
                'success' => 'Sous-projet créé avec succès',
                'sousprojet' => $sousProjet->load('projet')
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to store sousprojet: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return response()->json(['failed' => 'Échec de la création du sous-projet'], 500);
        }
    }


    /**
     * Update the specified resource in storage and manage parent location syncing.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        // --- FIX [1]: FLATTEN NESTED ARRAYS BEFORE VALIDATION ---
        if ($request->has('Id_Province') && is_array($request->input('Id_Province'))) {
            $request->merge(['Id_Province' => Arr::flatten($request->input('Id_Province'))]);
        }
        if ($request->has('Id_Commune') && is_array($request->input('Id_Commune'))) {
            $request->merge(['Id_Commune' => Arr::flatten($request->input('Id_Commune'))]);
        }
        // --- END FIX [1] ---

        DB::beginTransaction();
        try {
            $sousprojet = SousProjet::where('Code_Sous_Projet', $id)->firstOrFail();

            // Store old location data for cleanup later
            $oldParentCode = $sousprojet->ID_Projet_Maitre;
            $oldProvinceIds = $sousprojet->Id_Province ?? [];
            $oldCommuneIds = $sousprojet->Id_Commune ?? [];

            $validatedData = $request->validate([
                'Nom_Projet' => 'sometimes|required|string|max:65535',
                'ID_Projet_Maitre' => ['sometimes','required', Rule::exists('projet', 'Code_Projet')],
                'Id_Province' => 'sometimes|required|array',
                'Id_Province.*' => ['required', Rule::exists('province', 'Id')],
                'Id_Commune' => 'nullable|array',
                'Id_Commune.*' => ['nullable', Rule::exists('commune', 'Id')],
                // ... all other fields should also probably have 'sometimes' if not always present
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

            $sousprojet->update($validatedData);
            // Refresh the model to get the most up-to-date data, including casts
            $sousprojet->refresh();

            $newParentCode = $sousprojet->ID_Projet_Maitre;
            $newProvinceIds = $sousprojet->Id_Province ?? [];
            $newCommuneIds = $sousprojet->Id_Commune ?? [];

            // Step 1: Add new locations to the new parent.
            $newParent = Projet::where('Code_Projet', $newParentCode)->first();
            if ($newParent) {
                if (!empty($newProvinceIds)) $newParent->provinces()->syncWithoutDetaching($newProvinceIds);
                if (!empty($newCommuneIds)) $newParent->communes()->syncWithoutDetaching($newCommuneIds);
            }

            // Step 2: Clean up old locations from the old parent.
            $provincesToRemove = array_diff($oldProvinceIds, $newProvinceIds);
            $communesToRemove = array_diff($oldCommuneIds, $newCommuneIds);
            
            // If the parent project was changed, we must check all old locations for cleanup
            if ($oldParentCode !== $newParentCode) {
                 $this->cleanupParentLocations($oldParentCode, $oldProvinceIds, $oldCommuneIds, $sousprojet->id);
            } else { // Otherwise, just clean up the locations that were removed
                 $this->cleanupParentLocations($oldParentCode, $provincesToRemove, $communesToRemove, $sousprojet->id);
            }

            DB::commit();
            return response()->json([
                'success' => 'Sous-projet mis à jour avec succès',
                'sousprojet' => $sousprojet->load('projet')
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
            // --- FIX [2]: These are now arrays ---
            $provinceIds = $sousprojet->Id_Province;
            $communeIds = $sousprojet->Id_Commune;
            $deletedSousProjetId = $sousprojet->id;

            $sousprojet->delete();

            // After deleting, run cleanup on its former parent.
            // Pass the ID of the deleted subproject to exclude it from the "still in use" check.
            $this->cleanupParentLocations($parentCode, $provinceIds, $communeIds, $deletedSousProjetId);

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
     * --- FIX [3]: REVISED HELPER FUNCTION ---
     * Helper to detach locations from a parent project if they are no longer used by any of its sub-projects.
     * It now correctly handles arrays of IDs.
     * @param int|null $excludeSousProjetId - A sub-project ID to exclude from the check (used during update/delete).
     */
    private function cleanupParentLocations(?string $parentCode, ?array $provinceIds, ?array $communeIds, ?int $excludeSousProjetId = null): void
    {
        if (!$parentCode || (!$provinceIds && !$communeIds)) {
            return;
        }
        $parent = Projet::where('Code_Projet', $parentCode)->first();
        if (!$parent) {
            return;
        }

        // Clean up provinces
        if (!empty($provinceIds)) {
            foreach ($provinceIds as $provinceId) {
                $query = SousProjet::where('ID_Projet_Maitre', $parentCode)
                                   ->whereJsonContains('Id_Province', $provinceId);
                
                if ($excludeSousProjetId) {
                    $query->where('id', '!=', $excludeSousProjetId);
                }

                // If no other sub-project uses this province, detach it from the parent.
                if (!$query->exists()) {
                    $parent->provinces()->detach($provinceId);
                }
            }
        }

        // Clean up communes
        if (!empty($communeIds)) {
            foreach ($communeIds as $communeId) {
                $query = SousProjet::where('ID_Projet_Maitre', $parentCode)
                                   ->whereJsonContains('Id_Commune', $communeId);

                if ($excludeSousProjetId) {
                    $query->where('id', '!=', $excludeSousProjetId);
                }
                
                // If no other sub-project uses this commune, detach it.
                if (!$query->exists()) {
                    $parent->communes()->detach($communeId);
                }
            }
        }
    }
}