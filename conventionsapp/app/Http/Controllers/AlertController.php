<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use App\Models\Alert;
use Carbon\Carbon;

class AlertController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = Auth::user();
        $query = Alert::with('alertType')->where('user_id', $user->id);

        if ($request->query('filter') === 'unread') {
            $query->whereNull('read_at');
        }

        $query->orderBy('created_at', 'desc');

        if ($request->has('limit')) {
            $alerts = $query->limit((int)$request->query('limit'))->get();
            return response()->json(['data' => $alerts]);
        } else {
            $alerts = $query->paginate(15);
            return response()->json($alerts);
        }
    }


    public function getUnreadCount(): JsonResponse
    {
        $count = Alert::where('user_id', Auth::id())
                      ->whereNull('read_at')
                      ->count();
        
        return response()->json(['unread_count' => $count]);
    }

    public function markAsRead(Alert $alert): JsonResponse
    {
        if ($alert->user_id !== Auth::id()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if (is_null($alert->read_at)) {
            $alert->read_at = Carbon::now();
            $alert->save();
        }

        return response()->json(['message' => 'Alert marked as read.']);
    }


    public function markAllAsRead(): JsonResponse
    {
        Alert::where('user_id', Auth::id())
             ->whereNull('read_at')
             ->update(['read_at' => Carbon::now()]);

        return response()->json(['message' => 'All alerts marked as read.']);
    }
}