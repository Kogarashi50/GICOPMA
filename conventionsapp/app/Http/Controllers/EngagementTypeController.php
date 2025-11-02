<?php

namespace App\Http\Controllers;

use App\Models\EngagementType;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class EngagementTypeController extends Controller
{
    /**
     * Display a listing of the engagement types.
     */
    public function index(): JsonResponse
    {
        Log::info('Fetching all EngagementTypes...');
        try {
            $engagementTypes = EngagementType::active()->orderBy('nom')->get();
            return response()->json($engagementTypes);
        } catch (\Exception $e) {
            Log::error('Error fetching EngagementTypes: ' . $e->getMessage());
            return response()->json(['message' => 'Error fetching engagement types.'], 500);
        }
    }

    /**
     * Get options for dropdowns.
     */
    public function getOptions(): JsonResponse
    {
        Log::info('Fetching EngagementType options...');
        try {
            $options = EngagementType::active()
                ->orderBy('nom')
                ->get()
                ->map(function ($type) {
                    return [
                        'value' => $type->id,
                        'label' => $type->nom,
                        'description' => $type->description
                    ];
                });

            Log::info("API: Returning " . $options->count() . " EngagementType options.");
            return response()->json($options);
        } catch (\Exception $e) {
            Log::error('Error fetching EngagementType options: ' . $e->getMessage());
            return response()->json(['message' => 'Error fetching engagement type options.'], 500);
        }
    }

    /**
     * Store a newly created engagement type in storage.
     */
    public function store(Request $request): JsonResponse
    {
        Log::info('Storing new EngagementType...');
        try {
            $validatedData = $request->validate([
                'nom' => 'required|string|max:255|unique:engagement_types,nom',
                'description' => 'nullable|string',
                'is_active' => 'boolean',
            ]);

            $engagementType = EngagementType::create($validatedData);
            Log::info('EngagementType created: ' . $engagementType->id);
            return response()->json($engagementType, 201);
        } catch (ValidationException $e) {
            Log::error('Validation error storing EngagementType: ' . $e->getMessage(), ['errors' => $e->errors()]);
            return response()->json(['message' => 'Validation failed', 'errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            Log::error('Error storing EngagementType: ' . $e->getMessage());
            return response()->json(['message' => 'Error storing engagement type.'], 500);
        }
    }

    /**
     * Display the specified engagement type.
     */
    public function show(EngagementType $engagementType): JsonResponse
    {
        return response()->json($engagementType);
    }

    /**
     * Update the specified engagement type in storage.
     */
    public function update(Request $request, EngagementType $engagementType): JsonResponse
    {
        Log::info('Updating EngagementType: ' . $engagementType->id);
        try {
            $validatedData = $request->validate([
                'nom' => 'required|string|max:255|unique:engagement_types,nom,' . $engagementType->id,
                'description' => 'nullable|string',
                'is_active' => 'boolean',
            ]);

            $engagementType->update($validatedData);
            Log::info('EngagementType updated: ' . $engagementType->id);
            return response()->json($engagementType);
        } catch (ValidationException $e) {
            Log::error('Validation error updating EngagementType: ' . $e->getMessage(), ['errors' => $e->errors()]);
            return response()->json(['message' => 'Validation failed', 'errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            Log::error('Error updating EngagementType: ' . $e->getMessage());
            return response()->json(['message' => 'Error updating engagement type.'], 500);
        }
    }

    /**
     * Remove the specified engagement type from storage.
     */
    public function destroy(EngagementType $engagementType): JsonResponse
    {
        Log::info('Deleting EngagementType: ' . $engagementType->id);
        try {
            $engagementType->delete();
            Log::info('EngagementType deleted: ' . $engagementType->id);
            return response()->json(['message' => 'Engagement type deleted successfully.']);
        } catch (\Exception $e) {
            Log::error('Error deleting EngagementType: ' . $e->getMessage());
            return response()->json(['message' => 'Error deleting engagement type.'], 500);
        }
    }
}
