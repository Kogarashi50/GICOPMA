<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Spatie\Activitylog\Models\Activity; // <-- Import the Activity model
use Illuminate\Support\Facades\Log;
use Illuminate\Database\Eloquent\Builder; // Import Builder for type hinting
use Illuminate\Http\JsonResponse;       // Import JsonResponse for type hinting
class ActivityLogController extends Controller
{
    /**
     * Display a listing of the activity logs.
     *
     * GET /api/activity-log
     * Handles pagination, sorting, global search, and event filtering.
     *
     * Query Parameters expected by the frontend:
     *  - page=1
     *  - perPage=15
     *  - sortBy=created_at (or other allowed columns)
     *  - sortOrder=desc (or asc)
     *  - search=searchTerm
     *  - event=created|updated|deleted|... (for filtering)
     */
    public function index(Request $request): JsonResponse
    {
        try {
            Log::debug('ActivityLogController@index Request Params:', $request->all());

            // Start Query on the Activity model
            // Eager load the 'causer' relationship. The User model's 'nom_complet'
            // accessor with $appends will automatically include the name.
            $query = Activity::with('causer')
                             ->select('activity_log.*'); // Select all activity log columns

            // --- Filtering ---

            // Filter by Event Type (exact match)
            if ($request->filled('event')) {
                $event = $request->input('event');
                Log::debug("Applying activity log filter: event = {$event}");
                $query->where('event', $event);
            }

            // --- Global Search ---
            // Searches across description, event, and log_name.
            // Searching related fields (causer name, subject details) is more complex
            // and would typically require joins or more advanced techniques if needed.
            if ($request->filled('search')) {
                $searchTerm = '%' . $request->input('search') . '%';
                Log::debug("Applying activity log global search: '{$request->input('search')}'");

                $query->where(function (Builder $q) use ($searchTerm) {
                    $q->where('description', 'like', $searchTerm)
                      ->orWhere('event', 'like', $searchTerm)
                      ->orWhere('log_name', 'like', $searchTerm)
                      // Example: Searching causer email (if needed)
                      ->orWhereHas('causer', function (Builder $userQuery) use ($searchTerm) {
                          $userQuery->where('email', 'like', $searchTerm); // Assumes 'email' field on User
                          // Note: Searching 'nom_complet' directly here is inefficient.
                          // It's better to search email/ID and let frontend display nom_complet.
                      });
                      // Add other searchable fields if necessary
                });
            }

            // --- Sorting ---
            $sortBy = $request->query('sortBy', 'created_at'); // Default sort: newest first
            $sortOrder = $request->query('sortOrder', 'desc');
            $allowedSorts = ['created_at', 'event', 'description', 'log_name']; // Define sortable columns

            if (in_array($sortBy, $allowedSorts)) {
                $query->orderBy($sortBy, $sortOrder);
            } else {
                Log::warning("Invalid sort column requested for activity log: '{$sortBy}'. Defaulting to created_at desc.");
                $query->orderBy('created_at', 'desc'); // Secure fallback sort
            }

           
           $allActivityLogs = $query->get();


            // Return structured JSON response matching DynamicTable expectations
            return response()->json([
                // Key expected by frontend DynamicTable for the items
                'data' => $allActivityLogs,
            
            ], 200);

        } catch (\Exception $e) {
            Log::error('Error fetching activity logs: ' . $e->getMessage(), [
                'exception' => $e,
                'trace' => $e->getTraceAsString() // More detail for debugging if needed
            ]);
            return response()->json(['message' => 'Erreur serveur lors de la récupération de l\'historique.'], 500);
        }
    }

    /**
     * Get distinct event types for the filter dropdown.
     *
     * GET /api/activity-log/event-types
     * Returns options formatted for react-select.
     */
    public function getEventTypes(): JsonResponse
    {
        try {
            $eventTypes = Activity::select('event')
                                  ->whereNotNull('event') // Ensure event is not null
                                  ->distinct()
                                  ->orderBy('event')
                                  ->pluck('event'); // Get an array of unique event names
                                  
            // Format for react-select: [{ value: 'actual_event', label: 'Display Label' }, ...]
            $options = $eventTypes->map(function ($event) {
                Log::debug("Mapping event type: {$event}");
                // Capitalize first letter for a slightly nicer display label
                return ['value' => $event,  'label' => ($event=='created'?'Créé':($event=='updated'?'Modifié':($event=='deleted'?'Supprimé':$event)))];
            })->toArray();

            return response()->json($options, 200);

        } catch (\Exception $e) {
            Log::error('Error fetching distinct activity event types: ' . $e->getMessage());
            return response()->json(['message' => 'Erreur serveur lors de la récupération des types d\'événements.'], 500);
        }
    }

     /**
      * Display the specified activity log entry, intended for a details view/modal.
      *
      * GET /api/activity-log/{id}
      * Eager-loads causer and subject for comprehensive details.
      */
     public function show(string $id): JsonResponse
     {
         Log::debug("ActivityLogController@show requested for ID: {$id}");
         try {
             // Find by primary key 'id'.
             // Eager load both 'causer' (User) and 'subject' (the affected model, e.g., Partenaire).
             // This provides all necessary data for the detailed modal view.
             $activity = Activity::with(['causer', 'subject'])->findOrFail($id);

             Log::info("Successfully fetched details for Activity Log ID: {$id}");

             // Return the single log entry, wrapped in a key for consistency if preferred
             // The frontend modal component expects the raw activity object.
             return response()->json($activity, 200); // Send the whole object directly
             // Or wrap it: return response()->json(['activity' => $activity], 200);


         } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
             Log::warning("API: Activity Log ID {$id} non trouvé pour la vue détaillée.");
             return response()->json(['message' => 'Entrée d\'historique non trouvée.'], 404);
         } catch (\Exception $e) {
             Log::error("API: Erreur récupération détaillée Activity Log ID {$id}:", ['message' => $e->getMessage()]);
             return response()->json(['message' => 'Erreur serveur lors de la récupération des détails de l\'historique.'], 500);
         }
     }
}