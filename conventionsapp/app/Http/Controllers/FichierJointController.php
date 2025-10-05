<?php

namespace App\Http\Controllers;

use App\Models\MarchePublic;
use App\Models\FichierJoint;
use App\Models\Lot;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\DB; // For transaction on delete


class FichierJointController extends Controller
{
    // ASSUMPTION: Route-level middleware handles authorization

    /**
     * Display files for a specific MarchePublic.
     * GET /api/marches-publics/{marche}/fichiers
     */
    public function updateMetadata(Request $request, FichierJoint $fichier_joint)
    {
        // Optionnel : Ajoutez une politique de sécurité pour vérifier que l'utilisateur a le droit de modifier ce fichier.
        // $this->authorize('update', $fichier_joint);

        $validatedData = $request->validate([
            'intitule' => 'required|string|max:255',
            // Validez contre une liste fixe de catégories pour la sécurité
            'categorie' => ['required', 'string']
        ]);

        $fichier_joint->update($validatedData);

        return response()->json([
            'message' => 'Les informations du fichier ont été mises à jour.',
            'fichier_joint' => $fichier_joint
        ]);
    }
    public function indexForMarche(MarchePublic $marche)
    {
         try {
            $lotIds = $marche->lots()->pluck('id')->toArray();
            $fichiers = FichierJoint::where('marche_id', $marche->id)
                                   ->orWhereIn('lot_id', $lotIds)
                                   ->latest('date_ajout')
                                   ->get();
            return response()->json(['fichiers_joints' => $fichiers]); // Key matches frontend
        } catch (\Exception $e) {
             Log::error("Error fetching Fichiers Joints for Marche {$marche->id}: " . $e->getMessage());
             return response()->json(['message' => 'Erreur serveur.'], 500);
        }
    }


