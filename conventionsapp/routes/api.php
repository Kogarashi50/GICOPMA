<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Log;

// --- Controllers ---
use App\Http\Controllers\LoginController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\ConventionController;
use App\Http\Controllers\PartenaireController;
use App\Http\Controllers\DashboardController; // Ensure this is present
use App\Http\Controllers\ChantierController;
use App\Http\Controllers\CommuneController;
use App\Http\Controllers\DomaineController;
use App\Http\Controllers\MarchePublicController;
use App\Http\Controllers\LotController;
use App\Http\Controllers\FichierJointController;
use App\Http\Controllers\ProgrammeController;
use App\Http\Controllers\ProjetController;
use App\Http\Controllers\ProvinceController;
use App\Http\Controllers\SousProjetController;
use App\Http\Controllers\ConvPartController;
use App\Http\Controllers\DocumentController;
use App\Http\Controllers\BonDeCommandeController;
use App\Http\Controllers\ContratDroitCommunController;
use App\Http\Controllers\AvenantController;
use App\Http\Controllers\VersementCPController;
use App\Http\Controllers\ObservationController;
use App\Http\Controllers\FonctionnaireController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\PermissionController;
use App\Http\Controllers\EngagementFinancierController;
use App\Http\Controllers\VersementController;
use App\Http\Controllers\OrdreServiceController;
use App\Http\Controllers\OptionsController;

use App\Http\Controllers\ReportController;
use App\Http\Controllers\AppelOffreController;
use App\Http\Controllers\Api\ActivityLogController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| is assigned the "api" middleware group. Enjoy building your API!
|
*/

// --- Public Routes (No Authentication Required) ---
Route::post('/login', [LoginController::class, 'login'])->name('api.login');
Route::put('/fichiers-joints/{fichier_joint}', [FichierJointController::class, 'updateMetadata']);
// --- Public Helper Routes (Consider if they need protection later) ---
Route::get('/conventions/{convention_id}/commitment-details', [ConvPartController::class, 'getCommitmentsForConvention']);
Route::get('/convparts/lookup', [ConvPartController::class, 'lookupDetails'])->name('convparts.lookup');
 Route::get('/conventions/options/cadre', [ConventionController::class, 'getCadreOptions']);

Route::prefix('options')->group(function () {
 Route::get('/projets-et-sous-projets', [OptionsController::class, 'getProjetsAndSousProjets']);
    

    // Ajoutez ici d'autres routes d'options si nécessaire, par exemple :
    Route::get('/appel-offres', [\App\Http\Controllers\AppelOffreController::class, 'getOptions']);
    Route::get('/fonctionnaires', [\App\Http\Controllers\FonctionnaireController::class, 'getOptions']); // Assurez-vous que ce contrôleur/méthode existe
    Route::get('/conventions', [\App\Http\Controllers\ConventionController::class, 'getOptions']); // Assurez-vous que ce contrôleur/méthode existe
});
Route::get('/projets/unique/{field}', [ProjetController::class, 'getUniqueFieldValues']);

    // Standard Observation Routes
 
