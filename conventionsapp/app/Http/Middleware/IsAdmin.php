<?php
namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class IsAdmin

{
    public function handle(Request $request, Closure $next)
    {       
        $user= Auth::user();
        if (Auth::check()) {
            $role = session('role');
            if ($role >= 1) {
                return $next($request);
            } else {
                Auth::logout();
                return response()->json('Oups, Autorisation insufissante.', 403);
                
                // return view('authentification.login');
            }
        } else {
            return redirect()->route('login');
        }

    }
}
