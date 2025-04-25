
<?php

use Illuminate\Support\Facades\Route;
// Only import controllers used for actual web routes (if any)
use App\Http\Controllers\AccueilController;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
| Contains routes for the initial application shell, standard web pages, etc.
| Uses the 'web' middleware group (sessions, CSRF).
| API routes should NOT be placed here.
*/

// --- Specific Web Routes (if any) ---
// Place any routes that return Blade views or perform standard web redirects here.
// Example: If /accueil serves a web page, keep it. If it was an API endpoint, remove it.
// Route::get('/accueil', [AccueilController::class, 'index'])->name('accueil');


// --- Catch-all Route for Your React SPA ---
// This MUST be the LAST route defined in this file.
// It serves the main view that loads your React app, allowing
// React Router to handle all non-API frontend navigation.
 // IMPORTANT: Prevents this from matching '/api/*' routes
 Route::get('/login', function (Request $request) {
    // Return a standard API unauthorized response
    return response()->json(['message' => 'Please authenticate via your application.'], 401);
})->name('login');
// use Illuminate\Support\Facades\Log;
// use Illuminate\Support\Facades\Route;
// use App\Http\Controllers\ConventionController;
// use App\Http\Controllers\PartenaireController;
// use App\Http\Controllers\DashboardController;
// use App\Http\Controllers\ChantierController;
// use App\Http\Controllers\CommuneController;
// use App\Http\Controllers\DomaineController;
// use App\Http\Controllers\EngagementController;
// use App\Http\Controllers\ProgrammeController;
// use App\Http\Controllers\ProjetController;
// use App\Http\Controllers\ProvinceController;
// use App\Http\Controllers\SousProjetController;
// use App\Http\Controllers\UtilisateurController;
// use App\Http\Controllers\LoginController;
// use App\Http\Controllers\ConvPartController;

// use App\Http\Middleware\IsAdmin;
// use App\Http\Controllers\ViewPreferenceController;
// use App\Http\Controllers\AccueilController;
// use App\Http\Controllers\DocumentController;
// use Illuminate\Http\Request;




// Route::post('/logout', [LoginController::class, 'logout'])->name('logout');
// Route::post('/login', [LoginController::class, 'login'])->name('login');


// Route::middleware('IsAdmin')->group(function () {
//     // $user = auth()->user();
//     // logger($user);
//     // Route::get('/accueil', [AccueilController::class, 'index'])->name('accueil');

//     Route::resource('conventions', ConventionController::class);
//     Route::get('conventions/{id}/details', [ConventionController::class, 'details'])->name('conventions.details');
//     Route::get('partenaires/{id}/details', [PartenaireController::class, 'details'])->name('partenaires.details');
//     Route::resource('partenaires', PartenaireController::class);
//     Route::resource('chantiers', ChantierController::class);
//     Route::resource('programmes', ProgrammeController::class);
//     Route::resource('domaines', DomaineController::class);
//     Route::resource('communes', CommuneController::class);
//     Route::resource('engagements', EngagementController::class);
//     Route::resource('projets', ProjetController::class);
//     Route::resource('provinces', ProvinceController::class);
//     Route::resource('sousprojets', SousProjetController::class);
//     Route::resource('utilisateurs', UtilisateurController::class);
//     Route::put('/editpref', [UtilisateurController::class, 'editpref'])->name('editpref');
//     Route::resource('convparts', ConvPartController::class);

//     Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');
//     // Route::redirect('/','conventions');
// Route::get('/document/{id}', [DocumentController::class, 'show'])->name('document.show');

// });

// Route::get('/accueil', [AccueilController::class, 'index'])->name('accueil');
// Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
//     $user = $request->user();

 
//     if (!$user) {
//          return response()->json(['message' => 'Unauthenticated.'], 401);
//     }


//     return $user; 
// }); -->
//<!-- // Route::get('{any}',function (){
//     return view('index');

// })->where('any','.*'); -->


Route::get('/{any?}', function () {
    // Ensure the React build index.html exists
    if (file_exists(public_path('index.html'))) {
         return file_get_contents(public_path('index.html'));
    }
    // Optional fallback
    abort(404, 'React index.html not found.');
})->where('any', '^(?!api\/)[\/\w\.-]*'); 