// --- Protected Routes (Require Sanctum Authentication & Permissions) ---
Route::middleware('auth:sanctum')->group(function () {
   Route::get('observations', [ObservationController::class, 'index'])->middleware('permission:view observations');
    Route::post('observations', [ObservationController::class, 'store'])->middleware('permission:create observations');

   Route::get('observations/{observation}', [ObservationController::class, 'show'])->middleware('permission:view observations');
    Route::put('observations/{observation}', [ObservationController::class, 'update'])->middleware('permission:update observations');

    Route::delete('observations/{observation}', [ObservationController::class, 'destroy'])->middleware('permission:delete observations');    // --- User & Role Management ---
    
   // --- Appel Offres Routes ---
    Route::get('/appel-offres', [AppelOffreController::class, 'index'])->middleware('permission:view appeloffres');
    Route::post('/appel-offres', [AppelOffreController::class, 'store'])->middleware('permission:create appeloffres');
    Route::get('/appel-offres/{appel_offre}', [AppelOffreController::class, 'show'])->middleware('permission:view appeloffres'); // Consider singular permission
    Route::put('/appel-offres/{appel_offre}', [AppelOffreController::class, 'update'])->middleware('permission:update appeloffres');
    Route::delete('/appel-offres/{appel_offre}', [AppelOffreController::class, 'destroy'])->middleware('permission:delete appeloffres');

    // --- Auth Related ---
    Route::post('/logout', [LoginController::class, 'logout'])->name('api.logout');
    Route::get('/user', function (Request $request) {
        $user = $request->user();
        if ($user) {
            $user->loadMissing(['fonctionnaire', 'roles', 'permissions']); // Eager load relations
            $responseData = $user->toArray();
            // Ensure roles and permissions are correctly formatted if not already by toArray() with Spatie package
            $responseData['roles'] = $user->getRoleNames()->toArray();
            $responseData['permissions'] = $user->getAllPermissions()->pluck('name')->toArray();
            return response()->json($responseData);
        }
        return response()->json(['message' => 'Unauthenticated.'], 401);
     })->name('api.user.details');
Route::get('/users/options', [UserController::class, 'getOptions'])->name('api.users.options')->middleware('permission:manage users');
    Route::apiResource('users', UserController::class)->middleware('permission:manage users');
    Route::get('/roles', [RoleController::class, 'index'])->middleware('permission:manage roles');
    Route::apiResource('roles', RoleController::class)->middleware('permission:manage roles');
    Route::get('/permissions', [PermissionController::class, 'index'])->middleware('permission:manage roles');
    Route::put('/user/password', [UserController::class, 'updatePassword'])->name('api.user.password.update');

    //---- logs history---/
    Route::middleware('permission:view history')->group(function(){
        Route::get('/activity-log', [ActivityLogController::class, 'index'])->name('api.activity_log.index');
        Route::get('/activity-log/event-types', [ActivityLogController::class, 'getEventTypes'])->name('api.activity_log.event_types');
        Route::get('/activity-log/{id}', [ActivityLogController::class, 'show'])->where('id', '[0-9]+')->name('api.activity_log.show');
    });

    // --- Dashboard ---
    // All routes within this group will have the prefix '/api/dashboard' and the middleware 'permission:view dashboard'
    Route::prefix('dashboard')->name('dashboard.')->middleware('permission:view dashboard')->group(function () {
        Route::get('/stats', [DashboardController::class, 'getStats'])->name('stats');
        Route::get('/project-status', [DashboardController::class, 'getProjectStatusDistribution'])->name('project-status'); // Mapped to getProjectStatusDistribution
        Route::get('/deadlines', [DashboardController::class, 'getUpcomingDeadlines'])->name('deadlines');       // Mapped to getUpcomingDeadlines
        Route::get('/alerts', [DashboardController::class, 'getAlerts'])->name('alerts');
        Route::get('/recent-convention-summaries', [DashboardController::class, 'getRecentConventionSummaries'])->name('recent-convention-summaries');

        // Optional: Uncomment if you plan to use these from the frontend dashboard
        // Route::get('/budget-distribution', [DashboardController::class, 'getBudgetDistribution'])->name('budget-distribution');
        // Route::get('/convention-status-summary', [DashboardController::class, 'getConventionStatusSummary'])->name('convention-status-summary');
    });
Route::get('/projets/{projet_code}/locations', [ProjetController::class, 'getLocations'])
     ->name('projets.locations');

    // --- Conventions ---
    Route::get('/conventions', [ConventionController::class, 'index'])->middleware('permission:view conventions');
    Route::post('/conventions', [ConventionController::class, 'store'])->middleware('permission:create conventions');
    Route::get('/conventions/{convention}', [ConventionController::class, 'show'])->middleware('permission:view conventions');
    Route::put('/conventions/{convention}', [ConventionController::class, 'update'])->middleware('permission:update conventions');
    Route::delete('/conventions/{convention}', [ConventionController::class, 'destroy'])->middleware('permission:delete conventions');
    Route::get('/conventions/{convention}/partenaire-options', [ConventionController::class, 'getPartenaireOptions'])
        ->middleware('permission:view conventions|update conventions|create conventions|create versements_cp|update versements_cp');

    // --- Partenaires ---
    Route::apiResource('partenaires', PartenaireController::class)
        ->parameters(['partenaires' => 'partenaire'])
        ->middleware([
            'index'   => 'permission:view partenaires',
            'store'   => 'permission:create partenaires',
            'show'    => 'permission:view partenaires',
            'update'  => 'permission:update partenaires',
            'destroy' => 'permission:delete partenaires',
        ]);
    Route::get('/partenaires/summary', [PartenaireController::class, 'getFinancialSummary'])->name('partenaires.financialSummary')->middleware('permission:view partenaire summary');
    Route::get('/partenaires/{id}/details-with-summary', [PartenaireController::class, 'getDetailsWithSummary'])
        ->name('partenaires.detailsWithSummary')->where('id', '[0-9]+')->middleware('permission:view partenaire summary');

    // --- Marches Publics & Related ---
    Route::apiResource('marches-publics', MarchePublicController::class)
        ->parameters(['marches-publics' => 'marches_public'])
        ->middleware([
            'index'   => 'permission:view marches',
            'store'   => 'permission:create marches',
            'show'    => 'permission:view marches',
            'update'  => 'permission:update marches',
            'destroy' => 'permission:delete marches',
        ]);
    Route::get('/marches-publics/{marche}/lots', [LotController::class, 'indexForMarche'])->middleware('permission:view marches');
    Route::get('/marches-publics/{marche}/fichiers', [FichierJointController::class, 'indexForMarche'])->middleware('permission:view marches');
    Route::get('/fichiers-telecharger/{fichier_joint}', [FichierJointController::class, 'download'])->middleware('permission:download fichiers');
Route::put('/fichiers-joints-os/{fichierJoint}', [FichierJointOsController::class, 'update']);
    // --- Ordre de Service ---
    Route::apiResource('ordres-service', OrdreServiceController::class)
        ->parameters(['ordres-service' => 'ordre_service'])
        ->middleware([
            'index'   => 'permission:view ordres_service',
            'store'   => 'permission:create ordres_service',
            'show'    => 'permission:view ordres_service',
            'update'  => 'permission:update ordres_service',
            'destroy' => 'permission:delete ordres_service',
        ]);

    // --- Avenants ---
    Route::apiResource('avenants', AvenantController::class)->middleware([
        'index'   => 'permission:view avenants',
        'store'   => 'permission:create avenants',
        'show'    => 'permission:view avenants',
        'update'  => 'permission:update avenants',
        'destroy' => 'permission:delete avenants',
    ]);

    // --- Bon de Commande ---
    Route::apiResource('bon-de-commande', BonDeCommandeController::class)
        ->parameters(['bon-de-commande' => 'bon_de_commande'])
        ->middleware([
            'index'   => 'permission:view bon_commande',
            'store'   => 'permission:create bon_commande',
            'show'    => 'permission:view bon_commande',
            'update'  => 'permission:update bon_commande',
            'destroy' => 'permission:delete bon_commande',
        ]);

    // --- Contrat Droit Commun ---
    Route::apiResource('contrat-droit-commun', ContratDroitCommunController::class)
        ->parameters(['contrat-droit-commun' => 'contrat_droit_commun'])
        ->middleware([
            'index'   => 'permission:view contrat_droit_commun',
            'store'   => 'permission:create contrat_droit_commun',
            'show'    => 'permission:view contrat_droit_commun',
            'update'  => 'permission:update contrat_droit_commun',
            'destroy' => 'permission:delete contrat_droit_commun',
        ]);

    // --- Chantiers ---
    Route::apiResource('chantiers', ChantierController::class)->middleware([
        'index'   => 'permission:view chantiers',
        'store'   => 'permission:create chantiers',
        'show'    => 'permission:view chantiers',
        'update'  => 'permission:update chantiers',
        'destroy' => 'permission:delete chantiers',
    ]);

    // --- Programmes ---
    Route::apiResource('programmes', ProgrammeController::class)->middleware([
        'index'   => 'permission:view programmes',
        'store'   => 'permission:create programmes',
        'show'    => 'permission:view programmes',
        'update'  => 'permission:update programmes',
        'destroy' => 'permission:delete programmes',
    ]);

    // --- Domaines ---
    Route::apiResource('domaines', DomaineController::class)->middleware([
        'index'   => 'permission:view domaines',
        'store'   => 'permission:create domaines',
        'show'    => 'permission:view domaines',
        'update'  => 'permission:update domaines',
        'destroy' => 'permission:delete domaines',
    ]);

    // --- Communes ---
    Route::apiResource('communes', CommuneController::class)->middleware([
        'index'   => 'permission:view communes',
        'store'   => 'permission:create communes',
        'show'    => 'permission:view communes',
        'update'  => 'permission:update communes',
        'destroy' => 'permission:delete communes',
    ]);

    // --- Projets ---
    Route::apiResource('projets', ProjetController::class)->middleware([
        'index'   => 'permission:view projets',
        'store'   => 'permission:create projets',
        'show'    => 'permission:view projets',
        'update'  => 'permission:update projets',
        'destroy' => 'permission:delete projets',
    ]);

    // --- Provinces ---
    Route::apiResource('provinces', ProvinceController::class)->middleware([
        'index'   => 'permission:view provinces',
        'store'   => 'permission:create provinces',
        'show'    => 'permission:view provinces',
        'update'  => 'permission:update provinces',
        'destroy' => 'permission:delete provinces',
    ]);

    // --- SousProjets ---
    Route::apiResource('sousprojets', SousProjetController::class)->middleware([
        'index'   => 'permission:view sousprojets',
        'store'   => 'permission:create sousprojets',
        'show'    => 'permission:view sousprojets',
        'update'  => 'permission:update sousprojets',
        'destroy' => 'permission:delete sousprojets',
    ]);

    // --- ConvPart ---
    Route::apiResource('convparts', ConvPartController::class)->middleware(['permission:view conventions|create conventions|update conventions']);

    // --- Engagements Financiers (for Projets) ---
    Route::apiResource('engagements-financiers', EngagementFinancierController::class)
        ->parameters(['engagements-financiers' => 'engagements_financier'])
        ->middleware([
            'index'   => 'permission:view engagements_financiers',
            'store'   => 'permission:create engagements_financiers',
            'show'    => 'permission:view engagements_financiers',
            'update'  => 'permission:update engagements_financiers',
            'destroy' => 'permission:delete engagements_financiers',
        ]);

    // --- Versements (Convention Payments - CP) ---
    Route::apiResource('versements', VersementCPController::class)->middleware([
        'index'   => 'permission:view versements_cp',
        'store'   => 'permission:create versements_cp',
        'show'    => 'permission:view versements_cp',
        'update'  => 'permission:update versements_cp',
        'destroy' => 'permission:delete versements_cp',
    ]);

    // --- Versements (Project Payments - PP) ---
    Route::prefix('versementspp')->as('versementspp.')->group(function () {
        Route::middleware(['permission:view versements_pp|create versements_pp'])->group(function () {
            Route::get('/project/{projetId}/engaged-partners', [VersementController::class, 'getEngagedPartnersForProject'])
                ->name('getEngagedPartnersForProject')->where('projetId', '[0-9]+');
            Route::get('/get-engagement-id', [VersementController::class, 'getEngagementIdForProjectPartner'])
                ->name('getEngagementIdForProjectPartner');
        });
        Route::get('/', [VersementController::class, 'index'])->name('index')->middleware('permission:view versements_pp');
        Route::post('/', [VersementController::class, 'store'])->name('store')->middleware('permission:create versements_pp');
        Route::get('/{versement_pp}', [VersementController::class, 'show'])->name('show')->middleware('permission:view versements_pp');
        Route::put('/{versement_pp}', [VersementController::class, 'update'])->name('update')->middleware('permission:update versements_pp');
        Route::delete('/{versement_pp}', [VersementController::class, 'destroy'])->name('destroy')->middleware('permission:delete versements_pp');
    });

    // --- Document View ---
    Route::get('/document/{document}', [DocumentController::class, 'show'])->middleware('permission:view documents');
    Route::get('/report/download', [ReportController::class, 'generatePdfReport'])->name('report.download')->middleware('permission:download report');


    // --- OPTIONS ROUTES FOR DROPDOWNS ---
    Route::prefix('options')->name('options.')->group(function () {
        Route::get('/conventions', [ConventionController::class, 'getOptions'])
             ->name('conventions')
             ->middleware('permission:create projets|update projets|create avenants|update avenants|create marches|update marches|create ordres_service|update ordres_service|view conventions|update conventions|create conventions|create versements_cp|update versements_cp');

        Route::get('/programmes', [ProgrammeController::class, 'getOptions'])
             ->name('programmes')
             ->middleware('permission:create conventions|update conventions|create projets|update projets');

        Route::get('/projets', [ProjetController::class, 'getOptions'])
             ->name('projets')
             ->middleware('permission:create conventions|update conventions');

        Route::get('/partenaires', [PartenaireController::class, 'getOptions'])
              ->name('partenaires')
             ->middleware('permission:create projets|update projets|create avenants|update avenants|create conventions|update conventions|create versements_cp|update versements_cp|create versements_pp|update versements_pp');

        Route::get('/fonctionnaires', [FonctionnaireController::class, 'indexForDropdown'])
            ->name('fonctionnaires')
            ->middleware('permission:create projets|update projets|create avenants|update avenants|create conventions|update conventions|create marches|update marches|create ordres_service|update ordres_service|create bon_commande|update bon_commande|manage users');

        Route::get('/appel-offres', [AppelOffreController::class, 'getOptions'])
             ->name('appeloffres')
             ->middleware('permission:create marches|update marches');

        Route::get('/convparts', [ConvPartController::class, 'getOptions'])
              ->name('convparts')
              ->middleware('permission:create versements_cp|update versements_cp');

        Route::get('/provinces', [ProvinceController::class, 'getOptions'])
            ->name('provinces')
            ->middleware('permission:create conventions|update conventions|create projets|update projets');
        Route::get('/communes', [CommuneController::class, 'getOptions'])
        ->name('communes')
        ->middleware('permission:create projets|update projets'); 
        Route::get('/domaines', [DomaineController::class, 'getOptions'])
            ->name('domaines')
            ->middleware('permission:create projets|update projets|create conventions|update conventions');

        Route::get('/chantiers', [ChantierController::class, 'getOptions'])
            ->name('chantiers')
            ->middleware('permission:create projets|update projets|create conventions|update conventions');
        Route::get('/marches-publics', [MarchePublicController::class, 'getOptions'])
            ->name('marches-publics') // Route name: options.marches-publics
            ->middleware('permission:create bon_commande|update bon_commande|view bon_commande');
    }); // End options prefix group

}); // End auth:sanctum middleware group


// --- React Catch-all Route (Must be last *after* all other specific routes) ---
// This route should only be hit if no other route (especially API routes) matches.
// It's primarily for SPA routing where the frontend handles different "pages".
Route::get('/{any?}', function () {
    Log::debug("React catch-all route hit for: " . request()->path()); // Log when this is hit
    if (file_exists(public_path('index.html'))) {
         return file_get_contents(public_path('index.html'));
    }
    Log::error("React index.html not found in public path.");
    abort(404, 'React index.html not found.');
})->where('any', '^(?!api\/)[\/\w\.-]*'); // Ensure it does NOT match /api/* paths