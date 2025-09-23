<?php

namespace App\Http\Controllers;

use App\Models\Province; // Your Province model
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator; // For explicit validation if needed outside $request->validate()
use Illuminate\Validation\Rule; // For unique validation rule
use Illuminate\Database\Eloquent\ModelNotFoundException; // For try-catch
use Illuminate\Database\QueryException; // For try-catch on DB errors

class ProvinceController extends Controller
{
    /**
     * Display a listing of the resource.
     * GET /api/provinces
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function index(): JsonResponse
    {
        try {
            $provinces = Province::orderBy('Description', 'asc')->get();
            return response()->json(['provinces' => $provinces]); // Common to nest under a key
        } catch (\Exception $e) {
            Log::error('Error fetching provinces: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return response()->json(['message' => 'Erreur serveur lors de la récupération des provinces.'], 500);
        }
    }

    /**
     * Get provinces formatted for dropdowns.
     * GET /api/options/provinces
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function getOptions(Request $request): JsonResponse
    {
        Log::info("API: Fetching Province options for dropdown.");
        try {
            // Ensure 'Id', 'Description', and 'Code' match your Province model's actual column names
            // If your primary key is 'id' (lowercase), use 'id' instead of 'Id'.
            $provinces = Province::orderBy('Description')
                                 ->get(['Id', 'Description', 'Code']); // Select only necessary columns

            $options = $provinces->map(function ($province) {
                $label = $province->Description; // Prioritize Description
                if (empty($label) && !empty($province->Code)) {
                    $label = $province->Code; // Fallback to Code
                } elseif (empty($label)) {
                    $label = "Province ID: {$province->Id}"; // Ultimate fallback
                }

                // Optional: Combine Code and Description if both exist and you prefer that format
                // if (!empty($province->Code) && !empty($province->Description)) {
                //    $label = $province->Code . ' - ' . $province->Description;
                // }

                return ['value' => $province->Id, 'label' => $label];
            });

            Log::info("API: Returning " . $options->count() . " Province options.");
            return response()->json($options); // Return the array of {value, label} directly
        } catch (\Exception $e) {
            Log::error('Error fetching Province options: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return response()->json(['message' => 'Erreur serveur lors du chargement des options de provinces.'], 500);
        }
    }

    /**
     * Store a newly created resource in storage.
     * POST /api/provinces
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function store(Request $request): JsonResponse
    {
        try {
            // Validate the incoming request data
            // Adjust max lengths and rules as per your database schema and requirements
            $validatedData = $request->validate([
                'Code' => 'required|string|max:50|unique:province,Code', // Assuming 'province' is the table name
                'Description' => 'required|string|max:255',
                'Description_Arr' => 'nullable|string|max:255',
            ]);

            // Create the province using only validated data for security
            $province = Province::create($validatedData);

            // Return the newly created resource with a 201 status code
            return response()->json($province, 201);

        } catch (\Illuminate\Validation\ValidationException $e) {
            // Laravel's $request->validate() automatically throws this and returns a 422 response.
            // This catch block is more for explicit Validator::make() usage, but good to be aware.
            Log::warning('Validation failed for creating province: ', $e->errors());
            return response()->json(['message' => 'Les données fournies étaient invalides.', 'errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            Log::error('Error creating province: ' . $e->getMessage(), ['data' => $request->all(), 'trace' => $e->getTraceAsString()]);
            return response()->json(['message' => 'Erreur serveur lors de la création de la province.'], 500);
        }
    }

    /**
     * Display the specified resource.
     * GET /api/provinces/{id}  (or /provinces/{province} if using route model binding)
     *
     * @param  string  $id  // Or `Province $province` if using Route Model Binding
     * @return \Illuminate\Http\JsonResponse
     */
    public function show(string $id): JsonResponse // Consider Route Model Binding: public function show(Province $province)
    {
        try {
            // If not using Route Model Binding, find by ID or fail with 404
            // Ensure 'Id' matches your primary key column name in the Province model
            $province = Province::findOrFail($id);
            // If using Route Model Binding, $province is already injected and resolved.

            return response()->json($province);

        } catch (ModelNotFoundException $e) {
            return response()->json(['message' => 'Province non trouvée.'], 404);
        } catch (\Exception $e) {
            Log::error("Error fetching province with ID {$id}: " . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return response()->json(['message' => 'Erreur serveur lors de la récupération de la province.'], 500);
        }
    }

    /**
     * Update the specified resource in storage.
     * PUT /api/provinces/{id} (or /provinces/{province})
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  string  $id // Or `Province $province`
     * @return \Illuminate\Http\JsonResponse
     */
    public function update(Request $request, string $id): JsonResponse // Consider: public function update(Request $request, Province $province)
    {
        try {
            // Find the province or fail with 404
            $province = Province::findOrFail($id); // Ensure 'Id' is your PK

            // Validate the incoming request data
            $validatedData = $request->validate([
                'Code' => [
                    'required',
                    'string',
                    'max:50',
                    Rule::unique('province', 'Code')->ignore($province->Id, 'Id') // Use the model's PK column name for ignore
                ],
                'Description' => 'required|string|max:255',
                'Description_Arr' => 'nullable|string|max:255',
            ]);

            // Update the province with validated data
            $province->update($validatedData);

            // Return the updated resource
            return response()->json($province->fresh()); // fresh() reloads from DB

        } catch (ModelNotFoundException $e) {
            return response()->json(['message' => 'Province non trouvée pour la mise à jour.'], 404);
        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::warning("Validation failed for updating province ID {$id}: ", $e->errors());
            return response()->json(['message' => 'Les données fournies étaient invalides.', 'errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            Log::error("Error updating province ID {$id}: " . $e->getMessage(), ['data' => $request->all(), 'trace' => $e->getTraceAsString()]);
            return response()->json(['message' => 'Erreur serveur lors de la mise à jour de la province.'], 500);
        }
    }

    /**
     * Remove the specified resource from storage.
     * DELETE /api/provinces/{id} (or /provinces/{province})
     *
     * @param  string  $id // Or `Province $province`
     * @return \Illuminate\Http\JsonResponse
     */
    public function destroy(string $id): JsonResponse // Consider: public function destroy(Province $province)
    {
        try {
            $province = Province::findOrFail($id); // Ensure 'Id' is your PK
            $province->delete();

            // Return a 204 No Content response on successful deletion
            return response()->json(null, 204);

        } catch (ModelNotFoundException $e) {
            return response()->json(['message' => 'Province non trouvée pour suppression.'], 404);
        } catch (QueryException $qe) {
            Log::error("Database error deleting province ID {$id}: " . $qe->getMessage(), ['trace' => $qe->getTraceAsString()]);
            // Check for foreign key constraint violation (error code/message can vary by database)
            // Common SQLSTATE for FK violation is '23000' or messages containing 'CONSTRAINT'
            if (str_contains($qe->getMessage(), 'constraint violation') || $qe->getCode() == '23000') {
                return response()->json(['message' => 'Impossible de supprimer cette province, elle est référencée par d\'autres enregistrements.'], 409); // 409 Conflict
            }
            return response()->json(['message' => 'Erreur base de données lors de la suppression de la province.'], 500);
        } catch (\Exception $e) {
            Log::error("Error deleting province ID {$id}: " . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return response()->json(['message' => 'Erreur serveur lors de la suppression de la province.'], 500);
        }
    }
}