    /**
     * Store newly uploaded file(s) (Typically linked to a lot OR market).
     * POST /api/fichiers-joints
     */
    public function store(Request $request)
    {
        // This controller method might be less used if uploads happen via MarchePublicController,
        // but useful for adding files later independently.
        $validator = Validator::make($request->all(), [
            'fichiers' => 'required|array',
            'fichiers.*' => 'required|file|mimes:pdf,doc,docx,xls,xlsx,jpg,jpeg,png,dwg,zip,rar|max:20480',
            'marche_id' => ['nullable', Rule::requiredIf(!$request->filled('lot_id')), 'exists:marche_public,id'],
            'lot_id' => ['nullable', Rule::requiredIf(!$request->filled('marche_id')), 'exists:lot,id'],
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Erreurs de validation.', 'errors' => $validator->errors()], 422);
        }

        $uploadedFilesInfo = [];
        $errors = [];
        $parentId = $request->input('marche_id') ?: $request->input('lot_id');
        $parentType = $request->filled('marche_id') ? 'marches' : 'lots';
        $parentKey = $request->filled('marche_id') ? 'marche_id' : 'lot_id';

        // Use transaction as multiple files might be uploaded
        DB::beginTransaction();
        try {
             if ($request->hasFile('fichiers')) {
                 foreach ($request->file('fichiers') as $file) {
                     if ($file->isValid()) {
                         $originalName = $file->getClientOriginalName();
                         $mimeType = $file->getMimeType() ?: 'application/octet-stream';
                         $pathPrefix = $parentType . '/' . $parentId;
                         $storedPath = $file->store($pathPrefix, 'public');

                         if (!$storedPath) {
                             $errors[] = "Erreur stockage: {$originalName}";
                             continue;
                         }

                         $fichierJoint = FichierJoint::create([
                             'marche_id' => $request->input('marche_id') ?: null,
                             'lot_id' => $request->input('lot_id') ?: null,
                             'nom_fichier' => $originalName,
                             'chemin_fichier' => $storedPath,
                             'type_fichier' => $mimeType,
                         ]);
                         $uploadedFilesInfo[] = $fichierJoint;
                     } else {
                         $errors[] = "Fichier invalide: " . $file->getClientOriginalName();
                     }
                 }
             }

            if (!empty($errors)) {
                 DB::rollBack();
                 return response()->json(['message' => 'Erreurs lors du téléversement.', 'errors' => $errors], 422); // Use 422 if validation related
            }

            DB::commit();
            return response()->json([
                 'message' => count($uploadedFilesInfo) . ' fichier(s) téléversé(s).',
                 'fichiers_joints' => $uploadedFilesInfo
             ], 201);

        } catch (\Exception $e) {
             DB::rollBack();
             Log::error("Error uploading Fichier Joint(s): " . $e->getMessage());
             return response()->json(['message' => 'Erreur serveur lors du téléversement.'], 500);
        }
    }

public function update(Request $request, FichierJoint $fichierJoint)
    {
        $validated = $request->validate(['intitule' => 'required|string|max:255']);
        $fichierJoint->update($validated);
        return response()->json(['message' => 'Fichier mis à jour.', 'fichier_joint' => $fichierJoint]);
    }
    /**
     * Provide file for download.
     * GET /api/fichiers-telecharger/{fichier_joint}
     */
    public function download(FichierJoint $fichier_joint) // Route model binding
    {     Log::info("--- FichierJointController@download Entered ---");
        Log::info("ID received via Route Model Binding: " . ($fichier_joint->id ?? 'ID IS NULL'));
        Log::info("chemin_fichier value in received \$fichier_joint: [" . ($fichier_joint->chemin_fichier ?? 'PATH IS NULL or Empty') . "]");
        Log::info("Result of empty(\$fichier_joint->chemin_fichier): " . (empty($fichier_joint->chemin_fichier) ? 'TRUE (Empty)' : 'FALSE (Not Empty)'));
        Log::info("--- Download method entered. Received FichierJoint ID: " . ($fichier_joint->id ?? 'NULL') . " ---");
        $pathFromDb = $fichier_joint->chemin_fichier; // e.g., "lots/12/HASH.j"
        $disk = 'public'; // The disk where files are stored

        Log::debug("Download Request - FichierJoint ID: {$fichier_joint->id}");
        Log::debug("Download Request - DB Path (chemin_fichier): {$pathFromDb}");

        // --- Validate Input Path ---
        if (empty($pathFromDb)) {
            Log::error("Download Error - Empty path in database for FichierJoint ID: {$fichier_joint->id}");
            return response()->json(['message' => 'Chemin du fichier invalide dans la base de données.'], 400); // Bad request
        }

        // --- Construct Absolute Path for PHP Check ---
        try {
            $diskRoot = Storage::disk($disk)->path(''); // Gets the disk's root absolute path
            $normalizedPathFromDb = str_replace('/', DIRECTORY_SEPARATOR, $pathFromDb); // Normalize slashes for OS

            // Robust path concatenation
            $fullPath = rtrim($diskRoot, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . ltrim($normalizedPathFromDb, DIRECTORY_SEPARATOR);

            Log::debug("Download Request - Disk '{$disk}' Root: {$diskRoot}");
            Log::debug("Download Request - Normalized DB Path: {$normalizedPathFromDb}");
            Log::debug("Download Request - Checking Absolute Path: {$fullPath}");

            // --- Perform PHP File System Check ---
            $phpFileExists = file_exists($fullPath);
            $phpIsFile = is_file($fullPath);

            Log::debug("Download Request - PHP file_exists() result: " . ($phpFileExists ? 'true' : 'false'));
            Log::debug("Download Request - PHP is_file() result: " . ($phpIsFile ? 'true' : 'false'));

            // Also log Storage facade result for comparison
            $storageExists = Storage::disk($disk)->exists($pathFromDb); // Use original path for Storage facade check
            Log::debug("Download Request - Storage::exists('{$pathFromDb}') result: " . ($storageExists ? 'true' : 'false'));

            // --- Check if File Exists and is a File ---
            if (!$phpFileExists || !$phpIsFile) {
                Log::warning("Download Error - File not found or not a file using PHP check. Path: {$fullPath}");
                return response()->json(['message' => 'Fichier non trouvé sur le serveur (PHP Check).'], 404);
            }

            // --- If PHP checks pass, attempt download using Storage facade ---
            Log::info("Download Info - PHP check passed. Attempting Storage::download for original path: {$pathFromDb}");
            // Use the original path relative to the disk for the download method
            return Storage::disk($disk)->download($pathFromDb, $fichier_joint->nom_fichier);

        } catch (\Throwable $e) { // Catch Throwable for broader error capture (PHP 7+)
             // Catch potential errors during path construction or download
             Log::error("Download Exception - FichierJoint ID {$fichier_joint->id}: " . $e->getMessage(), [
                 'exception' => $e,
                 'trace' => $e->getTraceAsString() // Optional: log full trace for deep debugging
             ]);
             // Return a generic server error response
             return response()->json(['message' => 'Erreur serveur lors de la tentative de téléchargement.'], 500);
        }
    }


     /**
      * Remove the specified file resource and the actual file.
      * DELETE /api/fichiers-joints/{fichier_joint}
      */
     public function destroy(FichierJoint $fichier_joint)
     {
         // Add authorization check if needed
         // Gate::authorize('delete', $fichier_joint);

        $path = $fichier_joint->chemin_fichier;
        $disk = 'public';

         DB::beginTransaction();
         try {
            $deleted = $fichier_joint->delete(); // Delete DB record first

            if ($deleted) {
                 // If DB delete succeeds, attempt to delete file from storage
                 if ($path && Storage::disk($disk)->exists($path)) {
                     Storage::disk($disk)->delete($path);
                 }
                 DB::commit();
                 return response()->json(['message' => 'Fichier supprimé avec succès.'], 200);
            } else {
                 DB::rollBack();
                 return response()->json(['message' => 'La suppression du fichier (DB) a échoué.'], 500);
            }
         } catch (\Exception $e) {
             DB::rollBack();
             Log::error("Error deleting Fichier Joint {$fichier_joint->id}: " . $e->getMessage());
             return response()->json(['message' => 'Erreur serveur.'], 500);
         }
     }

}