<?php

namespace App\Http\Controllers;

use App\Models\Engagement; // Use the Engagement model
use App\Models\Programme;  // Needed for validation check
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\Rule;

class EngagementController extends Controller
{
    /**
     * Display a listing of the resource.
     * Mirrors ProgrammeController index. Eager loads 'programme'.
     */
    public function index(): JsonResponse
    {
        try {
            $engagements = Engagement::with('programme') // Eager load the 'programme' relationship
                ->orderBy('created_at', 'desc') // Or orderBy('Code_Engag') / 'Rang'
                ->get();
            // Ensure the response keys match frontend expectation (using plural 'engagements')
            return response()->json(['engagements' => $engagements], 200);
        } catch (\Exception $e) {
            Log::error('Error fetching engagements: ' . $e->getMessage());
            return response()->json(['failed' => 'Erreur lors de la récupération des engagements'], 500);
        }
    }

    /**
     * Remove the specified resource from storage.
     * Mirrors ProgrammeController destroy. Uses 'ID' for lookup.
     */
    public function destroy(string $id): JsonResponse
    {
        // Log::info('Attempting to delete engagement with ID: ' . $id);

        try {
            // Find first using 'ID' column (case sensitive)
            $engagement = Engagement::where('ID', $id)->first();

            DB::statement('SET FOREIGN_KEY_CHECKS=0;'); // Replicating pattern

            if (!$engagement) {
                 DB::statement('SET FOREIGN_KEY_CHECKS=1;');
                 // Log::warning('Engagement not found with ID: ' . $id);
                 return response()->json(['failed' => 'non trouve '], 404); // Mimicking response
            }

            // Use where()->delete() as requested
            $deleted = Engagement::where('ID', $id)->delete();

            DB::statement('SET FOREIGN_KEY_CHECKS=1;');

            if ($deleted) {
                // Log::info('Engagement deleted successfully with ID: ' . $id);
                return response()->json(['success' => 'done done'], 200); // Mimicking response
            } else {
                // Log::warning('Engagement deletion returned 0 or false for ID: ' . $id);
                return response()->json(['failed' => 'non trouve '], 404); // Mimicking response
            }
        } catch (\Exception $e) {
            // Log::error('Failed to delete engagement with ID: ' . $id . '. Error: ' . $e->getMessage());
            try { DB::statement('SET FOREIGN_KEY_CHECKS=1;'); } catch (\Exception $dbException) { Log::error('Failed to re-enable FK checks on error: ' . $dbException->getMessage()); }
            return response()->json(['failed' => 'process shut down'], 400); // Mimicking response
        }
    }

    /**
     * Display the specified resource.
     * Mirrors ProgrammeController show. Uses 'ID' for lookup. Eager loads 'programme'.
     */
    public function show(string $id): JsonResponse
    {
        try {
            // Find using 'ID' column (case sensitive)
            $engagement = Engagement::where('ID', $id)->first();

            if (!$engagement) {
                 // Mimicking 500 response on not found
                return response()->json(['message' => 'Erreur lors de la récupération de l\'engagement.'], 500);
            }

            // Load the relationship after finding
             $engagement->load('programme');

             return response()->json(['engagement' => $engagement], 200); // Return under 'engagement' key

        } catch (\Exception $e) {
            Log::error('Error fetching engagement ID ' . $id . ': ' . $e->getMessage());
            return response()->json(['failed' => 'Erreur serveur lors de la récupération de l\'engagement'], 500);
        }
    }

    /**
     * Store a newly created resource in storage.
     * Mirrors ProgrammeController store. Uses EXACT frontend key casing.
     */
    public function store(Request $request): JsonResponse
    {
        // Validate using the EXACT keys expected from the frontend
        $validatedData = $request->validate([
            'Code_Engag' => 'required|string|max:255|unique:engagement,Code_Engag', // Use exact case + unique on DB column
            'Description' => 'required|string|max:65535',
            'Cout' => 'required|numeric|min:0', // Validate numeric fields
            'Montant_CRO' => 'required|numeric|min:0',
            'Montant_Hors_CRO' => 'required|numeric|min:0',
            'Rang' => 'required|string|max:255', // Or numeric if Rang is number
            // Validate that the value passed as 'Programme' exists in the 'programme' table's 'Code_Programme' column
            'Programme' => ['required', 'string', Rule::exists('programme', 'Code_Programme')],
        ]);

        // Mimic the pattern of using $request->all() AFTER validation
        // WARNING: Ensure ALL keys EXACTLY match the case in the Engagement model's $fillable array.
        $data = $request->all();

        try {
            // Assumes Engagement model's $fillable matches the EXACT casing in $data
            Engagement::create($data);
            // Mimic ProgrammeController's success response structure/code
            return response()->json(['message' => 'Engagement créé avec succès.'], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
             return response()->json(['errors' => $e->errors()], 422);
        } catch (\Exception $e) {
             Log::error('Failed to store engagement: ' . $e->getMessage());
             // Mimic ProgrammeController's error response structure/code
             return response()->json(['message' => 'Erreur lors de la création de l\'engagement.'], 500);
        }
    }

    /**
     * Update the specified resource in storage.
     * Mirrors ProgrammeController update. Uses EXACT frontend key casing.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        // Validate using the EXACT keys expected from the frontend
        $data = $request->validate([
             // Ensure unique Code_Engag, ignoring the current engagement's ID
             'Code_Engag' => [
                'required',
                'string',
                'max:255',
                 // Check unique on DB column 'Code_Engag', ignore based on primary key 'ID'
                 Rule::unique('engagement', 'Code_Engag')->ignore($id, 'ID')
            ],
            'Description' => 'required|string|max:65535',
            'Cout' => 'required|numeric|min:0',
            'Montant_CRO' => 'required|numeric|min:0',
            'Montant_Hors_CRO' => 'required|numeric|min:0',
            'Rang' => 'required|string|max:255', // Or numeric
             // Validate that the value passed as 'Programme' exists in the 'programme' table's 'Code_Programme' column
             'Programme' => ['required', 'string', Rule::exists('programme', 'Code_Programme')],
        ]);

        // Using validated $data which has the correct frontend casing.

        try {
            // Find model using 'ID' column first to check existence
             $engagement = Engagement::where('ID', $id)->first();

             DB::statement('SET FOREIGN_KEY_CHECKS=0;'); // Replicating pattern

             if (!$engagement) {
                 DB::statement('SET FOREIGN_KEY_CHECKS=1;');
                 // Mimicking "user not found" response structure/code
                 return response()->json(['failed' => 'user not found'], 404);
             }

            // Use where()->update() as requested, using validated $data
            // Assumes $fillable in Engagement model matches EXACT casing of keys in $data
            $updated = Engagement::where('ID', $id)->update($data);

            DB::statement('SET FOREIGN_KEY_CHECKS=1;');

            if ($updated) {
                 // Mimicking success response
                return response()->json(['success' => 'done done'], 200);
            } else {
                 // Mimicking failure response structure/code
                 return response()->json(['failed' => 'user not found'], 404);
            }
        } catch (\Illuminate\Validation\ValidationException $e) {
             return response()->json(['errors' => $e->errors()], 422);
        } catch (\Exception $e) {
             Log::error('Failed to update engagement with ID: ' . $id . '. Error: ' . $e->getMessage());
             try { DB::statement('SET FOREIGN_KEY_CHECKS=1;'); } catch (\Exception $dbException) { Log::error('Failed to re-enable FK checks on error: ' . $dbException->getMessage()); }
             // Mimicking error response structure/code
             return response()->json(['failed' => 'process shut down'], 404);
        }
    }
}