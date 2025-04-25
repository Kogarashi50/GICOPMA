<?php

namespace App\Http\Controllers;
use Illuminate\Support\Facades\Log;
use App\Http\Controllers\Controller;
use App\Models\Convention;
use App\Models\Projet;
use App\Models\MarchePublic;
use App\Models\Domaine; // <-- Make sure this model exists and has 'Code' and 'Nom' (or similar)
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;


class DashboardController extends Controller
{
    // Helper function to categorize project status (based on assumptions)
    private function getProjectStatusCategory($project) {
        $today = Carbon::today();
        $dateDebut = Carbon::parse($project->Date_Debut);
        $dateFin = $project->Date_Fin ? Carbon::parse($project->Date_Fin) : null;
        $progressPhysi = $project->Etat_Avan_Physi ?? 0;
        $progressFinan = $project->Etat_Avan_Finan ?? 0;

        $isCompleted = ($dateFin && $dateFin < $today) || ($progressPhysi >= 100 && $progressFinan >= 100);
        $isStarted = $dateDebut <= $today;

        if ($isCompleted) {
            return 'Terminé';
        } elseif ($isStarted) {
            // Considered 'En cours' if started but not completed
            return 'En cours';
        } else {
            // Not started yet
            return 'Non démarré';
        }
    }

    /**
     * Get overall statistics for the top cards.
     * GET /api/dashboard/stats
     */
    public function getStats()
    {
        $conventionCount = Convention::count();

        // --- Projects 'En cours' (Complex logic based on status category) ---
        $projectsInProgressCount = 0;
        $totalActiveBudget = 0;
        $allProjects = Projet::select('ID_Projet','Date_Debut', 'Date_Fin', 'Etat_Avan_Physi', 'Etat_Avan_Finan', 'Cout_CRO')->get(); // Fetch necessary fields

        foreach ($allProjects as $project) {
            $status = $this->getProjectStatusCategory($project);
            if ($status === 'En cours') {
                $projectsInProgressCount++;
                $totalActiveBudget += $project->Cout_CRO ?? 0;
            } elseif ($status === 'Terminé') {
                 $totalActiveBudget += $project->Cout_CRO ?? 0; // Include completed project cost in total budget (Assumption)
            }
        }
        // --- End Projects 'En cours' logic ---

        // --- Markets Launched (Assumption: 'En cours' or 'Terminé') ---
        $marketsLaunchedCount = MarchePublic::whereIn('statut', ['En cours', 'Terminé'])->count();
        // --- End Markets Launched ---


        // --- Total Budget Value (Assumption: Sum of Cout_Projet for active/completed projects) ---
        // $totalBudgetValue = Projet::whereIn('status_derived_column', ['En cours', 'Terminé'])->sum('Cout_Projet'); // This requires deriving status first
        // Using the loop above is more straightforward here:
        $totalBudgetValue = $totalActiveBudget;
        // --- End Total Budget Value ---


        return response()->json([
            'convention_count' => $conventionCount,
            'projects_in_progress_count' => $projectsInProgressCount,
            'markets_launched_count' => $marketsLaunchedCount,
            'total_budget_value' => $totalBudgetValue,
        ]);
    }

