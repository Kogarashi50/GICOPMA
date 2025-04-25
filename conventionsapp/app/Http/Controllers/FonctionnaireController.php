<?php

namespace App\Http\Controllers;

use App\Models\Fonctionnaire; // Import the model
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB; // <--- ADD THIS LINE


use Exception;


class FonctionnaireController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        //
    }

    public function indexForDropdown()
{
    try {
        // Combine 'prenom' and 'nom' in the database query
        // Use COALESCE to handle potential NULL values gracefully
        // Use TRIM to remove extra spaces if one part is missing
        $fonctionnaires = Fonctionnaire::select(
                                        'id',
                                        DB::raw("TRIM(CONCAT(COALESCE(prenom, ''), ' ', COALESCE(nom, ''))) as nom_complet") // Creates the combined field
                                    )
                                    // Order by the combined name (most databases support ordering by alias)
                                    // If this causes errors, you might need to order by individual fields: ->orderBy('nom')->orderBy('prenom')
                                    ->orderBy(DB::raw("TRIM(CONCAT(COALESCE(prenom, ''), ' ', COALESCE(nom, '')))"))
                                    ->get();

        // The result will be a collection of objects, each having 'id' and 'nom_complet'
        return response()->json(['fonctionnaires' => $fonctionnaires]);

    } catch (Exception $e) {
        Log::error("Error fetching fonctionnaires for dropdown: " . $e->getMessage());
        return response()->json(['message' => 'Erreur lors de la récupération des fonctionnaires.'], 500);
    }
}
    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        //
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        //
    }
}
