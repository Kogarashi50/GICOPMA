<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\User; 

class ViewPreferenceController extends Controller
{
    public function updateViewPreference(Request $request)
    {
        $user = Auth::user();
        
        if ($user instanceof User) {
            $user->view = $request->input('view');
            $user->save();
        }

        return redirect()->route('conventions.index');
    }
}
