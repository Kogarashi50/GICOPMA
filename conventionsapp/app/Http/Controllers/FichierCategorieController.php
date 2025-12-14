<?php

namespace App\Http\Controllers;

use App\Models\FichierCategorie;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use Exception;

class FichierCategorieController extends Controller
{
    /**
     * Display a listing of the resource.
     * GET /api/fichier-categories
     */
    public function index(): JsonResponse
    {
        try {
            $categories = FichierCategorie::orderBy('label')->get();
            return response()->json($categories);
        } catch (Exception $e) {
            Log::error('Error fetching file categories: ' . $e->getMessage());
            return response()->json(['message' => 'Erreur serveur lors de la récupération des catégories.'], 500);
        }
    }

    /**
     * Store a newly created resource in storage.
     * POST /api/fichier-categories
     */
    public function store(Request $request): JsonResponse
    {
        $validatedData = $request->validate([
            'label' => 'required|string|max:255',
            'value' => 'required|string|max:100|unique:fichier_categories,value',
        ]);

        try {
            $category = FichierCategorie::create($validatedData);
            Log::info('File category created successfully: ' . $category->label);
            return response()->json($category, 201);
        } catch (Exception $e) {
            Log::error('Error creating file category: ' . $e->getMessage());
            return response()->json(['message' => 'Erreur serveur lors de la création de la catégorie.'], 500);
        }
    }

    /**
     * Remove the specified resource from storage.
     * DELETE /api/fichier-categories/{fichierCategorie}
     */
    public function destroy(FichierCategorie $fichierCategorie): JsonResponse
    {
        try {
            // The ON DELETE RESTRICT constraint in the DB will prevent this if the category is in use.
            // This check provides a friendlier error message.
            if ($fichierCategorie->fichiers()->exists()) {
                return response()->json(['message' => 'Impossible de supprimer cette catégorie car elle est actuellement utilisée par un ou plusieurs fichiers.'], 409); // 409 Conflict
            }

            $label = $fichierCategorie->label;
            $fichierCategorie->delete();

            Log::info('File category deleted successfully: ' . $label);
            return response()->json(null, 204);

        } catch (Exception $e) {
            Log::error('Error deleting file category ID ' . $fichierCategorie->id . ': ' . $e->getMessage());
            return response()->json(['message' => 'Erreur serveur lors de la suppression.'], 500);
        }
    }
}