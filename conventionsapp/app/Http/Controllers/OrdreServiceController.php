<?php

namespace App\Http\Controllers;

// Models
use App\Models\OrdreService;
use App\Models\MarchePublic; // Included for validation

// Facades and Classes
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\File; // *** Use File facade ***
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Auth; // If using authentication for cree_par
use Illuminate\Support\Str;         // For generating random strings
use Illuminate\Http\JsonResponse;
use Throwable; // Catch broader errors/exceptions
use Illuminate\Database\Eloquent\ModelNotFoundException; // Specific exception for show

class OrdreServiceController extends Controller
{
    // *** Define relative path prefix for storage in DB and URL construction ***
    // This path is relative to the 'public' directory root
    private $fileUploadPath = 'uploads/ordres_service/attachments';

    /**
     * Display a listing of OrdreService resources.
     * GET /api/ordres-service
     */
    public function index(Request $request): JsonResponse
    {
        try {
            Log::info("Fetching list of Ordres de Service...");
            $query = OrdreService::with('marchePublic:id,numero_marche,intitule');

            // --- Searching ---
            if ($search = $request->query('search')) {
                Log::debug("Searching Ordres de Service for term.", ['search_term' => $search]);
                $query->where(function($q) use ($search) {
                    $q->where('numero', 'like', "%{$search}%")
                      ->orWhere('description', 'like', "%{$search}%")
                      ->orWhereHas('marchePublic', function ($subQuery) use ($search) {
                          $subQuery->where('numero_marche', 'like', "%{$search}%")
                                    ->orWhere('intitule', 'like', "%{$search}%");
                      });
                });
            }

            // --- Filtering by Marche Public ---
            if ($marcheId = $request->query('marche_id')) {
                $query->where('marche_id', $marcheId);
            }

            // --- Filtering by Type ---
             if ($type = $request->query('type')) {
                 if (in_array($type, ['commencement', 'arret'])) { $query->where('type', $type); }
             }

            // --- Sorting ---
            $sortField = $request->query('sort', 'date_emission');
            $sortDirection = $request->query('direction', 'desc');
            $allowedSorts = ['numero', 'date_emission', 'type'];
            if (in_array($sortField, $allowedSorts)) { $query->orderBy($sortField, $sortDirection); }
            else { $query->orderBy('date_emission', 'desc'); }

            // --- Pagination ---
             $perPage = $request->query('per_page', 15);
             $ordres = $query->paginate($perPage);

            // --- Generate Public URLs ---
            $appBaseUrl = rtrim(config('app.url', 'http://localhost:8000'), '/');
            $ordres->getCollection()->transform(function ($ordre) use ($appBaseUrl) {
                if ($ordre->fichier_joint) {
                     // Construct URL from the relative path stored in the DB
                     $ordre->fichier_joint_url = $appBaseUrl . '/' . ltrim($ordre->fichier_joint, '/');
                 } else {
                     $ordre->fichier_joint_url = null;
                 }
                 // Note: id_fonctionnaire is just a field, no URL needed here
                 return $ordre;
             });
             // --- End URL generation ---

            Log::info("Successfully fetched Ordres de Service list/page.");
            // Return paginated response (Laravel automatically structures this)
            return response()->json($ordres);

        } catch (\Exception $e) {
            Log::error("Error fetching Ordres de Service list: " . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return response()->json(['message' => 'Erreur serveur lors de la récupération des ordres de service.'], 500);
        }
    }

    /**
     * Store a newly created OrdreService resource.
     * POST /api/ordres-service
     */
    public function store(Request $request): JsonResponse
    {
        Log::info("--- OrdreService Store Request Received (Using Public Path) ---");

        $validator = Validator::make($request->all(), [
             'marche_id' => ['required', 'integer', Rule::exists('marche_public', 'id')],
             'type' => ['required', Rule::in(['commencement', 'arret'])],
             'numero' => ['required', 'string', 'max:100', Rule::unique('ordre_service', 'numero')->where(fn ($q) => $q->where('marche_id', $request->input('marche_id')))],
             'date_emission' => 'required|date_format:Y-m-d',
             'description' => 'nullable|string',
             'fichier_joint' => ['nullable', 'file', 'mimes:pdf,doc,docx,xls,xlsx,jpg,jpeg,png,dwg,zip,rar', 'max:20480'], // Adjust max size (20MB here)
             'id_fonctionnaire' => 'nullable|string', // <<< ADDED Validation
         ]);
         if ($validator->fails()) {
              Log::error("OrdreService Store validation failed.", ['errors' => $validator->errors()->toArray()]);
              return response()->json(['message' => 'Erreurs de validation.', 'errors' => $validator->errors()], 422);
         }
         Log::info('OrdreService Store validation passed.');

        $validatedData = $validator->validated(); // Now includes id_fonctionnaire if validated
        $storedRelativePath = null; // Path relative to public_path() to store in DB
        $storedAbsolutePath = null; // Absolute path for potential rollback cleanup

        // Define target directory based on marche_id
        $targetDirRelative = $this->fileUploadPath . '/' . $validatedData['marche_id'];
        $targetDirAbsolute = public_path($targetDirRelative); // Get absolute path

        DB::beginTransaction();
        try {
            // --- Ensure Target Directory Exists and is Writable (Using File Facade) ---
            if (!File::isDirectory($targetDirAbsolute)) {
                Log::info("Dossier cible '{$targetDirAbsolute}' inexistant, création...");
                if (!File::makeDirectory($targetDirAbsolute, 0775, true, true)) {
                    throw new \Exception("Impossible créer dossier: {$targetDirAbsolute}. Vérifiez les permissions.");
                }
                Log::info("Dossier cible créé.");
            }
            // ---

            // 1. Handle File Upload (if present)
            if ($request->hasFile('fichier_joint') && $request->file('fichier_joint')->isValid()) {
                $file = $request->file('fichier_joint');
                $originalName = $file->getClientOriginalName();
                // Generate a safe and unique filename
                $safeOriginalName = preg_replace('/[^A-Za-z0-9\._-]/', '_', $originalName);
                $generatedFilename = date('Ymd-His') . '_' . Str::random(5) . '_' . $safeOriginalName;

                Log::info("Moving OrdreService file.", ['original_name' => $originalName, 'target_dir' => $targetDirAbsolute, 'new_filename' => $generatedFilename]);
                // *** Use move() method with absolute path ***
                $file->move($targetDirAbsolute, $generatedFilename);

                // *** Store RELATIVE path (from public root) in DB ***
                $storedRelativePath = ltrim($targetDirRelative . '/' . $generatedFilename, '/');
                $storedAbsolutePath = $targetDirAbsolute . '/' . $generatedFilename; // For rollback

                Log::info("OrdreService file moved.", ['stored_path' => $storedRelativePath]);
                $validatedData['fichier_joint'] = $storedRelativePath;
            } else {
                $validatedData['fichier_joint'] = null;
            }

            // 2. Set Creator ID (Assuming using authenticated user)
            $authenticatedUser = $request->user(); // Get authenticated user
            if ($authenticatedUser) {
                // *** IMPORTANT: Use the correct primary key of your User model ***
                 $userId = $authenticatedUser->id; // Default assumption, CHANGE IF NEEDED (e.g., $authenticatedUser->idutilisateur)
                if (is_numeric($userId) && filter_var($userId, FILTER_VALIDATE_INT) !== false) {
                    $validatedData['cree_par'] = (int) $userId;
                } else {
                     Log::error('Authenticated user primary key did not return an integer!', ['key_name' => 'id', 'value_returned' => $userId]);
                     $validatedData['cree_par'] = null; // Assume nullable
                }
            } else {
                 Log::warning('No authenticated user found for cree_par.');
                 $validatedData['cree_par'] = null; // Assume nullable
            }

            // 3. Create Database Record
            // $validatedData now includes id_fonctionnaire if provided
            $ordreService = OrdreService::create($validatedData);
            Log::info("OrdreService created successfully.", ['id' => $ordreService->id]);

            // --- Commit ---
            DB::commit();

            // --- Prepare Response with URL ---
            $ordreService->load('marchePublic:id,numero_marche,intitule'); // Load relation
            $appBaseUrl = rtrim(config('app.url', 'http://localhost:8000'), '/');
            $responseData = $ordreService->toArray();

            if (!empty($responseData['fichier_joint'])) {
                $responseData['fichier_joint_url'] = $appBaseUrl . '/' . ltrim($responseData['fichier_joint'], '/');
            } else {
                $responseData['fichier_joint_url'] = null;
            }
            // --- End Response Preparation ---

            return response()->json(['message' => 'Ordre de service créé avec succès.', 'ordre_service' => $responseData], 201);

        } catch (Throwable $e) { // Catch Throwable
            DB::rollBack();
            Log::error("Error creating Ordre Service: " . $e->getMessage(), ['trace' => $e->getTraceAsString()]);

            // --- Attempt cleanup using File facade and absolute path ---
            if ($storedAbsolutePath && File::exists($storedAbsolutePath)) {
                 Log::warning("Rolling back. Attempting cleanup of moved file.", ['file_path' => $storedAbsolutePath]);
                 try { File::delete($storedAbsolutePath); Log::info("Cleaned up moved file.", ['file_path' => $storedAbsolutePath]); }
                 catch (\Exception $fsEx) { Log::error("Failed cleanup moved file.", ['exception' => $fsEx->getMessage()]); }
            }
            // ---

            $errorMessage = 'Erreur serveur lors de la création.';
            if ($e instanceof \Exception && (str_contains($e->getMessage(), 'Impossible créer dossier') || str_contains($e->getMessage(), 'Permissions écriture manquantes'))) { $errorMessage = $e->getMessage(); }
            return response()->json(['message' => $errorMessage, 'error_details' => $e->getMessage()], 500);
        }
    }

    /**
     * Display the specified OrdreService resource.
     * GET /api/ordres-service/{ordre_service}
     */
    public function show(OrdreService $ordre_service): JsonResponse
    {
        try {
             $ordre_service->load('marchePublic:id,numero_marche,intitule');

             // --- Generate URL for response ---
             $appBaseUrl = rtrim(config('app.url', 'http://localhost:8000'), '/');
             $responseData = $ordre_service->toArray();

             if (!empty($responseData['fichier_joint'])) {
                 $responseData['fichier_joint_url'] = $appBaseUrl . '/' . ltrim($responseData['fichier_joint'], '/');
             } else {
                 $responseData['fichier_joint_url'] = null;
             }
             // ---

             Log::info("Showing OrdreService details.", ['id' => $ordre_service->id]);
             return response()->json(['ordre_service' => $responseData]);

        } catch (ModelNotFoundException $e) { // Catch specific exception
             return response()->json(['message' => 'Ordre de service non trouvé.'], 404);
        } catch (\Exception $e) { // Catch general exceptions
             Log::error("Error fetching Ordre Service ID {$ordre_service->id}: " . $e->getMessage());
             return response()->json(['message' => 'Erreur serveur.'], 500);
         }
    }


    /**
     * Update the specified OrdreService resource in storage.
     * PUT/PATCH /api/ordres-service/{ordre_service}
     * Often handled via POST with _method=PUT
     */
    public function update(Request $request, OrdreService $ordre_service): JsonResponse
    {
        Log::info("--- OrdreService Update Request Received for ID: {$ordre_service->id} (Using Public Path) ---");

        $validator = Validator::make($request->all(), [
            'marche_id' => ['required', 'integer', Rule::exists('marche_public', 'id')],
            'type' => ['required', Rule::in(['commencement', 'arret'])],
            'numero' => ['required', 'string', 'max:100', Rule::unique('ordre_service', 'numero')->where(fn ($q) => $q->where('marche_id', $request->input('marche_id')))->ignore($ordre_service->id)],
            'date_emission' => 'required|date_format:Y-m-d',
            'description' => 'nullable|string',
            'fichier_joint' => ['nullable', 'file', 'mimes:pdf,doc,docx,xls,xlsx,jpg,jpeg,png,dwg,zip,rar', 'max:20480'],
            'delete_fichier_joint' => 'nullable|boolean', // Flag from frontend
            'id_fonctionnaire' => 'nullable|string', // <<< ADDED Validation
        ]);
        if ($validator->fails()) {
             Log::error("OrdreService Update validation failed.", ['id' => $ordre_service->id, 'errors' => $validator->errors()->toArray()]);
             return response()->json(['message' => 'Erreurs de validation.', 'errors' => $validator->errors()], 422);
        }
        Log::info("OrdreService Update validation passed for ID: {$ordre_service->id}");

        $validatedData = $validator->validated(); // Now includes id_fonctionnaire if validated
        $oldRelativePath = $ordre_service->fichier_joint;
        $oldAbsolutePath = $oldRelativePath ? public_path($oldRelativePath) : null;
        $newRelativePath = null; // Path to store in DB if new file uploaded
        $newAbsolutePath = null; // Absolute path of new file for rollback cleanup
        $fileToDeleteAfterCommit = null; // Absolute path of OLD file to delete

        // Define target directory based on *potentially new* marche_id
        $targetDirRelative = $this->fileUploadPath . '/' . $validatedData['marche_id'];
        $targetDirAbsolute = public_path($targetDirRelative);

        DB::beginTransaction();
        try {
            // Ensure target directory exists
            if (!File::isDirectory($targetDirAbsolute)) {
                if (!File::makeDirectory($targetDirAbsolute, 0775, true, true)) { throw new \Exception("Impossible créer dossier MAJ: {$targetDirAbsolute}"); }
            }
            // ---

            // --- Handle File Logic ---
            $deleteExistingFile = $request->boolean('delete_fichier_joint');

            if ($request->hasFile('fichier_joint') && $request->file('fichier_joint')->isValid()) {
                // New file uploaded - Replace old one
                $file = $request->file('fichier_joint');
                $originalName = $file->getClientOriginalName();
                $safeOriginalName = preg_replace('/[^A-Za-z0-9\._-]/', '_', $originalName);
                $generatedFilename = date('Ymd-His') . '_' . Str::random(5) . '_' . $safeOriginalName;

                Log::info("Moving NEW file for update.", ['original_name' => $originalName, 'target_dir' => $targetDirAbsolute]);
                $file->move($targetDirAbsolute, $generatedFilename); // Use move()

                $newRelativePath = ltrim($targetDirRelative . '/' . $generatedFilename, '/');
                $newAbsolutePath = $targetDirAbsolute . '/' . $generatedFilename; // For rollback

                $validatedData['fichier_joint'] = $newRelativePath; // Set new path for DB update
                if ($oldAbsolutePath) $fileToDeleteAfterCommit = $oldAbsolutePath; // Mark old file for deletion

            } elseif ($deleteExistingFile && $oldAbsolutePath) {
                // Delete existing file explicitly
                Log::info("Marking existing file for deletion.", ['path' => $oldAbsolutePath]);
                $validatedData['fichier_joint'] = null; // Set path to null in DB
                $fileToDeleteAfterCommit = $oldAbsolutePath; // Mark old file for storage deletion
            } else {
                // Keep existing file path - IMPORTANT: unset from validated data
                unset($validatedData['fichier_joint']);
                 Log::debug("Keeping existing file path (if any).", ['id' => $ordre_service->id, 'path' => $oldRelativePath]);
            }
            // Remove helper field from data to be saved
            unset($validatedData['delete_fichier_joint']);
            // ---

            // --- Update Database Record ---
            // $validatedData includes id_fonctionnaire if provided
            $ordre_service->update($validatedData);
            Log::info("OrdreService record updated successfully.", ['id' => $ordre_service->id]);

            DB::commit();
            Log::info("Update transaction committed for ID: {$ordre_service->id}");

            // --- Delete Old File from Storage (AFTER commit, using File facade) ---
            if ($fileToDeleteAfterCommit && File::exists($fileToDeleteAfterCommit)) {
                 Log::info("Attempting physical deletion of old/replaced file.", ['file_path' => $fileToDeleteAfterCommit]);
                 try {
                     File::delete($fileToDeleteAfterCommit);
                     Log::info("Successfully deleted old file from public storage.", ['file_path' => $fileToDeleteAfterCommit]);
                 }
                 catch (\Exception $fsEx) {
                     Log::error("Failed to delete old file from public storage.", ['exception' => $fsEx->getMessage(), 'path' => $fileToDeleteAfterCommit]);
                 }
            }

            // --- Prepare response with URL ---
            $updatedOrdre = $ordre_service->fresh()->load('marchePublic:id,numero_marche,intitule');
            $appBaseUrl = rtrim(config('app.url', 'http://localhost:8000'), '/');
            $responseData = $updatedOrdre->toArray();
            if (!empty($responseData['fichier_joint'])) {
                $responseData['fichier_joint_url'] = $appBaseUrl . '/' . ltrim($responseData['fichier_joint'], '/');
            } else {
                $responseData['fichier_joint_url'] = null;
            }
            // ---

            return response()->json(['message' => 'Ordre de service mis à jour.', 'ordre_service' => $responseData]);

        } catch (Throwable $e) { // Catch Throwable
            DB::rollBack();
            Log::error("Error updating Ordre Service ID {$ordre_service->id}: " . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            // --- Rollback cleanup for newly moved file ---
            if ($newAbsolutePath && File::exists($newAbsolutePath)) {
                Log::warning("Rolling back update. Attempting cleanup of newly moved file.", ['file_path' => $newAbsolutePath]);
                try { File::delete($newAbsolutePath); Log::info("Cleaned up newly moved file.", ['file_path' => $newAbsolutePath]); }
                catch (\Exception $fsEx) { Log::error("Rollback update cleanup: Failed delete newly moved file.", ['exception' => $fsEx->getMessage()]); }
            }
            // ---

            $errorMessage = 'Erreur serveur lors de la mise à jour.';
            if ($e instanceof \Exception && (str_contains($e->getMessage(), 'Impossible créer dossier') || str_contains($e->getMessage(), 'Permissions écriture manquantes'))) { $errorMessage = $e->getMessage(); }
            return response()->json(['message' => $errorMessage, 'error_details' => $e->getMessage()], 500);
        }
    }


    /**
     * Remove the specified OrdreService resource.
     * DELETE /api/ordres-service/{ordre_service}
     */
    public function destroy(OrdreService $ordre_service): JsonResponse
    {
        Log::info("--- OrdreService Destroy Request Received for ID: {$ordre_service->id} (Using Public Path) ---");
        $relativeFilePath = $ordre_service->fichier_joint; // Get relative path BEFORE deleting record
        $absoluteFilePath = $relativeFilePath ? public_path($relativeFilePath) : null;

        DB::beginTransaction();
        try {
            // --- Delete Database Record ---
            $deleted = $ordre_service->delete();
            if (!$deleted) {
                 throw new \Exception("Database deletion returned false.");
            }
            Log::info("OrdreService record deleted successfully from DB.", ['id' => $ordre_service->id]);

            // --- Commit Transaction ---
            DB::commit();
            Log::info("Destroy transaction committed for ID: {$ordre_service->id}");

            // --- Delete File from Storage (AFTER commit, using File facade) ---
            if ($absoluteFilePath && File::exists($absoluteFilePath)) {
                 Log::info("Attempting physical deletion of associated public file.", ['file_path' => $absoluteFilePath]);
                 try {
                     File::delete($absoluteFilePath);
                     Log::info("Successfully deleted file from public storage.", ['file_path' => $absoluteFilePath]);
                 } catch (\Exception $storageEx) {
                     Log::error("Error deleting file from public storage post-commit.", ['exception' => $storageEx->getMessage(), 'path' => $absoluteFilePath]);
                 }
            } elseif ($relativeFilePath) {
                 Log::warning("Associated file path recorded in DB, but absolute path not found/generated.", ['relative_path' => $relativeFilePath]);
            }

            return response()->json(['message' => 'Ordre de service supprimé avec succès.'], 200);

        } catch (Throwable $e) { // Catch Throwable
            DB::rollBack();
            Log::error("Error deleting Ordre Service ID {$ordre_service->id}: " . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            // Provide specific error message for constraint violation if possible
            if ($e instanceof \Illuminate\Database\QueryException && str_contains($e->getMessage(), 'constraint violation')) {
                 return response()->json(['message' => 'Impossible de supprimer: l\'ordre est peut-être lié à d\'autres enregistrements.'], 409); // 409 Conflict
            }
            return response()->json(['message' => 'Erreur serveur lors de la suppression.', 'error_details' => $e->getMessage()], 500);
        }
    }
}