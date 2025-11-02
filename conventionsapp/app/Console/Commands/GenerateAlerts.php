<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use App\Models\AlertType;
// use App\Models\MarchePublic; // No longer needed for now
use App\Models\Convention;
use App\Models\User;
use App\Models\Alert;
use Carbon\Carbon;
use Illuminate\Support\Str;

class GenerateAlerts extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'alerts:generate';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Scans for conditions and generates system alerts for subscribed users.';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        Log::info('Running GenerateAlerts command...');
        $this->info('Starting alert generation process...');

        // --- CLEANUP: The 'marche' check is disabled for now ---
        // $this->checkForApproachingMarcheDeadlines();
        
        // This is the only active check
        $this->checkForPendingConventionVisas();

        $this->info('Alert generation process finished.');
        Log::info('GenerateAlerts command finished.');
        return 0;
    }

    /**
     * --- CLEANUP: This entire method is commented out. ---
     * --- To re-enable it in the future, simply uncomment it ---
     * --- and restore the call in the handle() method. ---
     */
    /*
    private function checkForApproachingMarcheDeadlines()
    {
        $this->line('Checking for approaching marché deadlines...');
        
        $alertTypeName = 'marche_deadline_approaching';
        $alertType = AlertType::where('name', $alertTypeName)->first();

        if (!$alertType) {
            $this->error("Alert type '{$alertTypeName}' not found in the database. Skipping check.");
            Log::warning("Could not find alert type '{$alertTypeName}' during alert generation.");
            return;
        }

        $targetDate = Carbon::today()->addDays(7)->toDateString();
        $marches = \App\Models\MarchePublic::whereDate('date_limite_offres', $targetDate)->get();

        if ($marches->isEmpty()) {
            $this->info("No marchés found with a deadline on {$targetDate}.");
            return;
        }

        $this->info("Found {$marches->count()} marché(s) with a deadline on {$targetDate}.");

        $subscribedRoleIds = DB::table('alert_subscriptions')
            ->where('alert_type_id', $alertType->id)
            ->pluck('role_id');

        if ($subscribedRoleIds->isEmpty()) {
            $this->warn("No roles are subscribed to '{$alertTypeName}'. No alerts will be sent.");
            return;
        }

        $usersWithRole = User::whereHas('roles', function ($query) use ($subscribedRoleIds) {
            $query->whereIn('id', $subscribedRoleIds);
        })->get();

        $optedOutUserIds = DB::table('alert_opt_outs')
            ->where('alert_type_id', $alertType->id)
            ->pluck('user_id');

        $alertsToCreate = [];

        foreach ($marches as $marche) {
            $recipients = $usersWithRole->filter(function ($user) use ($optedOutUserIds, $alertType) {
                $hasNotOptedOut = !$optedOutUserIds->contains($user->id);
                $hasRequiredPermissions = $user->hasPermissionTo('view marches', 'sanctum') 
                                      && $user->hasPermissionTo($alertType->permission_name, 'sanctum');
                return $hasNotOptedOut && $hasRequiredPermissions;
            });

            if ($recipients->isEmpty()) {
                $this->line(" - No valid recipients for Marché #{$marche->numero_marche}.");
                continue;
            }

            $this->line(" - Preparing " . $recipients->count() . " alerts for Marché #{$marche->numero_marche}.");

            foreach ($recipients as $recipient) {
                $existingAlert = Alert::where('user_id', $recipient->id)
                    ->where('link', '/marche?action=view&id=' . $marche->id)
                    ->where('alert_type_id', $alertType->id)
                    ->whereNull('read_at')
                    ->exists();

                if (!$existingAlert) {
                    $alertsToCreate[] = [
                        'id' => Str::uuid()->toString(),
                        'user_id' => $recipient->id,
                        'alert_type_id' => $alertType->id,
                        'message' => "La date limite pour le marché '{$marche->numero_marche}: {$marche->intitule}' est dans 7 jours.",
                        'link' => '/marche?action=view&id=' . $marche->id,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];
                }
            }
        }

        if (!empty($alertsToCreate)) {
            Alert::insert($alertsToCreate);
            $this->info("Successfully created " . count($alertsToCreate) . " new alerts.");
        } else {
            $this->info("No new alerts needed to be created.");
        }
    }
    */

    /**
     * Finds conventions pending MI visa and creates alerts for each subscribed user.
     * --- THIS IS THE ONLY ACTIVE LOGIC ---
     */
 private function checkForPendingConventionVisas()
    {
        $this->line('Checking for pending convention visas...');

        $today = Carbon::today();
        $checks = [
            18 => ['type_name' => 'convention_visa_approaching_18_days'],
            20 => ['type_name' => 'convention_visa_approaching_20_days'],
            25 => ['type_name' => 'convention_visa_late_25_days'],
        ];

        foreach ($checks as $days => $config) {
            $alertTypeName = $config['type_name'];
            $alertType = AlertType::where('name', $alertTypeName)->first();

            if (!$alertType) {
                $this->error("Alert type '{$alertTypeName}' not found. Skipping check for {$days} days.");
                continue;
            }

            $targetDate = $today->copy()->subDays($days)->toDateString();
            $conventions = Convention::where('Statut', 'en cours de visa')
                                     ->whereDate('date_envoi_visa_mi', $targetDate)
                                     ->get();

            if ($conventions->isEmpty()) {
                $this->info("No conventions found sent for visa on {$targetDate}.");
                continue;
            }

            $this->info("Found {$conventions->count()} convention(s) pending visa for {$days} days.");

            $subscribedRoleIds = DB::table('alert_subscriptions')->where('alert_type_id', $alertType->id)->pluck('role_id');
            if ($subscribedRoleIds->isEmpty()) {
                $this->warn("No roles subscribed to '{$alertTypeName}'.");
                continue;
            }

            $usersWithRole = User::whereHas('roles', fn($q) => $q->whereIn('id', $subscribedRoleIds))->get();
            $optedOutUserIds = DB::table('alert_opt_outs')->where('alert_type_id', $alertType->id)->pluck('user_id');
            $alertsToCreate = [];

            foreach ($conventions as $convention) {
                $recipients = $usersWithRole->filter(function ($user) use ($optedOutUserIds, $alertType) {
                    return !$optedOutUserIds->contains($user->id) && $user->hasPermissionTo($alertType->permission_name, 'sanctum');
                });

                if ($recipients->isEmpty()) {
                    $this->line(" - No valid recipients for Convention #{$convention->Code}.");
                    continue;
                }

                $this->line(" - Preparing {$recipients->count()} alerts for Convention #{$convention->Code}.");

                foreach ($recipients as $recipient) {
                    // --- MODIFICATION START ---

                    // 1. Restore the CORRECT, SPECIFIC link for each convention.
                    $link = '/convention?action=view&id=' . $convention->id;

                    // 2. The duplication check now correctly uses the specific link.
                    //    It will prevent duplicate alerts for the SAME convention, but allow alerts for DIFFERENT conventions.
                    $exists = Alert::where('user_id', $recipient->id)
                                   ->where('link', $link)
                                   ->where('alert_type_id', $alertType->id)
                                   ->exists();

                    // This check now correctly prevents re-alerting for a problem that has already been flagged.
                    // For the "re-alerting" edge case, the most robust solution is to delete old alerts when a convention's status
                    // is resolved (e.g., changes from 'en cours de visa' to 'visé'). This requires a model observer,
                    // which is a more advanced change. The current fix solves the primary duplication bug.

                    if (!$exists) {
                        $alertsToCreate[] = [
                            'id' => Str::uuid()->toString(),
                            'user_id' => $recipient->id,
                            'alert_type_id' => $alertType->id,
                            'message' => "La convention '{$convention->Code}' est en attente de visa depuis {$days} jours.",
                            'link' => $link, // Use the correct, specific link here
                            'created_at' => now(),
                            'updated_at' => now(),
                        ];
                    }
                    // --- MODIFICATION END ---
                }
            }

            if (!empty($alertsToCreate)) {
                Alert::insert($alertsToCreate);
                $this->info("Successfully created " . count($alertsToCreate) . " new '{$alertTypeName}' alerts.");
            } else {
                $this->info("No new '{$alertTypeName}' alerts needed (duplicates already exist for these specific conventions).");
            }
        }
    }
}