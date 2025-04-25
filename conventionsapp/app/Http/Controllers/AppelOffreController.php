<?php

namespace App\Http\Controllers;

use App\Models\AppelOffre;
use App\Models\Province; // Keep for validation source if needed
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
// use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Exception;
use Illuminate\Support\Arr;

class AppelOffreController extends Controller
{
    protected $allowedProvinces;

    public function __construct()
    {
        // Initialize allowed provinces (keep existing logic)
        $this->allowedProvinces = [
            'Berkane', 'Driouch', 'Figuig', 'Guercif', 'Jerada',
            'Nador', 'Oujda-Angad', 'Taourirt'
        ];
        // Option 2: Fetch from Province table...
    }

    /**
     * Display a listing of the resource.
     * (No changes needed here, model handles casting)
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $query = AppelOffre::orderBy('created_at', 'desc');

            // --- Filtering by Province (using JSON_CONTAINS) ---
            if ($request->has('province') && !empty($request->query('province'))) {
                $provinceFilter = $request->query('province');
                if (in_array($provinceFilter, $this->allowedProvinces)) {
                 
                    $query->whereJsonContains('provinces', $provinceFilter);
                } else {
                    Log::warning("Attempted to filter by invalid province: " . $provinceFilter);
             
                }
            }
            $appelOffres = $query->get();
            return response()->json(['appel_offres' => $appelOffres], 200);

        } catch (Exception $e) {
            Log::error('Error fetching appels d\'offres: ' . $e->getMessage());
            return response()->json(['message' => 'Erreur lors de la récupération des appels d\'offres.'], 500);
        }
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $validatedData = $request->validate([
            'categorie' => ['required', Rule::in(['Travaux', 'Etudes', 'Services', 'Fournitures'])],
            'provinces' => 'nullable|array',
            'provinces.*' => ['required', 'string', Rule::in($this->allowedProvinces)],
            'numero' => 'required|string|unique:appel_offre,numero',
            'intitule' => 'required|string',
            'estimation' => 'nullable|numeric|min:0',
            'estimation_HT' => 'required|numeric|min:0',
            'montant_TVA' => 'required|numeric|min:0',
            'duree_execution' => 'nullable|integer|min:0',
            'date_verification' => 'nullable|date_format:Y-m-d',
            'id_fonctionnaire'=>'nullable|string',
            'date_ouverture' => 'nullable|date_format:Y-m-d',
            'last_session_op' => 'nullable|date_format:Y-m-d',
            'date_publication' => 'nullable|date_format:Y-m-d', // <-- ADDED Validation (use Y-m-d if only date needed)
            'lancement_portail' => 'nullable|boolean',
            'date_lancement_portail' => 'nullable|date_format:Y-m-d|required_if:lancement_portail,true',
        ]);

        $validatedData['lancement_portail'] = $request->boolean('lancement_portail', false);
        $validatedData['provinces'] = $request->input('provinces', null);
        if (is_array($validatedData['provinces'])) {
            $validatedData['provinces'] = array_filter($validatedData['provinces']);
             if (empty($validatedData['provinces'])) { $validatedData['provinces'] = null; }
        }

        try {
            $appelOffre = AppelOffre::create($validatedData);
            Log::info('Appel d\'offre created successfully: ID ' . $appelOffre->id);
            return response()->json(['message' => 'Appel d\'offre créé avec succès.', 'appel_offre' => $appelOffre], 201);
        } catch (Exception $e) {
            Log::error('Error creating appel d\'offre: ' . $e->getMessage());
            return response()->json(['message' => 'Erreur lors de la création de l\'appel d\'offre.'], 500);
        }
    }

    /**
     * Display the specified resource.
     * (No changes needed here, model handles casting)
     */
    public function show(string $id): JsonResponse
    {
        try {
            $appelOffre = AppelOffre::findOrFail($id);
            return response()->json(['appel_offre' => $appelOffre], 200);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
             Log::warning('Appel d\'offre not found with ID: ' . $id);
             return response()->json(['message' => 'Appel d\'offre non trouvé.'], 404);
        } catch (Exception $e) {
            Log::error('Error fetching appel d\'offre ID ' . $id . ': ' . $e->getMessage());
            return response()->json(['message' => 'Erreur serveur lors de la récupération de l\'appel d\'offre.'], 500);
        }
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        try {
            $appelOffre = AppelOffre::findOrFail($id);

            $validatedData = $request->validate([
                'categorie' => ['required', Rule::in(['Travaux', 'Etudes', 'Services', 'Fournitures'])],
                'provinces' => 'nullable|array',
                'provinces.*' => ['required', 'string', Rule::in($this->allowedProvinces)],
                'numero' => [
                    'required', 'string',
                    Rule::unique('appel_offre', 'numero')->ignore($appelOffre->id),
                ],
                'intitule' => 'required|string',
                'estimation' => 'nullable|numeric|min:0',
                'estimation_HT' => 'required|numeric|min:0',
                'montant_TVA' => 'required|numeric|min:0',
                'duree_execution' => 'nullable|integer|min:0',
                'date_verification' => 'nullable|date_format:Y-m-d',
                'date_ouverture' => 'nullable|date_format:Y-m-d',
                'id_fonctionnaire'=>'nullable|string',
                'last_session_op' => 'nullable|date_format:Y-m-d',
                'date_publication' => 'nullable|date_format:Y-m-d', // <-- ADDED Validation (use Y-m-d if only date needed)
                'lancement_portail' => 'nullable|boolean',
                'date_lancement_portail' => 'nullable|date_format:Y-m-d|required_if:lancement_portail,true',
            ]);

            $validatedData['lancement_portail'] = $request->boolean('lancement_portail', $appelOffre->lancement_portail);
            $validatedData['provinces'] = $request->input('provinces', null);
            if (is_array($validatedData['provinces'])) {
                 $validatedData['provinces'] = array_filter($validatedData['provinces']);
                  if (empty($validatedData['provinces'])) { $validatedData['provinces'] = null; }
             }

            $appelOffre->update($validatedData);
            Log::info('Appel d\'offre updated successfully: ID ' . $appelOffre->id);
            return response()->json(['message' => 'Appel d\'offre mis à jour avec succès.', 'appel_offre' => $appelOffre], 200);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            Log::warning('Appel d\'offre not found for update with ID: ' . $id);
            return response()->json(['message' => 'Appel d\'offre non trouvé.'], 404);
        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::warning('Validation failed during update for Appel d\'offre ID ' . $id . ': ', $e->errors());
            return response()->json(['message' => 'Données invalides.', 'errors' => $e->errors()], 422);
        } catch (Exception $e) {
            Log::error('Error updating appel d\'offre ID ' . $id . ': ' . $e->getMessage());
            return response()->json(['message' => 'Erreur lors de la mise à jour de l\'appel d\'offre.'], 500);
        }
    }

