<?php

namespace App\Http\Controllers;

use App\Models\Chantier;
// use App\Models\Domaine; // Only if directly used, not needed for Rule::exists on Id_Domaine
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB; // Keep if you insist on FK check disabling
use Illuminate\Validation\Rule;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Database\QueryException;

class ChantierController extends Controller
{
    /**
     * Display a listing of the resource.
     * GET /api/chantiers
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $query = Chantier::with('domaine'); // Eager load domaine

            if ($request->has('search')) {
                $searchTerm = '%' . $request->search . '%';
                $query->where(function ($q) use ($searchTerm) {
                    $q->where('Code_Chantier', 'like', $searchTerm)
                      ->orWhere('Description', 'like', $searchTerm);
                });
            }
            // Order by a meaningful column, e.g., Description or Code_Chantier
            $chantiers = $query->orderBy('Description', 'asc')->get();
            return response()->json(['chantiers' => $chantiers]);
        } catch (\Exception $e) {
            Log::error('Error fetching chantiers: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return response()->json(['message' => 'Erreur serveur lors de la récupération des chantiers.'], 500);
        }
    }

    
    
    
     public function getOptions(Request $request): JsonResponse
    {
        Log::info("API: Fetching Chantier options for dropdown.");
        try {
            // Select the Primary Key ('Id'), 'Code_Chantier', and 'Description'
            // Order by Description for user-friendly sorting in the dropdown.
            $chantiers = Chantier::orderBy('Description')
                               ->get(['Id', 'Code_Chantier', 'Description']);

            $options = $chantiers->map(function ($chantier) {
                $label = $chantier->Description; // Start with Description as the base label

                // Prepend Code_Chantier if both Code and Description exist for a more informative label
                if (!empty($chantier->Code_Chantier) && !empty($chantier->Description)) {
                   $label = $chantier->Code_Chantier . ' - ' . $chantier->Description;
                } elseif (empty($label) && !empty($chantier->Code_Chantier)) {
                    // If Description is empty but Code_Chantier exists, use Code_Chantier as label
                    $label = $chantier->Code_Chantier;
                } elseif (empty($label)) {
                    // Fallback if both Description and Code_Chantier are empty
                    $label = "Chantier (ID: {$chantier->Id})";
                }

                // CRUCIAL: Return the Primary Key ('Id') of the chantier as the 'value'
                return ['value' => $chantier->Id, 'label' => $label];
            });

            Log::info("API: Returning " . $options->count() . " Chantier options.");
            return response()->json($options); // Return the array of [{value, label}, ...] directly
        } catch (\Exception $e) {
            Log::error('Error fetching Chantier options: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return response()->json(['message' => 'Erreur serveur lors du chargement des options de chantiers.'], 500);
        }
    }
    



    public function store(Request $request): JsonResponse
    {
        try {
            $validatedData = $request->validate([
                'Code_Chantier' => 'required|string|max:50|unique:chantier,Code_Chantier', // Assuming table name is 'chantier'
                'Description' => 'required|string|max:255',
                // Assuming 'Id_Domaine' in request contains the 'Code' of the Domaine
                'Id_Domaine' => ['required', 'string', Rule::exists('domaine', 'Code')], // Validates against 'Code' in 'domaine' table
            ]);

            // If 'Id_Domaine' in 'chantiers' table should store the PK (Id) of 'domaines' table:
            // $domaine = \App\Models\Domaine::where('Code', $validatedData['Id_Domaine'])->firstOrFail();
            // $dataToCreate = [
            //     'Code_Chantier' => $validatedData['Code_Chantier'],
            //     'Description' => $validatedData['Description'],
            //     'Id_Domaine' => $domaine->Id, // Use the PK of the Domaine
            // ];
            // $chantier = Chantier::create($dataToCreate);

            // If 'Id_Domaine' in 'chantiers' table directly stores the 'Code' of domaine (string):
            $chantier = Chantier::create($validatedData); // Ensure $fillable in Chantier model is set

            return response()->json($chantier, 201);

        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::warning('Validation failed for creating chantier: ', $e->errors());
            return response()->json(['message' => 'Les données fournies étaient invalides.', 'errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            Log::error('Error creating chantier: ' . $e->getMessage(), ['data' => $request->all(), 'trace' => $e->getTraceAsString()]);
            return response()->json(['message' => 'Erreur serveur lors de la création du chantier.'], 500);
        }
    }

    /**
     * Display the specified resource.
     * GET /api/chantiers/{id} (assuming 'Id' is PK)
     */
    public function show(string $id): JsonResponse // Or Chantier $chantier with Route Model Binding
    {
        try {
            // Assumes 'Id' is the primary key. If it's 'Code_Chantier', change findOrFail.
            $chantier = Chantier::with('domaine')->findOrFail($id);
            return response()->json($chantier); // Or nest: ['chantier' => $chantier]

        } catch (ModelNotFoundException $e) {
            return response()->json(['message' => 'Chantier non trouvé.'], 404);
        } catch (\Exception $e) {
            Log::error("Error fetching chantier Id {$id}: " . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return response()->json(['message' => 'Erreur serveur lors de la récupération du chantier.'], 500);
        }
    }

    /**
     * Update the specified resource in storage.
     * PUT /api/chantiers/{id}
     */
    public function update(Request $request, string $id): JsonResponse // Or Chantier $chantier
    {
        try {
            $chantier = Chantier::findOrFail($id); // Assumes PK is 'Id'

            $validatedData = $request->validate([
                'Code_Chantier' => ['required','string','max:50', Rule::unique('chantier', 'Code_Chantier')->ignore($chantier->Id, 'Id')], // Ensure 'Id' is PK column name
                'Description' => 'required|string|max:255',
                'Id_Domaine' => ['required', 'string', Rule::exists('domaine', 'Code')],
            ]);

            // If Id_Domaine in 'chantiers' table stores the PK (Id) of 'domaines':
            // $domaine = \App\Models\Domaine::where('Code', $validatedData['Id_Domaine'])->firstOrFail();
            // $dataToUpdate = [
            //     'Code_Chantier' => $validatedData['Code_Chantier'],
            //     'Description' => $validatedData['Description'],
            //     'Id_Domaine' => $domaine->Id,
            // ];
            // $chantier->update($dataToUpdate);

            // If 'Id_Domaine' in 'chantiers' directly stores the 'Code' of domaine:
            $chantier->update($validatedData);

            return response()->json($chantier->fresh()->load('domaine')); // Return updated and reloaded model

        } catch (ModelNotFoundException $e) {
            return response()->json(['message' => 'Chantier non trouvé pour mise à jour.'], 404);
        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::warning("Validation failed for updating chantier ID {$id}: ", $e->errors());
            return response()->json(['message' => 'Les données fournies étaient invalides.', 'errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            Log::error("Error updating chantier Id {$id}: " . $e->getMessage(), ['data' => $request->all(), 'trace' => $e->getTraceAsString()]);
            return response()->json(['message' => 'Erreur serveur lors de la mise à jour du chantier.'], 500);
        }
    }

    /**
     * Remove the specified resource from storage.
     * DELETE /api/chantiers/{id}
     */
    public function destroy(string $id): JsonResponse // Or Chantier $chantier
    {
        try {
            $chantier = Chantier::findOrFail($id); // Assumes PK is 'Id'

            // Avoid disabling FK checks if possible.
            // DB::statement('SET FOREIGN_KEY_CHECKS=0;');
            $chantier->delete();
            // DB::statement('SET FOREIGN_KEY_CHECKS=1;');

            return response()->json(null, 204); // Standard 204 No Content

        } catch (ModelNotFoundException $e) {
            return response()->json(['message' => 'Chantier non trouvé pour suppression.'], 404);
        } catch (QueryException $qe) {
            Log::error("Database error deleting chantier Id {$id}: " . $qe->getMessage());
            if (str_contains($qe->getMessage(), 'constraint violation') || $qe->getCode() == '23000') {
                return response()->json(['message' => 'Impossible de supprimer ce chantier, il est référencé.'], 409); // Conflict
            }
            return response()->json(['message' => 'Erreur base de données lors de la suppression.'], 500);
        } catch (\Exception $e) {
            Log::error("Error deleting chantier Id {$id}: " . $e->getMessage());
            // try { DB::statement('SET FOREIGN_KEY_CHECKS=1;'); } catch (\Exception $dbEx) { Log::error('Failed to re-enable FK checks on error: ' . $dbEx->getMessage()); }
            return response()->json(['message' => 'Erreur serveur lors de la suppression du chantier.'], 500);
        }
    }
}