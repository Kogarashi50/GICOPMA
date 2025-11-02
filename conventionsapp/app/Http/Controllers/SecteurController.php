<?php

namespace App\Http\Controllers;

use App\Models\Secteur; // <-- Import the Secteur model
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class SecteurController extends Controller
{
    /**
     * Get secteurs formatted for dropdowns (react-select).
     * GET /api/options/secteurs
     */
     public function index(): JsonResponse
    {
        $secteurs = Secteur::orderBy('description_fr')->get();
        return response()->json(['secteurs' => $secteurs], 200);
    }

    /**
     * Store a newly created resource in storage. (POST /api/secteurs)
     */
    public function store(Request $request): JsonResponse
    {
        $validatedData = $request->validate([
            'description_fr' => 'required|string|max:255|unique:secteurs,description_fr',
            'description_ar' => 'nullable|string|max:255',
        ]);

        $secteur = Secteur::create($validatedData);

        return response()->json(['message' => 'Secteur créé avec succès.', 'secteur' => $secteur], 201);
    }

    /**
     * Display the specified resource. (GET /api/secteurs/{secteur})
     */
    public function show(Secteur $secteur): JsonResponse
    {
        return response()->json(['secteur' => $secteur], 200);
    }

    /**
     * Update the specified resource in storage. (PUT /api/secteurs/{secteur})
     */
    public function update(Request $request, Secteur $secteur): JsonResponse
    {
        $validatedData = $request->validate([
            'description_fr' => 'required|string|max:255|unique:secteurs,description_fr,' . $secteur->id,
            'description_ar' => 'nullable|string|max:255',
        ]);

        $secteur->update($validatedData);

        return response()->json(['message' => 'Secteur mis à jour avec succès.', 'secteur' => $secteur], 200);
    }

    /**
     * Remove the specified resource from storage. (DELETE /api/secteurs/{secteur})
     */
    public function destroy(Secteur $secteur): JsonResponse
    {
        try {
            $secteur->delete();
            return response()->json(['message' => 'Secteur supprimé avec succès.'], 200);
        } catch (QueryException $e) {
            // Check for foreign key constraint violation
            if ($e->getCode() == '23000') {
                Log::error("Deletion failed for Secteur ID {$secteur->id} due to foreign key constraint.", ['error' => $e->getMessage()]);
                return response()->json(['message' => 'Impossible de supprimer ce secteur car il est utilisé par une ou plusieurs conventions.'], 409); // 409 Conflict
            }
            Log::error("Error deleting Secteur ID {$secteur->id}.", ['error' => $e->getMessage()]);
            return response()->json(['message' => 'Une erreur est survenue lors de la suppression.'], 500);
        }
    }

    public function getOptions(): JsonResponse
    {
        Log::info("Fetching 'Secteur' options for dropdown...");
        try {
            // Fetch all sectors, selecting only the columns we need.
            // We order them by the French description for a sorted dropdown.
            $secteurs = Secteur::select(['id', 'description_fr', 'description_ar'])
                               ->orderBy('description_fr', 'asc')
                               ->get();

            Log::info("Returning " . $secteurs->count() . " 'Secteur' options.");

            // Return the data as a JSON response.
            // The frontend is already configured to use 'id' and 'description_fr'.
            return response()->json($secteurs, 200);

        } catch (\Exception $e) {
            Log::error('Error fetching Secteur options: ' . $e->getMessage());
            return response()->json(['message' => 'Erreur lors du chargement des options de secteur.'], 500);
        }
    }
}