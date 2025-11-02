<?php

namespace App\Http\Controllers;

use App\Models\AlertType;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use Spatie\Permission\Models\Permission;

class AlertTypeController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(): JsonResponse
    {
        try {
            $alertTypes = AlertType::orderBy('name')->get();
            return response()->json(['alert_types' => $alertTypes]);
        } catch (\Exception $e) {
            Log::error("Error fetching alert types: " . $e->getMessage());
            return response()->json(['message' => 'Erreur serveur.'], 500);
        }
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $validatedData = $request->validate([
                'name' => 'required|string|max:255|unique:alert_types,name',
                'description' => 'required|string',
                'permission_name' => ['required', 'string', Rule::exists('permissions', 'name')->where('guard_name', 'sanctum')],
            ]);

            $alertType = AlertType::create($validatedData);

            return response()->json(['message' => 'Type d\'alerte créé avec succès.', 'alert_type' => $alertType], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['message' => 'Données invalides.', 'errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            Log::error("Error storing alert type: " . $e->getMessage());
            return response()->json(['message' => 'Erreur serveur.'], 500);
        }
    }
    
    /**
     * Display the specified resource.
     */
    public function show(AlertType $alertType): JsonResponse
    {
        return response()->json(['alert_type' => $alertType]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, AlertType $alertType): JsonResponse
    {
        try {
            $validatedData = $request->validate([
                'name' => ['required', 'string', 'max:255', Rule::unique('alert_types')->ignore($alertType->id)],
                'description' => 'required|string',
                'permission_name' => ['required', 'string', Rule::exists('permissions', 'name')->where('guard_name', 'sanctum')],
            ]);

            $alertType->update($validatedData);

            return response()->json(['message' => 'Type d\'alerte mis à jour.', 'alert_type' => $alertType]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['message' => 'Données invalides.', 'errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            Log::error("Error updating alert type: " . $e->getMessage());
            return response()->json(['message' => 'Erreur serveur.'], 500);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(AlertType $alertType): JsonResponse
    {
        try {
            $alertType->delete();
            return response()->json(['message' => 'Type d\'alerte supprimé.']);
        } catch (\Exception $e) {
            Log::error("Error deleting alert type: " . $e->getMessage());
            // Foreign key constraint error check
            if ($e instanceof \Illuminate\Database\QueryException && str_contains($e->getMessage(), '1451')) {
                return response()->json(['message' => 'Impossible de supprimer ce type d\'alerte car il est utilisé par des abonnements ou des alertes existantes.'], 409);
            }
            return response()->json(['message' => 'Erreur serveur.'], 500);
        }
    }
}