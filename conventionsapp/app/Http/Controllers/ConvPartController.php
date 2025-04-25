<?php

namespace App\Http\Controllers;

use App\Models\ConvPart; // <<< Import the Model
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log; // <<< Import Log
use Illuminate\Support\Str; 
use Illuminate\Support\Facades\Validator; // Import Validator
use Illuminate\Validation\ValidationException;
use App\Models\Convention;
use Illuminate\Http\JsonResponse;
use App\Models\VersementCP; // <<<--- ADD this line to import the VersementCP model

class ConvPartController extends Controller
{
    /**
     * Display a listing of the resource.
     * Potentially filtered and paginated.
     */
    public function index(Request $request)
    {
        try {
            // Eager load relationships needed for the general list display
            $query = ConvPart::with(['partenaire:Id,Description', 'convention:id,code,intitule']) // Load necessary fields
                       ->orderBy('Id_CP', 'desc'); // Order as needed for display

            // --- Filtering Logic (Keep if needed for general list view) ---
            if ($request->has('convention_id') && is_numeric($request->input('convention_id'))) {
                $query->where('Id_Convention', $request->input('convention_id'));
            }
            // Add other filters for the main list view if necessary...

            // --- Pagination for the main list view ---
            $perPage = $request->input('per_page', 15);
            $convparts = $query->paginate($perPage);

            // Return standard paginated response
            return response()->json($convparts, 200);

        } catch (\Exception $e) {
            Log::error('Error fetching ConvPart records (index): ' . $e->getMessage());
            return response()->json(['message' => 'Erreur lors de la récupération des engagements.'], 500);
        }
    }

