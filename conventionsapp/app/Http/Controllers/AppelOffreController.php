<?php

namespace App\Http\Controllers;

use App\Models\AppelOffre;
// use App\Models\Province; // Only needed if directly used, not just for $this->allowedProvinces
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
// use Illuminate\Support\Facades\DB; // Not directly used in these methods
use Illuminate\Validation\Rule;
use Exception; // More specific exceptions like ModelNotFoundException are better
use Illuminate\Database\Eloquent\ModelNotFoundException; // Explicitly import
// use Illuminate\Support\Arr; // Not used in this version

class AppelOffreController extends Controller
{
    protected $allowedProvinces;

    public function __construct()
    {
        $this->allowedProvinces = [
            'Berkane', 'Driouch', 'Figuig', 'Guercif', 'Jerada',
            'Nador', 'Oujda-Angad', 'Taourirt'
        ];
        // Option 2: Fetch from Province table if this list needs to be dynamic
        // $this->allowedProvinces = \App\Models\Province::pluck('Description')->toArray();
    }

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $query = AppelOffre::orderBy('created_at', 'desc'); // Consider ordering by 'numero' or 'intitule'

            if ($request->has('province') && !empty($request->query('province'))) {
                $provinceFilter = $request->query('province');
                // It's better to validate against the dynamic list if you switch to fetching from DB
                if (in_array($provinceFilter, $this->allowedProvinces)) {
                    $query->whereJsonContains('provinces', $provinceFilter);
                } else {
                    Log::warning("Attempted to filter appels d'offres by invalid province: " . $provinceFilter);
                    // Optionally, you might want to return an empty set or ignore the filter
                }
            }
            $appelOffres = $query->get();
            // Consistent response: Nest under a key if other index methods do, otherwise direct array is fine.
            return response()->json(['appel_offres' => $appelOffres]);

        } catch (Exception $e) { // Consider more specific exceptions
            Log::error('Error fetching appels d\'offres: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return response()->json(['message' => 'Erreur serveur lors de la récupération des appels d\'offres.'], 500);
        }
    }

    // *******************************************************************
    // *************   NEW METHOD TO ADD   *******************************
    // *******************************************************************
    /**
     * Get appel d'offres formatted for dropdowns.
     * GET /api/options/appel-offres
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function getOptions(Request $request): JsonResponse
    {
        Log::info("API: Fetching Appel d'Offre options for dropdown.");
        try {
            // Ensure 'id', 'numero', 'intitule' match your AppelOffre model's actual column names.
            // If your primary key is different, use that for 'value'.
            $appelOffres = AppelOffre::orderBy('intitule') // Or 'numero'
                                   ->get(['id', 'numero', 'intitule']); // Select necessary columns

            $options = $appelOffres->map(function ($ao) {
                $label = $ao->intitule;
                if (empty($label)) {
                    $label = !empty($ao->numero) ? $ao->numero : "Appel d'Offre ID: {$ao->id}";
                }

                // Prepend numero if both numero and intitule exist
                if (!empty($ao->numero) && !empty($ao->intitule)) {
                   $label = $ao->numero . ' - ' . $ao->intitule;
                } elseif (empty($ao->intitule) && !empty($ao->numero)) {
                    // If only numero exists, it's already set as label or will be
                }
                return ['value' => $ao->id, 'label' => $label];
            });

            Log::info("API: Returning " . $options->count() . " Appel d'Offre options.");
            return response()->json($options); // Return the array of {value, label} directly
        } catch (\Exception $e) {
            Log::error('Error fetching Appel d\'Offre options: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return response()->json(['message' => 'Erreur serveur lors du chargement des options d\'appels d\'offres.'], 500);
        }
    }
    // *******************************************************************
    // *******************************************************************


    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $validatedData = $request->validate([
                'categorie' => ['required', Rule::in(['Travaux', 'Etudes', 'Services', 'Fournitures'])],
                'provinces' => 'nullable|array',
                'provinces.*' => ['required_with:provinces', 'string', Rule::in($this->allowedProvinces)], // Only validate items if provinces array is not null
                'numero' => 'required|string|max:255|unique:appel_offre,numero', // Ensure max length
                'intitule' => 'required|string|max:65535', // TEXT usually doesn't need max, but good for VARCHAR
                'estimation' => 'nullable|numeric|min:0',
                'estimation_HT' => 'required|numeric|min:0',
                'montant_TVA' => 'required|numeric|min:0',
                'duree_execution' => 'nullable|integer|min:0',
                'date_verification' => 'nullable|date_format:Y-m-d',
                'id_fonctionnaire'=>'nullable|string', // Consider if this should be an integer FK
                'date_ouverture' => 'nullable|date_format:Y-m-d',
                'last_session_op' => 'nullable|date_format:Y-m-d',
                'date_publication' => 'nullable|date_format:Y-m-d',
                'lancement_portail' => 'nullable|boolean',
                'date_lancement_portail' => 'nullable|date_format:Y-m-d|required_if:lancement_portail,true',
            ]);

            // Ensure 'lancement_portail' is explicitly boolean, default false if not present
            $validatedData['lancement_portail'] = $request->boolean('lancement_portail');

            // Handle provinces array: if it's sent as empty or just null, store null.
            if (isset($validatedData['provinces']) && is_array($validatedData['provinces'])) {
                $validatedData['provinces'] = array_filter($validatedData['provinces']); // Remove empty values
                if (empty($validatedData['provinces'])) {
                    $validatedData['provinces'] = null;
                }
            } else {
                $validatedData['provinces'] = null; // Ensure it's null if not provided or not an array
            }


            $appelOffre = AppelOffre::create($validatedData);
            Log::info('Appel d\'offre created successfully: ID ' . $appelOffre->id); // Assumes PK is 'id'
            return response()->json(['message' => 'Appel d\'offre créé avec succès.', 'appel_offre' => $appelOffre], 201);

        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::warning('Validation failed for creating appel d\'offre: ', $e->errors());
            return response()->json(['message' => 'Les données fournies étaient invalides.', 'errors' => $e->errors()], 422);
        } catch (Exception $e) {
            Log::error('Error creating appel d\'offre: ' . $e->getMessage(), ['data' => $request->all(), 'trace' => $e->getTraceAsString()]);
            return response()->json(['message' => 'Erreur serveur lors de la création de l\'appel d\'offre.'], 500);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id): JsonResponse
    {
        try {
            $appelOffre = AppelOffre::findOrFail($id); // Assumes PK is 'id'
            return response()->json($appelOffre); // Return model directly or nest: ['appel_offre' => $appelOffre]
        } catch (ModelNotFoundException $e) {
             Log::warning('Appel d\'offre not found with ID: ' . $id);
             return response()->json(['message' => 'Appel d\'offre non trouvé.'], 404);
        } catch (Exception $e) {
            Log::error('Error fetching appel d\'offre ID ' . $id . ': ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return response()->json(['message' => 'Erreur serveur lors de la récupération de l\'appel d\'offre.'], 500);
        }
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        try {
            $appelOffre = AppelOffre::findOrFail($id); // Assumes PK is 'id'

            $validatedData = $request->validate([
                'categorie' => ['required', Rule::in(['Travaux', 'Etudes', 'Services', 'Fournitures'])],
                'provinces' => 'nullable|array',
                'provinces.*' => ['required_with:provinces', 'string', Rule::in($this->allowedProvinces)],
                'numero' => ['required', 'string', 'max:255', Rule::unique('appel_offre', 'numero')->ignore($appelOffre->id)],
                'intitule' => 'required|string|max:65535',
                'estimation' => 'nullable|numeric|min:0',
                'estimation_HT' => 'required|numeric|min:0',
                'montant_TVA' => 'required|numeric|min:0',
                'duree_execution' => 'nullable|integer|min:0',
                'date_verification' => 'nullable|date_format:Y-m-d',
                'date_ouverture' => 'nullable|date_format:Y-m-d',
                'id_fonctionnaire'=>'nullable|string',
                'last_session_op' => 'nullable|date_format:Y-m-d',
                'date_publication' => 'nullable|date_format:Y-m-d',
                'lancement_portail' => 'nullable|boolean',
                'date_lancement_portail' => 'nullable|date_format:Y-m-d|required_if:lancement_portail,true',
            ]);

            $validatedData['lancement_portail'] = $request->boolean('lancement_portail', $appelOffre->lancement_portail); // Keep existing if not provided
            if (isset($validatedData['provinces']) && is_array($validatedData['provinces'])) {
                 $validatedData['provinces'] = array_filter($validatedData['provinces']);
                  if (empty($validatedData['provinces'])) { $validatedData['provinces'] = null; }
             } elseif ($request->exists('provinces') && $request->input('provinces') === null) { // Handle explicit null to clear
                $validatedData['provinces'] = null;
             } else {
                // If 'provinces' key is not in request, don't change it from the model's current value.
                // To achieve this, remove it from $validatedData if not present in $request.
                if (!$request->exists('provinces')) {
                    unset($validatedData['provinces']);
                }
             }


            $appelOffre->update($validatedData);
            Log::info('Appel d\'offre updated successfully: ID ' . $appelOffre->id);
            return response()->json(['message' => 'Appel d\'offre mis à jour avec succès.', 'appel_offre' => $appelOffre->fresh()], 200);

        } catch (ModelNotFoundException $e) {
            Log::warning('Appel d\'offre not found for update with ID: ' . $id);
            return response()->json(['message' => 'Appel d\'offre non trouvé.'], 404);
        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::warning('Validation failed during update for Appel d\'offre ID ' . $id . ': ', $e->errors());
            return response()->json(['message' => 'Les données fournies étaient invalides.', 'errors' => $e->errors()], 422);
        } catch (Exception $e) {
            Log::error('Error updating appel d\'offre ID ' . $id . ': ' . $e->getMessage(), ['data' => $request->all(), 'trace' => $e->getTraceAsString()]);
            return response()->json(['message' => 'Erreur serveur lors de la mise à jour de l\'appel d\'offre.'], 500);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id): JsonResponse
    {
        try {
            $appelOffre = AppelOffre::findOrFail($id); // Assumes PK is 'id'
            $appelOffre->delete();
            Log::info('Appel d\'offre deleted successfully: ID ' . $id);
            return response()->json(null, 204); // Standard 204 No Content
        } catch (ModelNotFoundException $e) {
             Log::warning('Appel d\'offre not found for deletion with ID: ' . $id);
             return response()->json(['message' => 'Appel d\'offre non trouvé.'], 404);
        } catch (QueryException $qe) { // Catch specific database errors
             Log::error('Database error deleting appel d\'offre ID ' . $id . ': ' . $qe->getMessage(), ['sql_code' => $qe->getCode()]);
             // Check for foreign key constraint violation (error code/message can vary by database)
             if (str_contains($qe->getMessage(), 'constraint violation') || $qe->getCode() == '23000' || ($qe->errorInfo[1] ?? null) == 1451) {
                return response()->json(['message' => 'Impossible de supprimer cet appel d\'offre car il est lié à d\'autres enregistrements.'], 409); // 409 Conflict
             }
             return response()->json(['message' => 'Erreur base de données lors de la suppression.'], 500);
         } catch (Exception $e) {
            Log::error('Error deleting appel d\'offre ID ' . $id . ': ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return response()->json(['message' => 'Erreur serveur lors de la suppression de l\'appel d\'offre.'], 500);
        }
    }
}