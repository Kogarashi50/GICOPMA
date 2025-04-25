<?php

namespace App\Http\Controllers;

use App\Models\EngagementFinancier;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Http\JsonResponse;

class EngagementFinancierController extends Controller
{
    /**
     * Display a listing of the resource.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function index(Request $request): JsonResponse
    {
        // Eager load relationships for efficiency if needed in the frontend list
        $query = EngagementFinancier::with(['projet', 'partenaire']);

        // Optional: Add filtering based on request parameters
        if ($request->has('projet_id')) {
            $query->where('projet_id', $request->input('projet_id'));
        }
        if ($request->has('partenaire_id')) {
            $query->where('partenaire_id', $request->input('partenaire_id'));
        }

        // Optional: Add sorting
        // $query->orderBy('date_engagement', 'desc');

        // Paginate results
        $engagements = $query->paginate($request->input('per_page', 15)); // Default 15 per page

        return response()->json($engagements);
    }

    /**
     * Store a newly created resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'projet_id' => 'required|integer|exists:projet,ID_Projet',
            'partenaire_id' => 'required|integer|exists:partenaire,id',
            'montant_engage' => 'required|numeric|min:0',
            'est_formalise' => 'required|boolean',
            'commentaire' => 'nullable|string',
            'date_engagement' => 'required|date_format:Y-m-d',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $engagement = EngagementFinancier::create($validator->validated());

        // Optionally load relationships for the response
        $engagement->load(['projet', 'partenaire']);

        return response()->json($engagement, 201); // Created
    }

    /**
     * Display the specified resource.
     *
     * @param  int  $id The ID from the route parameter
     * @return \Illuminate\Http\JsonResponse
     */
    public function show(int $id): JsonResponse // Accept integer $id
    {
        // Find the model by ID or fail with a 404 Not Found response
        $engagementFinancier = EngagementFinancier::with(['projet', 'partenaire'])->findOrFail($id);

        // The ->with(...) could also be chained after findOrFail:
        // $engagementFinancier = EngagementFinancier::findOrFail($id);
        // $engagementFinancier->load(['projet', 'partenaire']);

        return response()->json($engagementFinancier);
    }

    /**
     * Update the specified resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  int  $id The ID from the route parameter
     * @return \Illuminate\Http\JsonResponse
     */
    public function update(Request $request, int $id): JsonResponse // Accept integer $id
    {
        // Find the existing model by ID or fail
        $engagementFinancier = EngagementFinancier::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'projet_id' => 'sometimes|required|integer|exists:projet,ID_Projet',
            'partenaire_id' => 'sometimes|required|integer|exists:partenaire,id',
            'montant_engage' => 'sometimes|required|numeric|min:0',
            'est_formalise' => 'sometimes|required|boolean',
            'commentaire' => 'nullable|string',
            'date_engagement' => 'sometimes|required|date_format:Y-m-d',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Update the found model with validated data
        $engagementFinancier->update($validator->validated());

        // Optionally reload relationships if they might have changed indirectly
        // or just load them for the response
        $engagementFinancier->load(['projet', 'partenaire']);

        return response()->json($engagementFinancier);
    }

    /**
     * Remove the specified resource from storage.
     *
     * @param  int  $id The ID from the route parameter
     * @return \Illuminate\Http\JsonResponse
     */
    public function destroy(int $id): JsonResponse // Accept integer $id
    {
        // Find the model by ID or fail
        $engagementFinancier = EngagementFinancier::findOrFail($id);

        // Delete the model
        $engagementFinancier->delete();

        // Return a No Content response
        return response()->json(null, 204);
    }
}