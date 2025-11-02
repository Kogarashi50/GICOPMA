<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use App\Models\AlertType;
use App\Models\AlertOptOut;

class UserAlertSettingsController extends Controller
{
    /**
     * Get the alert settings for the currently authenticated user.
     * This will return all alert types the user is ELIGIBLE for,
     * and indicate which ones they have opted out of.
     */
    public function index(): JsonResponse
    {
        $user = Auth::user();
        Log::info("Fetching alert settings for user ID: {$user->id}");

        try {
            // 1. Get all permissions the user has.
            $userPermissions = $user->getAllPermissions()->pluck('name');

            // 2. Find all alert types that require one of the user's permissions.
            $eligibleAlertTypes = AlertType::whereIn('permission_name', $userPermissions)
                ->orderBy('name')
                ->get(['id', 'name', 'description']);

            // 3. Find which of these eligible alerts the user has opted out of.
            $optedOutIds = AlertOptOut::where('user_id', $user->id)
                ->whereIn('alert_type_id', $eligibleAlertTypes->pluck('id'))
                ->pluck('alert_type_id');

            // 4. Combine the data for the frontend.
            $settings = $eligibleAlertTypes->map(function ($alertType) use ($optedOutIds) {
                return [
                    'id' => $alertType->id,
                    'name' => $alertType->name,
                    'description' => $alertType->description,
                    'subscribed' => !$optedOutIds->contains($alertType->id), // User is subscribed if NOT in the opt-out list
                ];
            });

            return response()->json(['settings' => $settings]);

        } catch (\Exception $e) {
            Log::error("Error fetching alert settings for user ID {$user->id}: " . $e->getMessage());
            return response()->json(['message' => 'Erreur lors du chargement des paramètres.'], 500);
        }
    }

    /**
     * Update the alert settings for the currently authenticated user.
     */
    public function update(Request $request): JsonResponse
    {
        $user = Auth::user();
        Log::info("Updating alert settings for user ID: {$user->id}");

        $validated = $request->validate([
            'subscriptions' => 'present|array',
            'subscriptions.*.id' => 'required|integer|exists:alert_types,id',
            'subscriptions.*.subscribed' => 'required|boolean',
        ]);

        try {
            DB::beginTransaction();
            
            // Get all alert types the user is actually eligible for, as a security check
            $userPermissions = $user->getAllPermissions()->pluck('name');
            $eligibleAlertTypeIds = AlertType::whereIn('permission_name', $userPermissions)->pluck('id');

            foreach ($validated['subscriptions'] as $setting) {
                $alertTypeId = $setting['id'];

                // Security: Ensure user is not trying to opt-in/out of an alert they are not eligible for
                if (!$eligibleAlertTypeIds->contains($alertTypeId)) {
                    Log::warning("User {$user->id} attempted to modify subscription for ineligible alert type ID {$alertTypeId}.");
                    continue; // Skip this one
                }

                // If the user wants to be subscribed, we DELETE their opt-out record.
                if ($setting['subscribed']) {
                    AlertOptOut::where('user_id', $user->id)
                               ->where('alert_type_id', $alertTypeId)
                               ->delete();
                } 
                // If the user wants to be unsubscribed, we CREATE (or update) their opt-out record.
                else {
                    AlertOptOut::updateOrCreate(
                        ['user_id' => $user->id, 'alert_type_id' => $alertTypeId],
                        ['user_id' => $user->id, 'alert_type_id' => $alertTypeId]
                    );
                }
            }

            DB::commit();

            return response()->json(['message' => 'Paramètres de notification mis à jour.']);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Error updating alert settings for user ID {$user->id}: " . $e->getMessage());
            return response()->json(['message' => 'Une erreur est survenue lors de la mise à jour.'], 500);
        }
    }
}