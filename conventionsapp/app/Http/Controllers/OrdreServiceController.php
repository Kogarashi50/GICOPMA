<?php

namespace App\Http\Controllers;

use App\Models\OrdreService;
use App\Models\FichierJoint;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Http\JsonResponse;
use Throwable;

class OrdreServiceController extends Controller
{
    /**
     * Display a listing of the resource.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function index(Request $request): JsonResponse
    {
        // Load the 'fichiers' relationship for every record.
        $query = OrdreService::with(['marchePublic:id,numero_marche,intitule', 'fichiers']);
        
        // (Assuming you have filtering/sorting logic here, which can remain)
        // Example: if ($request->has('search')) { ... }

        $ordres = $query->latest()->paginate($request->query('per_page', 15));
        
        // Add public URLs to each file for easier access on the frontend.
        $ordres->getCollection()->transform(function ($ordre) {
            $ordre->fichiers->each(fn($f) => $f->url = Storage::disk('public')->url($f->chemin_fichier));
            return $ordre;
        });

        return response()->json($ordres);
    }

    /**
     * Store a newly created resource in storage.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function store(Request $request): JsonResponse
    {
        // Corrected validation to handle array of files and titles
        $validatedData = $request->validate([
            'marche_id' => ['required', 'integer', Rule::exists('marche_public', 'id')],
            'type' => ['required', Rule::in(['commencement', 'arret', 'reprise'])],
            'numero' => ['required', 'string', 'max:100', Rule::unique('ordre_service', 'numero')->where('marche_id', $request->input('marche_id'))],
            'date_emission' => 'required|date_format:Y-m-d',
            'description' => 'nullable|string',
            'id_fonctionnaire' => 'nullable|string',
            'files' => 'nullable|array',
            'files.*' => 'required|file|mimes:pdf,doc,docx,xls,xlsx,jpg,jpeg,png,dwg,zip,rar|max:20480', // Max 20MB
            'intitules' => 'nullable|array', // Changed from intitule_file to intitules
            'intitules.*' => 'required|string|max:255',
        ]);

        DB::beginTransaction();
        try {
            $ordreServiceData = collect($validatedData)->except(['files', 'intitules'])->toArray();
            $ordreServiceData['cree_par'] = auth()->id();

            $ordreService = OrdreService::create($ordreServiceData);

            if ($request->hasFile('files')) {
                foreach ($request->file('files') as $key => $file) {
                    $path = $file->store('uploads/ordres_service/' . $ordreService->id, 'public');
                    FichierJoint::create([
                        'ordre_service_id' => $ordreService->id,
                        'intitule' => $request->input("intitules.{$key}", $file->getClientOriginalName()),
                        'nom_fichier' => $file->getClientOriginalName(),
                        'chemin_fichier' => $path,
                        'type_fichier' => $file->getClientMimeType(),
                    ]);
                }
            }

            DB::commit();
            
            // Reload relationships to return the full object
            $ordreService->load(['marchePublic:id,numero_marche,intitule', 'fichiers']);
            $ordreService->fichiers->each(fn($f) => $f->url = Storage::disk('public')->url($f->chemin_fichier));

            return response()->json(['message' => 'Ordre de service créé avec succès.', 'ordre_service' => $ordreService], 201);
        } catch (Throwable $e) {
            DB::rollBack();
            Log::error("Erreur création Ordre Service: " . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return response()->json(['message' => 'Erreur serveur lors de la création.'], 500);
        }
    }

    /**
     * Display the specified resource.
     *
     * @param OrdreService $ordre_service
     * @return JsonResponse
     */
    public function show(OrdreService $ordre_service): JsonResponse
    {
        $ordre_service->load(['marchePublic:id,numero_marche,intitule', 'fichiers']);
        $ordre_service->fichiers->each(fn($f) => $f->url = Storage::disk('public')->url($f->chemin_fichier));
        return response()->json(['ordre_service' => $ordre_service]);
    }