    /**
     * Get project status distribution for the donut chart.
     * GET /api/dashboard/project-status
     */
    public function getProjectStatusDistribution()
    {
        $statusCounts = [
            'Non démarré' => 0,
            'En cours' => 0,
            'Terminé' => 0,
        ];

        // Re-use the logic from getStats or fetch again if needed
        $allProjects = Projet::select('ID_Projet','Date_Debut', 'Date_Fin', 'Etat_Avan_Physi', 'Etat_Avan_Finan')->get();
        $totalProjects = $allProjects->count();

        if ($totalProjects === 0) {
            return response()->json([]); // Return empty if no projects
        }

        foreach ($allProjects as $project) {
            $status = $this->getProjectStatusCategory($project);
            if (isset($statusCounts[$status])) {
                $statusCounts[$status]++;
            }
        }

        $statusData = [
            // Order matters for the chart
            ['label' => 'Non démarré', 'value' => $statusCounts['Non démarré'], 'percentage' => round(($statusCounts['Non démarré'] / $totalProjects) * 100), 'color' => 'light'], // Grey -> light
            ['label' => 'En cours', 'value' => $statusCounts['En cours'], 'percentage' => round(($statusCounts['En cours'] / $totalProjects) * 100), 'color' => 'warning'], // Orange -> warning
            ['label' => 'Terminé', 'value' => $statusCounts['Terminé'], 'percentage' => round(($statusCounts['Terminé'] / $totalProjects) * 100), 'color' => 'dark'],    // Teal -> dark
        ];

        return response()->json($statusData);
    }

    /**
     * Get budget distribution for the progress bars.
     * GET /api/dashboard/budget-distribution
     */
    public function getBudgetDistribution()
    {
        $budgetData = [];

        // --- Domain Averages (Requires Domaine Model) ---
        $domainAverages = Projet::select('Id_Domaine', DB::raw('AVG(Etat_Avan_Finan) as avg_progress'))
                                ->whereNotNull('Id_Domaine') // Ignore projects without a domain
                                ->groupBy('Id_Domaine')
                                ->with('domaine:Code,Description') // Eager load Domain name using the correct PK 'Code'
                                ->get();

        foreach ($domainAverages as $domainAvg) {
            if ($domainAvg->domaine) { // Check if domain relationship loaded correctly
                 $budgetData[] = [
                     'label' => $domainAvg->domaine->Description ?? "Domaine Code {$domainAvg->Id_Domaine}", // Use Domain name
                     'percentage' => round($domainAvg->avg_progress ?? 0),
                     'color' => 'dark' // Teal -> dark
                 ];
            }
        }
        // Sort domains percentagelly if needed
        usort($budgetData, fn($a, $b) => $b['percentage'] <=> $a['percentage']);
        // --- Specific Projects (Example: Get Projet A, B, C by name/code) ---
        // Adjust project names/codes as needed
        $projectNames = ['Projet A', 'Projet B', 'Projet C']; // Or use Code_Projet if more reliable
        $specificProjects = Projet::whereIn('Nom_Projet', $projectNames) // Or whereIn('Code_Projet', [...])
                                   ->select('Nom_Projet', 'Etat_Avan_Finan')
                                   ->get();

        foreach ($specificProjects as $project) {
             $budgetData[] = [
                 'label' => $project->Nom_Projet,
                 'percentage' => round($project->Etat_Avan_Finan ?? 0),
                 'color' => 'dark' // Teal -> dark
             ];
        }
        $budgetData=[$budgetData[0],$budgetData[1]];

        // --- Fallback if no specific projects found (Get top 3 by cost maybe?) ---
        if ($specificProjects->isEmpty() && count($budgetData) >1) { // Add fallback if no specific projects found
             $fallbackProjects = Projet::orderBy('Date_Fin', 'desc')
                                      ->limit(3) // Get top 3 highest cost projects
                                      ->select('Nom_Projet', 'Etat_Avan_Finan')
                                      ->get();
             foreach ($fallbackProjects as $project) {
                 // Avoid adding duplicates if domain was already added
                 if (!in_array($project->Nom_Projet, array_column($budgetData, 'label'))) {
                     $budgetData[] = [
                         'label' => $project->Nom_Projet,
                         'percentage' => round($project->Etat_Avan_Finan ?? 0),
                         'color' => 'dark' // Teal -> dark
                     ];
                 }
             }
        }

        return response()->json(array_slice($budgetData, 0, 5)); // Limit to max 4 bars (Domain + 3 Projects)
    }

