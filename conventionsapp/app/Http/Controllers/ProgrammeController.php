<?php

namespace App\Http\Controllers;

use App\Models\Programme;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Database\QueryException;
use Illuminate\Validation\ValidationException;

class ProgrammeController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(): JsonResponse
    {
        try {
            $programmes = Programme::with('domaine') // Corrected relationship
                ->orderBy('Description', 'asc')
                ->get();
            return response()->json(['programmes' => $programmes]);
        } catch (\Exception $e) {
            Log::error('Error fetching programmes: ' . $e->getMessage());
            return response()->json(['message' => 'Erreur serveur lors de la récupération des programmes.'], 500);
        }
    }

    /**
     * Get programmes formatted for dropdowns.
     */
    public function getOptions(Request $request): JsonResponse
    {
        Log::info("API: Fetching Programme options for dropdown.");
        try {
            $programmes = Programme::orderBy('Description')
                                  ->get(['Id', 'Code_Programme', 'Description']);

            $options = $programmes->map(function ($programme) {
                $label = $programme->Description;
                if (!empty($programme->Code_Programme) && !empty($programme->Description)) {
                   $label = $programme->Code_Programme . ' - ' . $programme->Description;
                } elseif (empty($programme->Description)) {
                    $label = !empty($programme->Code_Programme) ? $programme->Code_Programme : "Programme ID: {$programme->Id}";
                }
                return ['value' => $programme->Id, 'label' => $label];
            });

            Log::info("API: Returning " . $options->count() . " Programme options.");
            return response()->json($options);
        } catch (\Exception $e) {
            Log::error('Error fetching Programme options: ' . $e->getMessage());
            return response()->json(['message' => 'Erreur serveur lors du chargement des options de programmes.'], 500);
        }
    }

    /**
     * Store a newly created resource in storage.
     */

public function store(Request $request): JsonResponse
{
    try {
        $validatedData = $request->validate([
            'Code_Programme' => 'required|string|max:255|unique:programme,Code_Programme',
            'Description' => 'required|string|max:65535',
            'domaine_id' => ['required', 'integer', Rule::exists('domaine', 'Id')],
        ]);

        // The transaction's return value will be assigned to $programme
        $programme = DB::transaction(function () use ($validatedData) {
            // 1. Create the model
            $newProgramme = Programme::create($validatedData);

            // 2. IMPORTANT: Return the created model from the closure
            return $newProgramme;
        });

        // 3. Load the relationship AFTER the transaction is successful
        $programme->load('domaine');

        // 4. Build and return the JSON response here, outside the transaction
        return response()->json(['message' => 'Programme créé avec succès.', 'programme' => $programme], 201);

    } catch (ValidationException $e) {
         Log::warning('Validation failed for creating programme: ', $e->errors());
         return response()->json(['message' => 'Les données fournies étaient invalides.', 'errors' => $e->errors()], 422);
    } catch (\Exception $e) {
         Log::error('Failed to store programme: ' . $e->getMessage(), ['request' => $request->all()]);
         return response()->json(['message' => 'Erreur serveur lors de la création du programme.'], 500);
    }
}
    /**
     * Display the specified resource.
     */
    public function show(string $id): JsonResponse
    {
        try {
            $programme = Programme::with('domaine')->findOrFail($id);
            return response()->json(['programme' => $programme]);
        } catch (ModelNotFoundException $e) {
             return response()->json(['message' => 'Programme non trouvé.'], 404);
        } catch (\Exception $e) {
            Log::error('Error fetching programme Id ' . $id . ': ' . $e->getMessage());
            return response()->json(['message' => 'Erreur serveur lors de la récupération du programme.'], 500);
        }
    }

    /**
     * Update the specified resource in storage.
     */
public function update(Request $request, string $id): JsonResponse
{
    try {
        $programme = Programme::findOrFail($id);

        $validatedData = $request->validate([
             'Code_Programme' => ['required', 'string', 'max:255', Rule::unique('programme', 'Code_Programme')->ignore($programme->Id, 'Id')],
            'Description' => 'required|string|max:65535',
            'domaine_id' => ['required', 'integer', Rule::exists('domaine', 'Id')],
        ]);

        // Use a transaction for the update operation
        DB::transaction(function () use ($programme, $validatedData) {
            $programme->update($validatedData);
        });

        // Load the correct relationship and return the successful response
        return response()->json([
            'message' => 'Programme mis à jour avec succès.',
            'programme' => $programme->fresh()->load('domaine') // Load 'domaine'
        ]);

    } catch (ModelNotFoundException $e) {
        return response()->json(['message' => 'Programme non trouvé pour mise à jour.'], 404);
    } catch (ValidationException $e) {
         Log::warning("Validation failed for updating programme ID {$id}: ", $e->errors());
         return response()->json(['message' => 'Les données fournies étaient invalides.', 'errors' => $e->errors()], 422);
    } catch (\Exception $e) {
         Log::error('Failed to update programme with Id: ' . $id . '. Error: ' . $e->getMessage(), ['request' => $request->all()]);
         return response()->json(['message' => 'Erreur serveur lors de la mise à jour du programme.'], 500);
    }
}

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id): JsonResponse
    {
        try {
            $programme = Programme::findOrFail($id);
            $programme->delete();
            return response()->json(null, 204);

        } catch (ModelNotFoundException $e) {
            return response()->json(['message' => 'Programme non trouvé pour suppression.'], 404);
        } catch (QueryException $qe) {
            Log::error("Database error deleting programme ID {$id}: " . $qe->getMessage());
            if (str_contains($qe->getMessage(), 'constraint violation') || $qe->getCode() == '23000') {
                return response()->json(['message' => 'Impossible de supprimer ce programme, il est référencé par d\'autres enregistrements.'], 409);
            }
            return response()->json(['message' => 'Erreur base de données lors de la suppression du programme.'], 500);
        } catch (\Exception $e) {
            Log::error('Failed to delete programme with Id: ' . $id . '. Error: ' . $e->getMessage());
            return response()->json(['message' => 'Erreur serveur lors de la suppression du programme.'], 500);
        }
    }
}