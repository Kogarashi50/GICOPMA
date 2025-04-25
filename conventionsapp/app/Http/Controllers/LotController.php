<?php

namespace App\Http\Controllers;

use App\Models\MarchePublic;
use App\Models\Lot;
use App\Models\FichierJoint; // Need for delete cascade logic if done manually
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB; // For transaction on delete
use Illuminate\Support\Facades\Storage; // For deleting files if needed

class LotController extends Controller
{
    // ASSUMPTION: Route-level middleware handles authorization

    /**
     * Display a listing of lots for a specific MarchePublic.
     * GET /api/marches-publics/{marche}/lots
     */
    public function indexForMarche(MarchePublic $marche)
    {
        try {
             // Load files relationship for each lot
             $lots = $marche->lots()->with('fichiersJoints')->orderBy('numero_lot')->get();
             return response()->json(['lots' => $lots]);
        } catch (\Exception $e) {
             Log::error("Error fetching Lots for Marche {$marche->id}: " . $e->getMessage());
             return response()->json(['message' => 'Erreur serveur.'], 500);
        }
    }

    /**
     * Store a newly created lot (if managing lots independently).
     * POST /api/lots (Requires marche_id in request body)
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'marche_id' => 'required|integer|exists:marche_public,id',
            'numero_lot' => 'nullable|string|max:50',
            'objet' => 'nullable|string',
            'montant_attribue' => 'nullable|numeric|min:0',
            'attributaire' => 'nullable|string',
        ]);

        if ($validator->fails()) { return response()->json(['errors' => $validator->errors()], 422); }

        try {
            $lot = Lot::create($validator->validated());
            return response()->json(['message' => 'Lot créé.', 'lot' => $lot], 201);
        } catch (\Exception $e) { Log::error("Error creating Lot: " . $e->getMessage()); return response()->json(['message' => 'Erreur serveur.'], 500); }
    }

    /**
     * Display the specified lot.
     * GET /api/lots/{lot}
     */
    public function show(Lot $lot)
    {
        try {
             $lot->load('marchePublic', 'fichiersJoints'); // Load relationships
             return response()->json(['lot' => $lot]);
        } catch (\Exception $e) { Log::error("Error fetching Lot {$lot->id}: " . $e->getMessage()); return response()->json(['message' => 'Erreur serveur.'], 500); }
    }

    /**
     * Update the specified lot.
     * PUT /api/lots/{lot}
     */
    public function update(Request $request, Lot $lot)
    {
         $validator = Validator::make($request->all(), [
             'numero_lot' => 'nullable|string|max:50',
             'objet' => 'nullable|string',
             'montant_attribue' => 'nullable|numeric|min:0',
             'attributaire' => 'nullable|string',
             // 'marche_id' maybe shouldn't be updatable here?
         ]);

        if ($validator->fails()) { return response()->json(['errors' => $validator->errors()], 422); }

         try {
            $validatedData = array_filter($validator->validated(), fn($value) => $value !== null); // Filter nulls
            $lot->update($validatedData);
            return response()->json(['message' => 'Lot mis à jour.', 'lot' => $lot]);
        } catch (\Exception $e) { Log::error("Error updating Lot {$lot->id}: " . $e->getMessage()); return response()->json(['message' => 'Erreur serveur.'], 500); }
    }

    /**
     * Remove the specified lot and its associated files.
     * DELETE /api/lots/{lot}
     */
    public function destroy(Lot $lot)
    {
        $filesToDeleteFromStorage = [];
        DB::beginTransaction();
        try {
            // Collect file paths before deleting DB records
            foreach($lot->fichiersJoints as $fichier) {
                 if ($fichier->chemin_fichier) $filesToDeleteFromStorage[] = $fichier->chemin_fichier;
            }

            // Delete the lot (DB cascade SHOULD handle fichier_joint records)
            $deleted = $lot->delete();

            if ($deleted) {
                 DB::commit();
                 // Delete files from storage AFTER successful commit
                 foreach ($filesToDeleteFromStorage as $path) {
                      Storage::disk('public')->delete($path);
                 }
                 return response()->json(['message' => 'Lot et fichiers associés supprimés.'], 200);
            } else {
                 DB::rollBack();
                 return response()->json(['message' => 'La suppression du lot a échoué.'], 500);
            }
        } catch (\Exception $e) {
            DB::rollBack();
             Log::error("Error deleting Lot {$lot->id}: " . $e->getMessage());
             return response()->json(['message' => 'Erreur serveur lors de la suppression.'], 500);
        }
    }
}