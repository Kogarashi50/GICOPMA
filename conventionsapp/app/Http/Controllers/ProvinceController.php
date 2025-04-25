<?php

namespace App\Http\Controllers;

use App\Models\Province; // Use the Province model
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\JsonResponse;

class ProvinceController extends Controller
{
    /**
     * Display a listing of the resource.
     * Mimics ChantierController index structure.
     */
    public function index(): JsonResponse
    {
        try {
            // No relationships to eager load based on provided schema
            $provinces = Province::orderBy('created_at', 'desc') // Or order by Description/Code
                ->get();
            Log::info('Fetched Provinces Data:', $provinces->toArray());
            return response()->json(['provinces' => $provinces], 200); // Return under 'provinces' key
        } catch (\Exception $e) {
            Log::error('Error fetching provinces: ' . $e->getMessage());
            return response()->json(['failed' => 'Erreur lors de la récupération des provinces'], 500);
        }
    }

    /**
     * Remove the specified resource from storage.
     * Mimics ChantierController destroy structure.
     */
    public function destroy(string $id): JsonResponse
    {
        // Log::info('Attempting to delete province with Id: ' . $id);

        try {
            DB::statement('SET FOREIGN_KEY_CHECKS=0;'); // Replicating pattern
            // Find first to check existence before returning status
            $province = Province::where('Id', $id)->first();
            if (!$province) {
                 DB::statement('SET FOREIGN_KEY_CHECKS=1;'); // Re-enable
                 // Log::warning('Province not found with Id: ' . $id);
                 return response()->json(['failed' => 'non trouve'], 404); // Mimicking "non trouve"
            }
            $deleted = Province::where('Id', $id)->delete();
            DB::statement('SET FOREIGN_KEY_CHECKS=1;'); // Re-enable

            if ($deleted) {
                // Log::info('Province deleted successfully with Id: ' . $id);
                return response()->json(['success' => 'done done'], 200); // Mimicking success response
            } else {
                 // This case is less likely now that we find first
                 // Log::warning('Province deletion returned false for Id: ' . $id);
                return response()->json(['failed' => 'echec suppression'], 400); // Generic failure
            }
        } catch (\Exception $e) {
            // Log::error('Failed to delete province with Id: ' . $id . '. Error: ' . $e->getMessage());
            try { DB::statement('SET FOREIGN_KEY_CHECKS=1;'); } catch (\Exception $dbException) { Log::error('Failed to re-enable FK checks on error: ' . $dbException->getMessage()); }
            return response()->json(['failed' => 'process shut down'], 400); // Mimicking error response
        }
    }

    /**
     * Display the specified resource.
     * Mimics ChantierController show structure.
     */
    public function show(string $id): JsonResponse
    {
        try {
            $province = Province::where('Id', $id)->first();

            // No relationships like 'domaine' to load for Province based on schema

            if (!$province) {
                // Mimicking ChantierController's 500 response on not found (though 404 is standard)
                return response()->json(['message' => 'Erreur lors de la récupération de la province.'], 500);
            }
            return response()->json(['province' => $province], 200); // Return under 'province' key
        } catch (\Exception $e) {
            Log::error('Error fetching province Id ' . $id . ': ' . $e->getMessage());
            return response()->json(['failed' => 'Erreur serveur lors de la récupération de la province'], 500);
        }
    }

    /**
     * Store a newly created resource in storage.
     * Mimics ChantierController store structure including $request->all().
     */
    public function store(Request $request): JsonResponse
    {
        // Validate first (as in ChantierController)
        $validatedData = $request->validate([
            'Code' => 'required|string|max:255|unique:province,Code', // Province fields, add unique rule
            'Description' => 'required|string|max:65535',
            'Description_Arr' => 'nullable|string|max:65535' // Assuming nullable
        ]);

        // Mimic the pattern of using $request->all() AFTER validation
        // WARNING: This bypasses mass assignment protection unless 'Code', 'Description', 'Description_Arr'
        // are explicitly set in the $fillable array in the Province model.
        $data = $request->all();

        try {
            Province::create($data); // Create using potentially unfiltered data
            // Mimic ChantierController's specific success response
             return response()->json(['message' => 'Province créée avec succès.'], 201); // Using ChantierController's success message/status
        } catch (\Illuminate\Validation\ValidationException $e) {
             // This might not be hit if validate() runs first, but good practice
             return response()->json(['errors' => $e->errors()], 422);
        } catch (\Exception $e) {
             // Mimic ChantierController's specific error response
             return response()->json(['message' => 'Erreur lors de la création de la province.'], 500);
        }
    }

    /**
     * Update the specified resource in storage.
     * Mimics ChantierController update structure.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        // Validate first (as in ChantierController)
        $data = $request->validate([
             // Province fields, ensure unique code ignores current ID
             'Code' => [
                'required',
                'string',
                'max:255',
                 \Illuminate\Validation\Rule::unique('province', 'Code')->ignore($id, 'Id') // Check unique ignoring current 'Id'
            ],
            'Description' => 'required|string|max:65535',
            'Description_Arr' => 'nullable|string|max:65535', // Assuming nullable
        ]);

        // NOTE: ChantierController's update used $data (validated), which is safer.
        // This version uses $data (validated) to update.

        try {
            DB::statement('SET FOREIGN_KEY_CHECKS=0;'); // Replicating pattern

            // Find the model first to ensure it exists before update
            $province = Province::where('Id', $id)->first();

            if (!$province) {
                DB::statement('SET FOREIGN_KEY_CHECKS=1;'); // Re-enable
                // Mimicking ChantierController's "user not found" response structure/code
                return response()->json(['failed' => 'user not found'], 404); // Using ChantierController's message/code
            }

            $updated = Province::where('Id', $id)->update($data);

            DB::statement('SET FOREIGN_KEY_CHECKS=1;'); // Re-enable

            if ($updated) {
                 // Mimicking ChantierController's success response
                return response()->json(['success' => 'done done'], 200);
            } else {
                // Update might return 0 if data hasn't changed, or false on failure
                // Mimicking ChantierController's failure response structure/code
                 return response()->json(['failed' => 'user not found'], 404); // Using ChantierController's message/code
            }
        } catch (\Illuminate\Validation\ValidationException $e) {
             return response()->json(['errors' => $e->errors()], 422);
        } catch (\Exception $e) {
             // Log::error('Failed to update province with Id: ' . $id . '. Error: ' . $e->getMessage());
             try { DB::statement('SET FOREIGN_KEY_CHECKS=1;'); } catch (\Exception $dbException) { Log::error('Failed to re-enable FK checks on error: ' . $dbException->getMessage()); }
             // Mimicking ChantierController's error response
             return response()->json(['failed' => 'process shut down'], 404); // Using ChantierController's error code
        }
    }
}