    /**
     * Update the specified resource in storage.
     *
     * @param Request $request
     * @param OrdreService $ordre_service
     * @return JsonResponse
     */
    public function update(Request $request, OrdreService $ordre_service): JsonResponse
    {

        $validatedData = $request->validate([
            'marche_id' => ['required', 'integer', Rule::exists('marche_public', 'id')],
            'type' => ['required', Rule::in(['commencement', 'arret', 'reprise'])],
            'numero' => ['required', 'string', 'max:100', Rule::unique('ordre_service', 'numero')->where('marche_id', $request->input('marche_id'))->ignore($ordre_service->id)],
            'date_emission' => 'required|date_format:Y-m-d',
            'description' => 'nullable|string',
            'id_fonctionnaire' => 'nullable|string',
            'fichiers_a_supprimer' => 'nullable|json',
            'files' => 'nullable|array',
            'files.*' => 'nullable|file|max:20480', // Max 20MB
            'intitules' => 'nullable|array', // Changed from intitule_file
            'intitules.*' => 'sometimes|required|string|max:255',
            'fichiers_existants_meta' => 'nullable|json',
        ]);
        
        DB::beginTransaction();
        try {
            // Update the main model's data
            $ordre_service->update(collect($validatedData)->except(['files', 'intitules', 'fichiers_a_supprimer', 'fichiers_existants_meta'])->toArray());

            // Update metadata for existing files
            $existingFilesMeta = json_decode($request->input('fichiers_existants_meta', '[]'), true);
            if (is_array($existingFilesMeta) && !empty($existingFilesMeta)) {
                foreach ($existingFilesMeta as $meta) {
                    if (isset($meta['id']) && isset($meta['intitule'])) {
                        FichierJoint::where('id', $meta['id'])
                                    ->where('ordre_service_id', $ordre_service->id) // Security check
                                    ->update(['intitule' => $meta['intitule']]);
                    }
                }
            }

            // Delete files marked for deletion
            $filesToDeleteIds = json_decode($request->input('fichiers_a_supprimer', '[]'), true);
            if (is_array($filesToDeleteIds) && !empty($filesToDeleteIds)) {
                $fichiers = FichierJoint::whereIn('id', $filesToDeleteIds)->where('ordre_service_id', $ordre_service->id)->get();
                foreach ($fichiers as $fichier) {
                    Storage::disk('public')->delete($fichier->chemin_fichier);
                    $fichier->delete();
                }
            }

            // Add new files
            if ($request->hasFile('files')) {
                foreach ($request->file('files') as $key => $file) {
                    $path = $file->store('uploads/ordres_service/' . $ordre_service->id, 'public');
                    FichierJoint::create([
                        'ordre_service_id' => $ordre_service->id,
                        'intitule' => $request->input("intitules.{$key}", $file->getClientOriginalName()),
                        'nom_fichier' => $file->getClientOriginalName(),
                        'chemin_fichier' => $path,
                        'type_fichier' => $file->getClientMimeType(),
                    ]);
                }
            }

            DB::commit();
            
            // Reload fresh data to return to the client
            $ordre_service->load(['marchePublic:id,numero_marche,intitule', 'fichiers']);
            $ordre_service->fichiers->each(fn($f) => $f->url = Storage::disk('public')->url($f->chemin_fichier));

            return response()->json(['message' => 'Ordre de service mis à jour avec succès.', 'ordre_service' => $ordre_service]);

        } catch (Throwable $e) {
            DB::rollBack();
            Log::error("Erreur MAJ Ordre Service ID {$ordre_service->id}: " . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return response()->json(['message' => 'Erreur serveur lors de la mise à jour.'], 500);
        }
    }

    /**
     * Remove the specified resource from storage.
     *
     * @param OrdreService $ordre_service
     * @return JsonResponse
     */
    public function destroy(OrdreService $ordre_service): JsonResponse
    {
        DB::beginTransaction();
        try {
            // Delete all associated files from storage
            foreach ($ordre_service->fichiers as $fichier) {
                Storage::disk('public')->delete($fichier->chemin_fichier);
                // The database records will be deleted by the model's 'deleting' event or cascading delete.
            }
            
            // Delete the parent directory for the associated files.
            Storage::disk('public')->deleteDirectory('uploads/ordres_service/' . $ordre_service->id);

            // Delete the OrdreService record itself.
            $ordre_service->delete();
            DB::commit();

            return response()->json(null, 204);
        } catch (Throwable $e) {
            DB::rollBack();
            Log::error("Erreur suppression Ordre Service ID {$ordre_service->id}: " . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return response()->json(['message' => 'Erreur serveur lors de la suppression.'], 500);
        }
    }
}