    /**
     * Get counts for dashboard alerts.
     * GET /api/dashboard/alerts
     */
    public function getAlerts()
    {
         // Alert 1: Projects without convention
         $mentionedProjectIds = Convention::whereNotNull('id_projet') // Only consider conventions linked to a project
         ->distinct()             // Get only unique project IDs
         ->pluck('id_projet');    // Retrieve just the 'id_projet' values

// Count projects whose 'ID_Projet' is NOT IN the list of mentioned IDs
$projectsWithoutConvention = Projet::whereNotIn('ID_Projet', $mentionedProjectIds)
                  ->count();
         // Alert 2: Delayed Projects
         $projectsDelayedCount = 0;
         $allProjects = Projet::select('ID_Projet','Date_Debut', 'Date_Fin', 'Etat_Avan_Physi', 'Etat_Avan_Finan')->get();
         $today = Carbon::today();

         foreach ($allProjects as $project) {
            $progressPhysi = $project->Etat_Avan_Physi ?? 0;
            $progressFinan = $project->Etat_Avan_Finan ?? 0;
            $isNotCompleted =  ($progressPhysi < 100 || $progressFinan<100);
            $dateFin = $project->Date_Fin ? Carbon::parse($project->Date_Fin) : null;
             // Considered delayed if end date is past AND it's not 'Terminé'
            if ($dateFin && $dateFin < $today && $isNotCompleted) {
                $projectsDelayedCount++;
            }
         }

         // Format consistent with the example
         // Using Bootstrap icon names (adjust if using a different icon library)
         $alerts = [];
         if ($projectsWithoutConvention > 0) {

             $alerts[] = ['text' => "projet(s) sans convention", 'count' => $projectsWithoutConvention, 'type' => 'warning', 'icon' => 'exclamation-triangle-fill']; // Orange icon
         }
         if ($projectsDelayedCount > 0) {
             $alerts[] = ['text' => "projet(s) en retard", 'count' => $projectsDelayedCount, 'type' => 'danger', 'icon' => 'exclamation-diamond-fill']; // Dark icon (as in target image)
         }

         return response()->json($alerts);
    }

