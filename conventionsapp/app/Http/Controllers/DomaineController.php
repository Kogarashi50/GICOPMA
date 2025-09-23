<?php

namespace App\Http\Controllers;

use App\Models\Domaine;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Database\QueryException;
use Illuminate\Validation\ValidationException;

class DomaineController extends Controller
{
    /**
     * Display a listing of the resource.
     * GET /api/domaines
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $query = Domaine::query();
            if ($request->has('search')) {
                $searchTerm = '%' . $request->search . '%';
                $query->where(function ($q) use ($searchTerm) {
                    $q->where('Code', 'like', $searchTerm)
                      ->orWhere('Description', 'like', $searchTerm)
                      ->orWhere('Description_Arr', 'like', $searchTerm);
                });
            }

            $domaines = $query->orderBy('Description', 'asc')->get();
            return response()->json(['domaines' => $domaines]);
        } catch (\Exception $e) {
            Log::error('Error fetching domaines: ' . $e->getMessage());
            return response()->json(['message' => 'Erreur serveur lors de la récupération des domaines.'], 500);
        }
    }

    /**
     * Get domaines formatted for dropdowns.
     * GET /api/options/domaines
     */
    public function getOptions(Request $request): JsonResponse
    {
        Log::info("API: Fetching Domaine options for dropdown.");
        try {
            $domaines = Domaine::orderBy('Description')
                               ->get(['Id', 'Code', 'Description']);

            $options = $domaines->map(function ($domaine) {
                $label = $domaine->Description;
                if (!empty($domaine->Code) && !empty($domaine->Description)) {
                   $label = $domaine->Code . ' - ' . $domaine->Description;
                } elseif (empty($domaine->Description)) {
                    $label = !empty($domaine->Code) ? $domaine->Code : "Domaine (ID: {$domaine->Id})";
                }
                return ['value' => $domaine->Id, 'label' => $label];
            });

            Log::info("API: Returning " . $options->count() . " Domaine options.");
            return response()->json($options);
        } catch (\Exception $e) {
            Log::error('Error fetching Domaine options: ' . $e->getMessage());
            return response()->json(['message' => 'Erreur serveur lors du chargement des options de domaines.'], 500);
        }
    }

    /**
     * Store a newly created resource in storage.
     * POST /api/domaines
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $validatedData = $request->validate([
                'Code' => 'required|numeric|unique:domaine,Code',
                'Description' => 'required|string|max:255',
                'Description_Arr' => 'nullable|string|max:255',
            ]);

            $domaine = Domaine::create($validatedData);

            return response()->json(['message' => 'Domaine créé avec succès.', 'domaine' => $domaine], 201);

        } catch (ValidationException $e) {
            Log::warning('Validation failed for creating domaine: ', $e->errors());
            return response()->json(['message' => 'Les données fournies étaient invalides.', 'errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            Log::error('Error creating domaine: ' . $e->getMessage(), ['data' => $request->all()]);
            return response()->json(['message' => 'Erreur serveur lors de la création du domaine.'], 500);
        }
    }

    /**
     * Display the specified resource.
     * GET /api/domaines/{id}
     */
    public function show(string $id): JsonResponse
    {
        try {
            $domaine = Domaine::findOrFail($id);
            return response()->json(['domaine' => $domaine]);
        } catch (ModelNotFoundException $e) {
            return response()->json(['message' => 'Domaine non trouvé.'], 404);
        } catch (\Exception $e) {
            Log::error("Error fetching domaine with ID {$id}: " . $e->getMessage());
            return response()->json(['message' => 'Erreur serveur lors de la récupération du domaine.'], 500);
        }
    }

    /**
     * Update the specified resource in storage.
     * PUT /api/domaines/{id}
     */
    public function update(Request $request, string $id): JsonResponse
    {
        try {
            $domaine = Domaine::findOrFail($id);

            $validatedData = $request->validate([
                'Code' => [
                    'required',
                    'numeric',
                    Rule::unique('domaine', 'Code')->ignore($domaine->Id, 'Id')
                ],
                'Description' => 'required|string|max:255',
                'Description_Arr' => 'nullable|string|max:255',
            ]);

            $domaine->update($validatedData);
            return response()->json(['message' => 'Domaine mis à jour avec succès.', 'domaine' => $domaine->fresh()]);

        } catch (ModelNotFoundException $e) {
            return response()->json(['message' => 'Domaine non trouvé pour mise à jour.'], 404);
        } catch (ValidationException $e) {
            Log::warning("Validation failed for updating domaine ID {$id}: ", $e->errors());
            return response()->json(['message' => 'Les données fournies étaient invalides.', 'errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            Log::error("Error updating domaine ID {$id}: " . $e->getMessage(), ['data' => $request->all()]);
            return response()->json(['message' => 'Erreur serveur lors de la mise à jour du domaine.'], 500);
        }
    }

    /**
     * Remove the specified resource from storage.
     * DELETE /api/domaines/{id}
     */
    public function destroy(string $id): JsonResponse
    {
        try {
            $domaine = Domaine::findOrFail($id);
            $domaine->delete();
            return response()->json(null, 204);

        } catch (ModelNotFoundException $e) {
            return response()->json(['message' => 'Domaine non trouvé pour suppression.'], 404);
        } catch (QueryException $qe) {
            Log::error("Database error deleting domaine ID {$id}: " . $qe->getMessage());
            if (str_contains($qe->getMessage(), 'constraint violation') || $qe->getCode() == '23000') {
                return response()->json(['message' => 'Impossible de supprimer ce domaine car il est référencé par d\'autres enregistrements.'], 409);
            }
            return response()->json(['message' => 'Erreur base de données lors de la suppression du domaine.'], 500);
        } catch (\Exception $e) {
            Log::error("Error deleting domaine ID {$id}: " . $e->getMessage());
            return response()->json(['message' => 'Erreur serveur lors de la suppression du domaine.'], 500);
        }
    }
}