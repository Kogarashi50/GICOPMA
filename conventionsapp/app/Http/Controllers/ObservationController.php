<?php

namespace App\Http\Controllers;

use App\Models\Observation;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Throwable;

class ObservationController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Observation::join('fonctionnaires', 'observations.id_fonctionnaire', '=', 'fonctionnaires.id')
            ->select(
                'observations.*',
                DB::raw("TRIM(CONCAT(COALESCE(fonctionnaires.prenom, ''), ' ', COALESCE(fonctionnaires.nom, ''))) as nom_complet")
            )
            ->orderBy('observations.date_observation', 'desc');

        $observations = $query->paginate($request->get('per_page', 15));

        // Add public URLs to each file within the JSON array for the frontend.
        $observations->getCollection()->transform(function ($obs) {
            if (is_array($obs->fichiers_joints)) {
                $processedFiles = [];
                foreach ($obs->fichiers_joints as $file) {
                    if (isset($file['chemin_fichier'])) {
                        $file['url'] = Storage::disk('public')->url($file['chemin_fichier']);
                    }
                    $processedFiles[] = $file;
                }
                $obs->fichiers_joints = $processedFiles;

                // For backward compatibility with the table view's file icon, provide a top-level URL.
                if (!empty($obs->fichiers_joints[0])) {
                    $obs->url_fichier = $obs->fichiers_joints[0]['url'];
                    $obs->nom_fichier = $obs->fichiers_joints[0]['intitule'] ?? $obs->fichiers_joints[0]['nom_fichier'];
                }
            }
            return $obs;
        });

        return response()->json($observations);
    }

    /**
     * Display the specified resource.
     */
    public function show($id): JsonResponse
    {
        $observation = Observation::findOrFail($id);
        
        // Add full public URLs to the file data before sending to the client
        if (is_array($observation->fichiers_joints)) {
            $processedFiles = [];
            foreach ($observation->fichiers_joints as $file) {
                if (isset($file['chemin_fichier'])) {
                    $file['url'] = Storage::disk('public')->url($file['chemin_fichier']);
                }
                $processedFiles[] = $file;
            }
            $observation->fichiers_joints = $processedFiles;
        }

        // The React form expects a property named 'fichiers', so we'll add it for consistency.
        $observation->fichiers = $observation->fichiers_joints;

        // Also load the official's name for display purposes.
        $observation->load('fonctionnaire:id,nom,prenom');
        $observation->nom_complet = trim(($observation->fonctionnaire->prenom ?? '') . ' ' . ($observation->fonctionnaire->nom ?? ''));

        return response()->json($observation);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $validatedData = $request->validate([
            'id_fonctionnaire' => 'required|exists:fonctionnaires,id',
            'observation' => 'required|string',
            'date_observation' => 'required|date',
            'files' => 'nullable|array',
            'files.*' => 'required|file|mimes:pdf,doc,docx,jpg,png,jpeg,xls,xlsx,zip,rar|max:10240', // Max 10MB
            'intitules' => 'nullable|array',
            'intitules.*' => 'required|string|max:255',
        ]);

        DB::beginTransaction();
        try {
            // Create the observation first to get an ID
            $observation = Observation::create(collect($validatedData)->except(['files', 'intitules'])->toArray());

            $filesData = [];
            if ($request->hasFile('files')) {
                foreach ($request->file('files') as $key => $file) {
                    // Store the file in a directory specific to this observation's ID
                    $path = $file->store('uploads/observations/' . $observation->id, 'public');
                    $filesData[] = [
                        'intitule' => $request->input("intitules.{$key}", $file->getClientOriginalName()),
                        'nom_fichier' => $file->getClientOriginalName(),
                        'chemin_fichier' => $path,
                        'type_fichier' => $file->getClientMimeType(),
                        'taille_fichier' => $file->getSize(),
                    ];
                }
            }

            // Save the array of file data into the JSON column
            $observation->fichiers_joints = $filesData;
            $observation->save();

            DB::commit();
            return response()->json(['message' => 'Observation créée avec succès.', 'data' => $observation], 201);
        } catch (Throwable $e) {
            DB::rollBack();
            Log::error("Erreur création Observation: " . $e->getMessage());
            return response()->json(['message' => 'Une erreur est survenue sur le serveur.'], 500);
        }
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, $id): JsonResponse
    {
        $observation = Observation::findOrFail($id);

        $validatedData = $request->validate([
            'id_fonctionnaire' => 'required|exists:fonctionnaires,id',
            'observation' => 'required|string',
            'date_observation' => 'required|date',
            'fichiers_a_supprimer' => 'nullable|json',
            'files' => 'nullable|array',
            'files.*' => 'nullable|file|max:10240',
            'intitules' => 'nullable|array',
            'intitules.*' => 'sometimes|required|string|max:255',
            'fichiers_existants_meta' => 'nullable|json',
        ]);

        DB::beginTransaction();
        try {
            // 1. Update the main observation fields
            $observation->update(collect($validatedData)->except(['files', 'intitules', 'fichiers_a_supprimer', 'fichiers_existants_meta'])->toArray());

            $currentFiles = $observation->fichiers_joints ?? [];

            // 2. Handle Deletions
            $filesToDeletePaths = json_decode($request->input('fichiers_a_supprimer', '[]'), true);
            if (is_array($filesToDeletePaths) && !empty($filesToDeletePaths)) {
                $currentFiles = array_filter($currentFiles, function ($file) use ($filesToDeletePaths) {
                    if (in_array($file['chemin_fichier'], $filesToDeletePaths)) {
                        Storage::disk('public')->delete($file['chemin_fichier']);
                        return false; // Remove this file from the array
                    }
                    return true; // Keep this file
                });
            }

            // 3. Handle Metadata Updates for Existing Files
            $existingFilesMeta = json_decode($request->input('fichiers_existants_meta', '[]'), true);
            if (is_array($existingFilesMeta) && !empty($existingFilesMeta)) {
                $currentFiles = array_map(function ($file) use ($existingFilesMeta) {
                    foreach ($existingFilesMeta as $meta) {
                        if (isset($file['chemin_fichier']) && $file['chemin_fichier'] === $meta['chemin_fichier']) {
                            $file['intitule'] = $meta['intitule'];
                        }
                    }
                    return $file;
                }, $currentFiles);
            }

            // 4. Handle New File Uploads
            if ($request->hasFile('files')) {
                foreach ($request->file('files') as $key => $file) {
                    $path = $file->store('uploads/observations/' . $observation->id, 'public');
                    $currentFiles[] = [
                        'intitule' => $request->input("intitules.{$key}", $file->getClientOriginalName()),
                        'nom_fichier' => $file->getClientOriginalName(),
                        'chemin_fichier' => $path,
                        'type_fichier' => $file->getClientMimeType(),
                        'taille_fichier' => $file->getSize(),
                    ];
                }
            }

            // 5. Save the final, modified array back to the database
            $observation->fichiers_joints = array_values($currentFiles); // Re-index array
            $observation->save();

            DB::commit();
            return response()->json(['message' => 'Observation mise à jour avec succès.', 'data' => $observation]);
        } catch (Throwable $e) {
            DB::rollBack();
            Log::error("Erreur MAJ Observation ID {$id}: " . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return response()->json(['message' => 'Une erreur est survenue sur le serveur lors de la mise à jour.'], 500);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id): JsonResponse
    {
        $observation = Observation::findOrFail($id);

        // The 'deleting' event in the Observation model will automatically handle
        // the deletion of all associated files and the storage directory.
        $observation->delete();

        return response()->json(['message' => 'Observation supprimée avec succès.'], 200);
    }
}