    /**
     * Remove the specified resource from storage.
     * (No changes needed here)
     */
    public function destroy(string $id): JsonResponse
    {
        try {
            $appelOffre = AppelOffre::findOrFail($id);
            $appelOffre->delete();
            Log::info('Appel d\'offre deleted successfully: ID ' . $id);
            return response()->json(null, 204);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
             Log::warning('Appel d\'offre not found for deletion with ID: ' . $id);
             return response()->json(['message' => 'Appel d\'offre non trouvé.'], 404);
        } catch (\Illuminate\Database\QueryException $e) {
             if ($e->getCode() == 23000) {
                Log::warning('Failed to delete Appel d\'offre ID ' . $id . ' due to potential constraints.');
                return response()->json(['message' => 'Impossible de supprimer cet enregistrement car il pourrait être lié à d\'autres données.'], 409);
             }
             Log::error('Database error deleting appel d\'offre ID ' . $id . ': ' . $e->getMessage());
             return response()->json(['message' => 'Erreur base de données lors de la suppression.'], 500);
         } catch (Exception $e) {
            Log::error('Error deleting appel d\'offre ID ' . $id . ': ' . $e->getMessage());
            return response()->json(['message' => 'Erreur lors de la suppression de l\'appel d\'offre.'], 500);
        }
    }
}