    /**
     * Get upcoming deadlines.
     * GET /api/dashboard/deadlines
     */
    public function getUpcomingDeadlines()
    {
        $upcoming = [];
        $limit = 4; // Show top 3 upcoming deadlines
        $now = Carbon::now()->startOfDay(); // Compare against start of today

        // --- Project Starts/Ends ---
        $projects = Projet::where(function($query) use ($now) {
                                $query->where('Date_Debut', '>=', $now)
                                      ->orWhere('Date_Fin', '>=', $now);
                            })
                            ->select('ID_Projet', 'Nom_Projet', 'Date_Debut', 'Date_Fin')
                            ->orderBy('Date_Debut', 'asc') // Prioritize closer dates
                            ->orderBy('Date_Fin', 'asc')
                            ->limit($limit * 2) // Fetch a bit more initially
                            ->get();

        foreach ($projects as $project) {
            $dateDebut = Carbon::parse($project->Date_Debut);
            $dateFin = $project->Date_Fin ? Carbon::parse($project->Date_Fin) : null;

            if ($dateDebut >= $now) {
                $upcoming[] = ['date' => $dateDebut, 'text' => "Projet {$project->Nom_Projet} commence", 'icon' => 'calendar-event', 'type' => 'project_start', 'sort_date' => $dateDebut];
            }
            // Add end date only if it's upcoming and the project isn't already considered 'Terminé' by definition
            if ($dateFin && $dateFin >= $now && $this->getProjectStatusCategory($project) !== 'Terminé') {
                $upcoming[] = ['date' => $dateFin, 'text' => "Projet {$project->Nom_Projet} se termine", 'icon' => 'calendar-check', 'type' => 'project_end', 'sort_date' => $dateFin];
            }
        }

        // --- Convention Ends (Assumption: field is 'date_fin') ---
        try { // Wrap in try-catch in case the field doesn't exist
             $conventions = Convention::where('created_at', '>=', $now) // <-- ASSUMED FIELD NAME
                                     ->select('id', 'intitule', 'created_at') // <-- Select necessary fields
                                     ->orderBy('created_at', 'asc')
                                     ->limit($limit)
                                     ->get();
             foreach($conventions as $convention){
                  $dateFinConv = Carbon::parse($convention->created_at);
                  $upcoming[] = ['date' => $dateFinConv, 'text' => "Convention {$convention->intitule} se termine", 'icon' => 'calendar-x', 'type' => 'convention_end', 'sort_date' => $dateFinConv];
             }
        } catch (\Exception $e) {
            Log::warning("Could not query convention end dates (field 'date_fin' might be missing or incorrect): " . $e->getMessage());
        }
        // --- End Convention Ends ---


        // --- Market Launches (Assumption: date field is 'date_debut_execution') ---
         try {
             $markets = MarchePublic::where('date_debut_execution', '>=', $now) // <-- ASSUMED FIELD NAME
                               ->whereNotIn('statut', ['Terminé', 'Résilié']) // Don't show launch for completed/cancelled
                               ->select('id', 'intitule', 'date_debut_execution')
                               ->orderBy('date_debut_execution', 'asc')
                               ->limit($limit)
                               ->get();
             foreach($markets as $market){
                 $dateLaunch = Carbon::parse($market->date_debut_execution);
                 $upcoming[] = ['date' => $dateLaunch, 'text' => "Marché {$market->intitule} à lancer", 'icon' => 'building', 'type' => 'market_launch', 'sort_date' => $dateLaunch];
             }
        } catch (\Exception $e) {
             Log::warning("Could not query market launch dates (field 'date_debut_execution' might be missing or incorrect): " . $e->getMessage());
        }
         // --- End Market Launches ---

        // Sort all collected deadlines by date using the dedicated 'sort_date' field
        usort($upcoming, function ($a, $b) {
            return $a['sort_date'] <=> $b['sort_date'];
        });

        // Format the date for display and remove the sort_date field
        $formattedUpcoming = array_map(function($item) {
            $item['display_date'] = $item['date']->isoFormat('D, MMM YYYY'); // Format: 5, mai 2024
            unset($item['date']); // Remove Carbon instance
            unset($item['sort_date']);
            return $item;
        }, array_slice($upcoming, 0, $limit)); // Take only the top N closest deadlines

        return response()->json($formattedUpcoming);
    }
    public function getConventionStatusSummary()
    {
        Log::info('Fetching convention status summary for dashboard...');
        try {
            // Define the statuses you are interested in
            $relevantStatuses = ['signé', 'non signé', 'en cours de signature'];

            // Query the database
            $statusCounts = Convention::whereIn('statut', $relevantStatuses)
                ->select('statut', DB::raw('count(*) as count')) // Count occurrences for each status
                ->groupBy('statut')
                ->pluck('count', 'statut'); // Get results as an associative array [status => count]

            // Format the output array, ensuring all relevant statuses are present (with 0 count if none found)
            // And create user-friendly labels
            $result = collect($relevantStatuses)->map(function ($status) use ($statusCounts) {
                $label = match (strtolower($status)) {
                    'signé'                 => 'Signé',
                    'non signé'             => 'Non Signé',
                    'en cours de signature' => 'En cours de signature',
                    default                 => ucfirst($status) // Fallback if needed
                };
                return [
                    'status' => $label,
                    'count'  => $statusCounts->get($status, 0) // Get the count or default to 0
                ];
            })->values(); // Return as a numerically indexed array of objects

            Log::info('Convention status summary fetched successfully.', ['data' => $result]);
            return response()->json($result);

        } catch (\Exception $e) {
            Log::error('Error fetching convention status summary:', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString() // Optional: for detailed debugging
            ]);
            return response()->json(['message' => 'Erreur serveur lors de la récupération du résumé des statuts de convention.'], 500);
        }
    }
    public function getRecentConventionSummaries()
    {
        Log::info('Fetching recent convention summaries for dashboard...');
        try {
            // Define the desired order of statuses (most important first)
            // Add ALL statuses you might encounter and want to prioritize
            $statusOrder = [
                'signé',
                'en cours de signature',
                'non signé',
                'visé', // Add if applicable
                'en cours de visa', // Add if applicable
                'non visé', // Add if applicable
                'approuvé', // Add if applicable
                'en cours d\'approbation', // Add if applicable
                'non approuvé', // Add if applicable
                // Add any other known statuses here in desired order
                // Conventions with statuses not listed here will appear last
            ];
            Log::debug('Status order defined:', $statusOrder);
            // Fetch a pool of recent conventions with necessary relations for calculation
            // Fetching more than 5 initially to ensure we get relevant ones after sorting
            $recentConventions = Convention::with([
                    // Eager load ConvParts and their Versements to calculate advancement
                    'convParts.versements' => function ($query) {
                        // Select only the amount from versements for efficiency
                        $query->select('id_CP', 'montant_verse');
                    }
                ])
                ->select('id', 'intitule', 'statut', 'cout_global', 'created_at') // Select needed fields
                ->latest() // Order by most recently created first (or use 'id' desc)
                ->limit(30) // Fetch a reasonable pool (e.g., 30) to sort from
                ->get();
                if ($recentConventions->isEmpty()) {
                    Log::warning("No recent conventions found to process.");
                    return response()->json([]); // Return empty if none found
                }
            // Calculate advancement percentage and prepare data structure
            $conventionsWithAdvancement = $recentConventions->map(function ($convention) use ($statusOrder) {
                $totalVerse = 0;
            
                // Sum versements across all ConvParts for this convention
                foreach ($convention->convParts as $convPart) {
                    if ($convPart->relationLoaded('versements') && $convPart->versements !== null) {
                        $totalVerse += $convPart->versements->sum('montant_verse');
                    }
                }

                $advancementPercentage = 0;
                
                if ($convention->cout_global > 0) {
                    // Ensure cout_global is treated as numeric
                    $coutGlobalNum = (float) $convention->cout_global;
                    if ($coutGlobalNum > 0) {
                       $advancementPercentage = round(($totalVerse / $coutGlobalNum) * 100, 2);
                       // Cap percentage at 100% in case of overpayment data
                       $advancementPercentage = min($advancementPercentage, 100);
                    }
                }

                // Clean up the structure (remove loaded relations if not needed in frontend)
                // Keeping 'id', 'intitule', 'statut'
                return [
                    'id' => $convention->id,
                    'intitule' => $convention->intitule,
                    'statut' => $convention->statut, // Keep original status string
                    'advancementPercentage' => $advancementPercentage,
                    // Keep status_priority for sorting, can remove before sending if desired
                    'status_priority' => array_search(strtolower($convention->statut ?? ''), $statusOrder)
                ];
            });

            // Sort the collection based on the status priority
            $sortedConventions = $conventionsWithAdvancement->sortBy(function ($convention) {
                // If status was not found (priority is false), place it last (high number)
                return ($convention['status_priority'] === false) ? 9999 : $convention['status_priority'];
            });

            // Take the top 5 after sorting
            $top5Conventions = $sortedConventions->take(5)->values();



            // Take the top 5 after sorting
            $top5Conventions = $sortedConventions->take(6)->values(); // values() resets keys

            Log::info('Recent convention summaries fetched and processed successfully.', ['data' => $top5Conventions]);

            // Optional: Remove 'status_priority' before sending if not needed by frontend
            // $response_data = $top5Conventions->map(function($item) { unset($item['status_priority']); return $item; });
            // return response()->json($response_data);

             return response()->json($top5Conventions);


        } catch (\Exception $e) {
            Log::error('Error fetching recent convention summaries:', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['message' => 'Erreur serveur lors de la récupération des résumés de convention.'], 500);
        }
    }

}