    /**
     * Fetch and format ConvPart records specifically for dropdown options.
     * Returns ALL records (or filtered subset if needed) without pagination.
     * Includes fields required by VersementForm: value (Id_CP), label, montant_convenu.
     *
     * Handles GET requests to /api/convparts/options (or similar route)
     */
    public function getOptions(Request $request)
    {
        Log::info("Fetching ConvPart options for dropdown (including related details)...");
        try {
            // Eager load convention (code, intitule) AND partenaire (Description)
            // Select only necessary fields from each related table
            $query = ConvPart::with([
                            'convention:id,code,intitule',
                            'partenaire:Id,Description' // Adjust field if needed (e.g., code_partenaire)
                       ])
                       ->select(['Id_CP', 'Id_Convention', 'Id_Partenaire', 'Montant_Convenu'])
                       ->orderBy('Id_CP', 'asc'); // Or order as desired

            $convparts = $query->get();

            // Map to the format expected by react-select
            $options = $convparts->map(function ($cp) {
                // Create a primary label for the dropdown selection itself
                $label = 'Engagement ID: ' . $cp->Id_CP;
                if ($cp->convention) {
                    $label .= ' (Conv: ' . $cp->convention->code . ')';
                }
                 if ($cp->partenaire) {
                    $label .= ' - P: ' . Str::limit($cp->partenaire->Description, 30, '...');
                 }

                // --- Data to pass along with the selected option ---
                $conventionInfo = null;
                if ($cp->convention) {
                    $conventionInfo = [
                        'code' => $cp->convention->code,
                        'intitule' => $cp->convention->intitule,
                    ];
                }
                $partenaireInfo = null;
                if ($cp->partenaire) {
                    $partenaireInfo = [
                        'description' => $cp->partenaire->Description,
                        // 'code' => $cp->partenaire->code_partenaire, // Add if you have a partner code
                    ];
                }

                return [
                    'value' => $cp->Id_CP,
                    'label' => $label,                   // Label for the dropdown list item
                    'montant_convenu' => $cp->Montant_Convenu, // Needed for validation
                    'convention' => $conventionInfo,     // Nested convention data
                    'partenaire' => $partenaireInfo,     // Nested partenaire data
                ];
            });

            Log::info("Returning " . $options->count() . " ConvPart options with details.");
            // Return nested under 'options' key
            return response()->json(['options' => $options], 200);

        } catch (\Exception $e) {
            Log::error('Error fetching ConvPart options: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return response()->json(['message' => 'Erreur chargement options engagements.'], 500);
        }
    }

    public function getCommitmentsForConvention(Request $request, $convention_id): JsonResponse
    {
        // Optional: Validate convention_id exists if not using route model binding here
         $validator = Validator::make(['convention_id' => $convention_id], [
             'convention_id' => 'required|integer|exists:convention,id'
         ]);
         if ($validator->fails()) {
             return response()->json(['message' => 'ID Convention invalide.'], 404);
         }


        Log::info("API: Fetching commitment details for Convention ID: {$convention_id}");

        try {
            $commitments = ConvPart::where('Id_Convention', $convention_id)
                            ->with('partenaire:Id,Description,Description_Arr') // Eager load partner name/ID
                            ->withSum('versements as total_verse', 'montant_verse') // Calculate sum, alias as total_verse
                            ->whereHas('partenaire') // Ensure the partner exists
                            ->get([ // Select specific columns needed
                                'Id_CP',
                                'Id_Convention',
                                'Id_Partenaire',
                                'Montant_Convenu',
                                // 'is_signatory', // Add other fields if needed by frontend logic later
                                // 'date_signature'
                            ]);

            Log::info("API: Found " . $commitments->count() . " commitments for Convention {$convention_id}.");

            // Return the collection of commitment objects
            // Each object will have: Id_CP, Id_Convention, Id_Partenaire, Montant_Convenu, total_verse (sum), and a nested 'partenaire' object.
            return response()->json($commitments, 200);

        } catch (\Exception $e) {
            Log::error("Error fetching commitment details for Convention {$convention_id}: " . $e->getMessage());
            return response()->json(['message' => 'Erreur chargement des détails des engagements.'], 500);
        }
    }

    public function lookupDetails(Request $request): JsonResponse // Added return type hint
    {
        Log::info("Looking up ConvPart details by Convention/Partenaire IDs...");

        // Validate input query parameters
        $validator = Validator::make($request->query(), [
            'convention_id' => 'required|integer|exists:convention,id', // Ensure convention exists
            'partenaire_id' => 'required|integer|exists:partenaire,Id', // Ensure partner exists
        ]);

        if ($validator->fails()) {
             Log::warning('ConvPart lookup validation failed:', $validator->errors()->toArray());
             // Throw ValidationException to return standard 422 response
             throw new ValidationException($validator);
        }

        $validated = $validator->validated();
        $conventionId = $validated['convention_id'];
        $partenaireId = $validated['partenaire_id'];

        Log::debug("Lookup Params: Convention={$conventionId}, Partenaire={$partenaireId}");

        try {
            // Find the specific engagement record matching the pair
            $convPart = ConvPart::where('Id_Convention', $conventionId)
                            ->where('Id_Partenaire', $partenaireId)
                            // Select specific fields initially, but we need the object for the sum
                            // ->select(['Id_CP', 'Montant_Convenu'])
                            ->first(); // Use first() as there should only be one

            if (!$convPart) {
                Log::warning("No ConvPart found for Convention={$conventionId}, Partenaire={$partenaireId}");
                return response()->json(['message' => 'Aucun engagement trouvé pour cette combinaison Convention/Partenaire.'], 404); // Not Found
            }

            Log::info("Found ConvPart details: Id_CP={$convPart->Id_CP}");

            // *** <<< ADDED: Calculate total paid for this commitment >>> ***
            $totalPaid = VersementCP::where('id_CP', $convPart->Id_CP)->sum('montant_verse');
            Log::debug("Total paid calculated for Id_CP={$convPart->Id_CP}: {$totalPaid}");
            // *** <<< END ADDED CALCULATION >>> ***


            // Return the found details including the total paid amount
            return response()->json([
                'id_cp'            => $convPart->Id_CP,             // Frontend expects 'id_cp'
                'montant_convenu'  => $convPart->Montant_Convenu,   // Frontend expects 'montant_convenu'
                'total_deja_verse' => $totalPaid ?? 0.0,          // <<< ADDED: Frontend expects 'total_deja_verse'
            ], 200);

        } catch (\Exception $e) {
             Log::error("Error during ConvPart lookup: " . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
             return response()->json(['message' => 'Erreur serveur lors de la recherche de l\'engagement.'], 500);
        }
    }

    /**
     * Show the form for creating a new resource.
     * (Not typically used in APIs)
     */
    public function create()
    {
        // Usually empty for APIs
    }

    /**
     * Store a newly created resource in storage.
     * (Currently handled by ConventionController)
     */
    public function store(Request $request)
    {
        // Logic would go here IF managing ConvPart individually via POST /engageparts
        return response()->json(['message' => 'Not implemented. Handled via ConventionController.'], 501); // 501 Not Implemented
    }

    /**
     * Display the specified resource.
     * (Currently handled by ConventionController@show embedding the data)
     */
    public function show(string $id) // $id would be Id_CP
    {
        Log::info("Fetching single ConvPart ID: {$id}");
        try {
             // Eager load relations needed when viewing a single ConvPart
             $convpart = ConvPart::with(['partenaire', 'convention', 'avenant', 'versements']) // Load more details potentially
                               ->findOrFail($id); // Use findOrFail to trigger 404 if not found

             // Return the single resource, usually not nested under a key
             return response()->json($convpart, 200);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            Log::warning("ConvPart ID {$id} not found (show).");
            // Return the specific "Engagement non trouvé" message for 404
            return response()->json(['message' => 'Engagement non trouvé.'], 404);
        } catch (\Exception $e) {
            Log::error("Error fetching ConvPart ID {$id} (show): " . $e->getMessage());
            return response()->json(['message' => 'Erreur lors de la récupération de l\'engagement.'], 500);
        }
    }

    /**
     * Show the form for editing the specified resource.
     * (Not typically used in APIs)
     */
    public function edit(string $id)
    {
        // Usually empty for APIs
    }

    /**
     * Update the specified resource in storage.
     * (Currently handled by ConventionController)
     */
    public function update(Request $request, string $id) // $id would be Id_CP
    {
        // Logic would go here IF managing ConvPart individually via PUT/PATCH /engageparts/{id}
        return response()->json(['message' => 'Not implemented. Handled via ConventionController.'], 501); // 501 Not Implemented
    }

    /**
     * Remove the specified resource from storage.
     * (Currently handled by ConventionController)
     */
    public function destroy(string $id) // $id would be Id_CP
    {
        // Logic would go here IF managing ConvPart individually via DELETE /engageparts/{id}
        return response()->json(['message' => 'Not implemented. Handled via ConventionController.'], 501); // 501 Not Implemented
    }
}