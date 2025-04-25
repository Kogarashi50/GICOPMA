<?php

namespace App\Http\Controllers;

use App\Models\Programme; // Use the Programme model
use App\Models\Chantier;  // Needed for validation check
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\Rule;

class ProgrammeController extends Controller
{
    /**
     * Display a listing of the resource.
     * Mirrors ChantierController index. Eager loads 'chantier'.
     */
    public function index(): JsonResponse
    {
        try {
            $programmes = Programme::with('chantier') // Eager load the 'chantier' relationship
                ->orderBy('created_at', 'desc') // Or orderBy('Code_Programme')
                ->get();
            // Ensure the response keys match frontend expectation (usually lowercase keys for relations)
            return response()->json(['programmes' => $programmes], 200);
        } catch (\Exception $e) {
            Log::error('Error fetching programmes: ' . $e->getMessage());
            return response()->json(['failed' => 'Erreur lors de la récupération des programmes'], 500);
        }
    }

    /**
     * Remove the specified resource from storage.
     * Mirrors ChantierController destroy. Uses 'Id' for lookup.
     */
    public function destroy(string $id): JsonResponse
    {
        // Log::info('Attempting to delete programme with Id: ' . $id);

        try {
            // Find first using 'Id' column
            $programme = Programme::where('Id', $id)->first();

            DB::statement('SET FOREIGN_KEY_CHECKS=0;'); // Replicating pattern

            if (!$programme) {
                 DB::statement('SET FOREIGN_KEY_CHECKS=1;');
                 // Log::warning('Programme not found with Id: ' . $id);
                 return response()->json(['failed' => 'non trouve '], 404); // Mimicking ChantierController response
            }

            $deleted = Programme::where('Id', $id)->delete();

            DB::statement('SET FOREIGN_KEY_CHECKS=1;');

            if ($deleted) {
                // Log::info('Programme deleted successfully with Id: ' . $id);
                return response()->json(['success' => 'done done'], 200); // Mimicking ChantierController response
            } else {
                // Log::warning('Programme deletion returned false for Id: ' . $id);
                return response()->json(['failed' => 'non trouve '], 404); // Mimicking ChantierController response
            }
        } catch (\Exception $e) {
            // Log::error('Failed to delete programme with Id: ' . $id . '. Error: ' . $e->getMessage());
            try { DB::statement('SET FOREIGN_KEY_CHECKS=1;'); } catch (\Exception $dbException) { Log::error('Failed to re-enable FK checks on error: ' . $dbException->getMessage()); }
            return response()->json(['failed' => 'process shut down'], 400); // Mimicking ChantierController response
        }
    }

    /**
     * Display the specified resource.
     * Mirrors ChantierController show. Uses 'Id' for lookup. Eager loads 'chantier'.
     */
    public function show(string $id): JsonResponse
    {
        try {
            // Find using 'Id' column
            $programme = Programme::where('Id', $id)->first();

            if (!$programme) {
                 // Mimicking ChantierController's 500 response
                return response()->json(['message' => 'Erreur lors de la récupération du programme.'], 500);
            }

            // Load the relationship after finding
             $programme->load('chantier');

             return response()->json(['programme' => $programme], 200); // Return under 'programme' key

        } catch (\Exception $e) {
            Log::error('Error fetching programme Id ' . $id . ': ' . $e->getMessage());
            return response()->json(['failed' => 'Erreur serveur lors de la récupération du programme'], 500);
        }
    }

    /**
     * Store a newly created resource in storage.
     * Mirrors ChantierController store. Uses EXACT frontend key casing.
     */
    public function store(Request $request): JsonResponse
    {
        // Validate using the EXACT keys expected from the frontend
        $validatedData = $request->validate([
            'Code_Programme' => 'required|string|max:255|unique:programme,Code_Programme', // Use exact case + unique on DB column
            'Description' => 'required|string|max:65535',
            // Validate that the value passed as 'Id_Chantier' exists in the 'chantier' table's 'Code_Chantier' column
            'Id_Chantier' => ['required', 'string', Rule::exists('chantier', 'Code_Chantier')],
        ]);

        // Mimic the pattern of using $request->all() AFTER validation
        // WARNING: Ensure 'Code_Programme', 'Description', 'Id_Chantier' EXACTLY match the case
        //          in the Programme model's $fillable array for this to work safely.
        $data = $request->all();

        try {
            // Assumes Programme model's $fillable matches the casing in $data
            Programme::create($data);
            // Mimic ChantierController's success response structure/code
            return response()->json(['message' => 'Programme créé avec succès.'], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
             return response()->json(['errors' => $e->errors()], 422);
        } catch (\Exception $e) {
             Log::error('Failed to store programme: ' . $e->getMessage());
             // Mimic ChantierController's error response structure/code
             return response()->json(['message' => 'Erreur lors de la création du programme.'], 500);
        }
    }

    /**
     * Update the specified resource in storage.
     * Mirrors ChantierController update. Uses EXACT frontend key casing.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        // Validate using the EXACT keys expected from the frontend
        $data = $request->validate([
             // Ensure unique Code_Programme, ignoring the current programme's Id
             'Code_Programme' => [
                'required',
                'string',
                'max:255',
                 // Check unique on DB column 'Code_Programme', ignore based on primary key 'Id'
                 Rule::unique('programme', 'Code_Programme')->ignore($id, 'Id')
            ],
            'Description' => 'required|string|max:65535',
             // Validate that the value passed as 'Id_Chantier' exists in the 'chantier' table's 'Code_Chantier' column
             'Id_Chantier' => ['required', 'string', Rule::exists('chantier', 'Code_Chantier')],
        ]);

        // NOTE: Using validated $data here which uses the correct frontend casing.

        try {
            // Find model using 'Id' column
             $programme = Programme::where('Id', $id)->first();

             DB::statement('SET FOREIGN_KEY_CHECKS=0;'); // Replicating pattern

             if (!$programme) {
                 DB::statement('SET FOREIGN_KEY_CHECKS=1;');
                 // Mimicking ChantierController's "user not found" response structure/code
                 return response()->json(['failed' => 'user not found'], 404);
             }

            // Assumes $fillable in Programme model matches the EXACT casing of keys in $data
            $updated = Programme::where('Id', $id)->update($data);

            DB::statement('SET FOREIGN_KEY_CHECKS=1;');

            if ($updated) {
                 // Mimicking ChantierController's success response
                return response()->json(['success' => 'done done'], 200);
            } else {
                 // Mimicking ChantierController's failure response structure/code
                 return response()->json(['failed' => 'user not found'], 404);
            }
        } catch (\Illuminate\Validation\ValidationException $e) {
             return response()->json(['errors' => $e->errors()], 422);
        } catch (\Exception $e) {
             Log::error('Failed to update programme with Id: ' . $id . '. Error: ' . $e->getMessage());
             try { DB::statement('SET FOREIGN_KEY_CHECKS=1;'); } catch (\Exception $dbException) { Log::error('Failed to re-enable FK checks on error: ' . $dbException->getMessage()); }
             // Mimicking ChantierController's error response structure/code
             return response()->json(['failed' => 'process shut down'], 404);
        }
    }
}