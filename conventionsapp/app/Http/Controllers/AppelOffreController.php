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
use Illuminate\Support\Facades\Storage; // <-- IMPORTER STORAGE
use App\Models\FichierJoint; // <-- IMPORTER LE MODÈLE
use Illuminate\Support\Facades\DB;
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
            $query = AppelOffre::with('fichiers.categorie')->orderBy('created_at', 'desc');

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
            $appelOffres->each(function ($ao) {
                $ao->fichiers->each(function ($fichier) {
                    $fichier->url = $fichier->chemin_fichier ? Storage::disk('public')->url($fichier->chemin_fichier) : null;
                });
            });
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
// ... (dans app/Http/Controllers/AppelOffreController.php)

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        // --- VALIDATION MISE À JOUR ---
        $validatedData = $request->validate([
            'categorie' => ['required', Rule::in(['Travaux', 'Etudes', 'Services', 'Fournitures'])],
            'provinces' => 'nullable|array',
            'provinces.*' => ['required_with:provinces', 'string', Rule::in($this->allowedProvinces)],
            'numero' => 'required|string|max:255|unique:appel_offre,numero',
            'intitule' => 'required|string|max:65535',
            'estimation' => 'nullable|numeric|min:0',
            'estimation_HT' => 'required|numeric|min:0',
            'montant_TVA' => 'required|numeric|min:0',
            'duree_execution' => 'nullable|integer|min:0',
            'date_verification' => 'nullable|date_format:Y-m-d',
            'id_fonctionnaire'=>'nullable|string',
            'date_ouverture' => 'nullable|date_format:Y-m-d',
            'last_session_op' => 'nullable|date_format:Y-m-d',
            'date_publication' => 'nullable|date_format:Y-m-d',
            'lancement_portail' => 'nullable|boolean',
            'date_lancement_portail' => 'nullable|date_format:Y-m-d|required_if:lancement_portail,true',
            
            // Validation pour les nouveaux fichiers
            'fichiers_data' => 'nullable|json',
            'files' => 'nullable|array',
            'files.*' => 'required|file|mimes:pdf,doc,docx,xls,xlsx,jpg,jpeg,png,dwg,zip,rar|max:20480',
        ]);

        $fichiersMetadata = json_decode($request->input('fichiers_data', '[]'), true);

        DB::beginTransaction();
        try {
            // Prépare les données de l'appel d'offre en excluant les données des fichiers
            $appelOffreData = $request->except(['fichiers_data', 'files']);

            // --- VOTRE LOGIQUE DE PRÉPARATION DE DONNÉES (RÉINTÉGRÉE) ---
            
            // S'assure que 'lancement_portail' est un booléen, avec false par défaut
            $appelOffreData['lancement_portail'] = $request->boolean('lancement_portail');

            // Gère le tableau des provinces : un tableau vide doit être stocké comme NULL
            if (isset($validatedData['provinces']) && is_array($validatedData['provinces'])) {
                $filteredProvinces = array_filter($validatedData['provinces']);
                $appelOffreData['provinces'] = !empty($filteredProvinces) ? $filteredProvinces : null;
            } else {
                $appelOffreData['provinces'] = null; // S'assure que c'est NULL si non fourni ou invalide
            }
            
            // --- FIN DE VOTRE LOGIQUE ---

            $appelOffre = AppelOffre::create($appelOffreData);

            // --- GESTION DES NOUVEAUX FICHIERS ---
            if ($request->hasFile('files')) {
foreach ($request->file('files', []) as $key => $file) {
                    if ($file->isValid()) {
                        $metadata = $fichiersMetadata[$key] ?? [];
                        
                        $path = $file->store('uploads/appel_offres/' . $appelOffre->id, 'public');

                        FichierJoint::create([
                            'appel_offre_id' => $appelOffre->id,
                            'intitule' => $request->input("intitule_file.{$key}",  $file->getClientOriginalName()),
'fichier_categorie_id' => $request->input("categorie_file_id.{$key}"),                            'nom_fichier' => $file->getClientOriginalName(),
                            'chemin_fichier' => $path,
                            'type_fichier' => $file->getClientMimeType(),
                        ]);
                    }
                }
            }
            
            DB::commit();

            $appelOffre->load('fichiers');
            $appelOffre->fichiers->each(fn($f) => $f->url = Storage::disk('public')->url($f->chemin_fichier));

            Log::info('Appel d\'offre créé avec succès: ID ' . $appelOffre->id);
            return response()->json(['message' => 'Appel d\'offre créé avec succès.', 'appel_offre' => $appelOffre], 201);

        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::warning('Validation a échoué pour la création d\'appel d\'offre: ', $e->errors());
            return response()->json(['message' => 'Les données fournies étaient invalides.', 'errors' => $e->errors()], 422);
        } catch (Exception $e) {
            DB::rollBack();
            Log::error('Erreur lors de la création d\'appel d\'offre: ' . $e->getMessage(), ['data' => $request->all(), 'trace' => $e->getTraceAsString()]);
            return response()->json(['message' => 'Erreur serveur lors de la création de l\'appel d\'offre.'], 500);
        }
    }
    /**
     * Display the specified resource.
     */
    public function show(string $id): JsonResponse
    {
        try {
            $appelOffre = AppelOffre::with('fichiers.categorie')->findOrFail($id);

            // Générer les URLs publiques pour les fichiers
            $appelOffre->fichiers->each(function ($fichier) {
                $fichier->url = $fichier->chemin_fichier ? Storage::disk('public')->url($fichier->chemin_fichier) : null;
            });

            return response()->json($appelOffre);
        } catch (ModelNotFoundException $e) {
             Log::warning('Appel d\'offre not found with ID: ' . $id);
             return response()->json(['message' => 'Appel d\'offre non trouvé.'], 404);
        } catch (Exception $e) {
            Log::error('Error fetching appel d\'offre ID ' . $id . ': ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return response()->json(['message' => 'Erreur serveur lors de la récupération de l\'appel d\'offre.'], 500);
        }
    }

 
    public function update(Request $request, string $id): JsonResponse
    {
        try {
            $appelOffre = AppelOffre::findOrFail($id);

            // --- VALIDATION MISE À JOUR ---
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

                // Validation pour les fichiers
                'fichiers_data' => 'nullable|json',
                'files' => 'nullable|array',
                'files.*' => 'nullable|file|mimes:pdf,doc,docx,xls,xlsx,jpg,jpeg,png,dwg,zip,rar|max:20480',
                'fichiers_a_supprimer' => 'nullable|json', // IDs des fichiers à supprimer
            ]);

            $fichiersMetadata = json_decode($request->input('fichiers_data', '[]'), true);
            $fichiersASupprimer = json_decode($request->input('fichiers_a_supprimer', '[]'), true);

            DB::beginTransaction();
            
            // Prépare les données pour la mise à jour
            $updateData = $request->except(['fichiers_data', 'files', 'fichiers_a_supprimer', '_method']);

            // --- VOTRE LOGIQUE DE PRÉPARATION DE DONNÉES (RÉINTÉGRÉE POUR UPDATE) ---

            // Gère 'lancement_portail', en conservant l'ancienne valeur si non fournie.
            $updateData['lancement_portail'] = $request->boolean('lancement_portail', $appelOffre->lancement_portail);

            // Gère le tableau des provinces avec la logique complète pour la mise à jour
            if ($request->exists('provinces')) {
                if (is_array($request->input('provinces'))) {
                    $filteredProvinces = array_filter($request->input('provinces'));
                    $updateData['provinces'] = !empty($filteredProvinces) ? $filteredProvinces : null;
                } else {
                    // Si 'provinces' est envoyé mais n'est pas un tableau (ex: null), on le met à NULL
                    $updateData['provinces'] = null;
                }
            } else {
                // Si la clé 'provinces' n'est pas du tout dans la requête, on la retire des données
                // de mise à jour pour ne pas écraser la valeur existante.
                unset($updateData['provinces']);
            }
            
            // --- FIN DE VOTRE LOGIQUE ---

            $appelOffre->update($updateData);

            // --- GESTION DES FICHIERS À SUPPRIMER ---
            if (!empty($fichiersASupprimer)) {
                $fichiers = FichierJoint::whereIn('id', $fichiersASupprimer)
                    ->where('appel_offre_id', $appelOffre->id) // Sécurité : ne supprimer que les fichiers de cet AO
                    ->get();
                
                foreach ($fichiers as $fichier) {
                    Storage::disk('public')->delete($fichier->chemin_fichier);
                    $fichier->delete();
                }
            }

            // --- GESTION DES NOUVEAUX FICHIERS ---
            if ($request->hasFile('files')) {
            foreach ($request->file('files', []) as $key => $file) {
                    if ($file && $file->isValid()) {
                        $metadata = $fichiersMetadata[$key] ?? [];
                        $path = $file->store('uploads/appel_offres/'.$appelOffre->id, 'public');
                        FichierJoint::create([
                            'appel_offre_id' => $appelOffre->id,
                            'intitule' => $request->input("intitule_file.{$key}", $file->getClientOriginalName()),
'fichier_categorie_id' => $request->input("categorie_file_id.{$key}"),    
                           'nom_fichier' => $file->getClientOriginalName(),
                            'chemin_fichier' => $path,
                            'type_fichier' => $file->getClientMimeType(),
                        ]);
                    }
                }
            }

            DB::commit();

            $appelOffre->load('fichiers');
            $appelOffre->fichiers->each(fn($f) => $f->url = Storage::disk('public')->url($f->chemin_fichier));
            
            Log::info('Appel d\'offre mis à jour avec succès: ID ' . $appelOffre->id);
            return response()->json(['message' => 'Appel d\'offre mis à jour avec succès.', 'appel_offre' => $appelOffre->fresh()], 200);

        } catch (ModelNotFoundException $e) {
            return response()->json(['message' => 'Appel d\'offre non trouvé.'], 404);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['message' => 'Les données fournies étaient invalides.', 'errors' => $e->errors()], 422);
        } catch (Exception $e) {
            DB::rollBack();
            Log::error('Erreur lors de la mise à jour de l\'appel d\'offre ID ' . $id . ': ' . $e->getMessage());
            return response()->json(['message' => 'Erreur serveur lors de la mise à jour.'], 500);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id): JsonResponse
    {
       DB::beginTransaction();
        try {
            $appelOffre = AppelOffre::findOrFail($id); // Assumes PK is 'id'
             Storage::disk('public')->deleteDirectory('uploads/appel_offres/' . $appelOffre->id);
            $appelOffre->delete();
             DB::commit();
            Log::info('Appel d\'offre deleted successfully: ID ' . $id);
            return response()->json(null, 204); // Standard 204 No Content
           
        } catch (ModelNotFoundException $e) {
                        DB::rollBack();

             Log::warning('Appel d\'offre not found for deletion with ID: ' . $id);
             return response()->json(['message' => 'Appel d\'offre non trouvé.'], 404);
        } catch (QueryException $qe) {
                        DB::rollBack();
 // Catch specific database errors
             Log::error('Database error deleting appel d\'offre ID ' . $id . ': ' . $qe->getMessage(), ['sql_code' => $qe->getCode()]);
             // Check for foreign key constraint violation (error code/message can vary by database)
             if (str_contains($qe->getMessage(), 'constraint violation') || $qe->getCode() == '23000' || ($qe->errorInfo[1] ?? null) == 1451) {
                return response()->json(['message' => 'Impossible de supprimer cet appel d\'offre car il est lié à d\'autres enregistrements.'], 409); // 409 Conflict
             }
             return response()->json(['message' => 'Erreur base de données lors de la suppression.'], 500);
         } catch (Exception $e) {
                        DB::rollBack();

            Log::error('Error deleting appel d\'offre ID ' . $id . ': ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return response()->json(['message' => 'Erreur serveur lors de la suppression de l\'appel d\'offre.'], 500);
        }
    }
}