<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Log;

// --- Controllers ---
use App\Http\Controllers\LoginController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\ConventionController;
use App\Http\Controllers\PartenaireController;
use App\Http\Controllers\DashboardController;
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
use App\Http\Controllers\EngagementController; // Review if needed
use App\Http\Controllers\VersementCPController; // For Convention Payments
use App\Http\Controllers\FonctionnaireController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\PermissionController;
use App\Http\Controllers\EngagementFinancierController; // For Project Engagements
use App\Http\Controllers\VersementController;       // For Project Payments (PP)
use App\Http\Controllers\OrdreServiceController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\AppelOffreController; // Import from Api 1 & 2
use App\Http\Controllers\Api\ActivityLogController; // <<<--- ADDED Import from Api 2

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// --- Public Routes (No Authentication Required) ---
Route::post('/login', [LoginController::class, 'login'])->name('api.login');

// --- Public Helper Routes (Consider if they need protection later) ---
Route::get('/conventions/options', [ConventionController::class, 'getOptions'])->name('conventions.options');
Route::get('/conventions/{convention_id}/commitment-details', [ConvPartController::class, 'getCommitmentsForConvention']);
Route::get('/convparts/lookup', [ConvPartController::class, 'lookupDetails'])->name('convparts.lookup');
Route::get('/convparts/options', [ConvPartController::class, 'getOptions'])->name('convparts.options');

// --- Protected Routes (Require Sanctum Authentication & Permissions) ---
Route::middleware('auth:sanctum')->group(function () {

    // --- Appel Offres Routes ---
    Route::get('/appel-offres', [AppelOffreController::class, 'index'])
        ->middleware('permission:view appeloffres');
    Route::post('/appel-offres', [AppelOffreController::class, 'store'])
        ->middleware('permission:create appeloffres');
    Route::get('/appel-offres/{appel_offre}', [AppelOffreController::class, 'show'])
        ->middleware('permission:view appeloffre details');
    Route::put('/appel-offres/{appel_offre}', [AppelOffreController::class, 'update']) // Using PUT explicitly
        ->middleware('permission:update appeloffres');
    Route::delete('/appel-offres/{appel_offre}', [AppelOffreController::class, 'destroy'])
        ->middleware('permission:delete appeloffres'); // <<< CORRECTED Permission (no  )

    // --- Auth Related ---
    Route::post('/logout', [LoginController::class, 'logout'])->name('api.logout');
    Route::get('/user', function (Request $request) {
        $user = $request->user();
        $user->loadMissing('fonctionnaire');
        $responseData = $user->toArray();
        $responseData['roles'] = $user->getRoleNames()->toArray();
        $responseData['permissions'] = $user->getAllPermissions()->pluck('name')->toArray();
        return response()->json($responseData);
     })->name('api.user.details');

    // --- User & Role Management ---
    Route::get('/users/options', [UserController::class, 'getOptions']) // <<<--- ADDED from Api 2
         ->name('api.users.options'); // Add permission if needed
    Route::apiResource('users', UserController::class)->middleware('permission:manage users');
    Route::get('/roles', [RoleController::class, 'index'])->middleware('permission:manage roles');
    Route::apiResource('roles', RoleController::class)->middleware('permission:manage roles');
    Route::get('/permissions', [PermissionController::class, 'index'])->middleware('permission:manage roles');
    Route::get('/fonctionnaires', [FonctionnaireController::class, 'indexForDropdown'])->middleware('permission:manage users');
    Route::put('/user/password', [UserController::class, 'updatePassword']) // <<<--- INCLUDED from Api 1
        ->name('api.user.password.update');

    // --- Dashboard ---
    Route::prefix('dashboard')->middleware('permission:view dashboard')->group(function () {
        Route::get('/', [DashboardController::class, 'index']);
        Route::get('/stats', [DashboardController::class, 'getStats']);
        Route::get('/project-status', [DashboardController::class, 'getProjectStatusDistribution']);
        Route::get('/budget-distribution', [DashboardController::class, 'getBudgetDistribution']);
        Route::get('/alerts', [DashboardController::class, 'getAlerts']);
        Route::get('/deadlines', [DashboardController::class, 'getUpcomingDeadlines']);
        Route::get('/convention-status-summary', [DashboardController::class, 'getConventionStatusSummary']);
        Route::get('/recent-convention-summaries', [DashboardController::class, 'getRecentConventionSummaries']);
    });

    // --- Conventions ---
    Route::get('/conventions', [ConventionController::class, 'index'])->middleware('permission:view conventions');
    Route::post('/conventions', [ConventionController::class, 'store'])->middleware('permission:create conventions');
    Route::get('/conventions/{convention}', [ConventionController::class, 'show'])->middleware('permission:view conventions');
    Route::put('/conventions/{convention}', [ConventionController::class, 'update'])->middleware('permission:update conventions');
    Route::delete('/conventions/{convention}', [ConventionController::class, 'destroy'])->middleware('permission:delete conventions');
    Route::get('/conventions/{convention}/details', [ConventionController::class, 'details'])->middleware('permission:view convention details');
    Route::get('/conventions/{convention}/partenaire-options', [ConventionController::class, 'getPartenaireOptions'])->middleware('permission:view conventions|update conventions|create conventions');

    // --- Partenaires ---
    Route::get('/partenaires', [PartenaireController::class, 'index'])->middleware('permission:view partenaires');
    Route::post('/partenaires', [PartenaireController::class, 'store'])->middleware('permission:create partenaires');
    Route::get('/partenaires/{partenaire}', [PartenaireController::class, 'show'])->middleware('permission:view partenaires');
    Route::put('/partenaires/{partenaire}', [PartenaireController::class, 'update'])->middleware('permission:update partenaires');
    Route::delete('/partenaires/{partenaire}', [PartenaireController::class, 'destroy'])->middleware('permission:delete partenaires');
    Route::get('/partenaires/{partenaire}/details', [PartenaireController::class, 'details'])->middleware('permission:view partenaire details');
    Route::get('/partenaires/summary', [PartenaireController::class, 'getFinancialSummary'])->name('partenaires.financialSummary')->middleware('permission:view partenaire summary');
    Route::get('/partenaires/{id}/details-with-summary', [PartenaireController::class, 'getDetailsWithSummary'])
        ->name('partenaires.detailsWithSummary')->where('id', '[0-9]+')->middleware('permission:view partenaire summary');

    // --- Marches Publics & Related ---
    Route::get('/marches-publics', [MarchePublicController::class, 'index'])->middleware('permission:view marches');
    Route::post('/marches-publics', [MarchePublicController::class, 'store'])->middleware('permission:create marches');
    Route::get('/marches-publics/{marches_public}', [MarchePublicController::class, 'show'])->middleware('permission:view marches');
    Route::put('/marches-publics/{marches_public}', [MarchePublicController::class, 'update'])->middleware('permission:update marches');
    Route::delete('/marches-publics/{marches_public}', [MarchePublicController::class, 'destroy'])->middleware('permission:delete marches');
    Route::get('/marches-publics/{marche}/lots', [LotController::class, 'indexForMarche'])->middleware('permission:view marches');
    Route::get('/marches-publics/{marche}/fichiers', [FichierJointController::class, 'indexForMarche'])->middleware('permission:view marches');
    Route::get('/fichiers-telecharger/{fichier_joint}', [FichierJointController::class, 'download'])->middleware('permission:download fichiers');

    // --- Ordre de Service ---
    Route::get('/ordres-service', [OrdreServiceController::class, 'index'])->name('ordres-service.index')->middleware('permission:view ordres_service');
    Route::post('/ordres-service', [OrdreServiceController::class, 'store'])->name('ordres-service.store')->middleware('permission:create ordres_service');
    Route::get('/ordres-service/{ordre_service}', [OrdreServiceController::class, 'show'])->where('ordre_service', '[0-9]+')->name('ordres-service.show')->middleware('permission:view ordres_service');
    Route::put('/ordres-service/{ordre_service}', [OrdreServiceController::class, 'update'])->where('ordre_service', '[0-9]+')->name('ordres-service.update')->middleware('permission:update ordres_service');
    Route::delete('/ordres-service/{ordre_service}', [OrdreServiceController::class, 'destroy'])->where('ordre_service', '[0-9]+')->name('ordres-service.destroy')->middleware('permission:delete ordres_service');

    // --- Avenants ---
    Route::get('/avenants', [AvenantController::class, 'index'])->middleware('permission:view avenants');
    Route::post('/avenants', [AvenantController::class, 'store'])->middleware('permission:create avenants');
    Route::get('/avenants/{avenant}', [AvenantController::class, 'show'])->middleware('permission:view avenants');
    Route::put('/avenants/{avenant}', [AvenantController::class, 'update'])->middleware('permission:update avenants');
    Route::delete('/avenants/{avenant}', [AvenantController::class, 'destroy'])->middleware('permission:delete avenants');

    // --- Bon de Commande ---
    Route::get('/bon-de-commande', [BonDeCommandeController::class, 'index'])->middleware('permission:view bon_commande');
    Route::post('/bon-de-commande', [BonDeCommandeController::class, 'store'])->middleware('permission:create bon_commande');
    Route::get('/bon-de-commande/{bon_de_commande}', [BonDeCommandeController::class, 'show'])->middleware('permission:view bon_commande');
    Route::put('/bon-de-commande/{bon_de_commande}', [BonDeCommandeController::class, 'update'])->middleware('permission:update bon_commande');
    Route::delete('/bon-de-commande/{bon_de_commande}', [BonDeCommandeController::class, 'destroy'])->middleware('permission:delete bon_commande');

    // --- Contrat Droit Commun ---
    Route::get('/contrat-droit-commun', [ContratDroitCommunController::class, 'index'])->middleware('permission:view contrat_droit_commun');
    Route::post('/contrat-droit-commun', [ContratDroitCommunController::class, 'store'])->middleware('permission:create contrat_droit_commun');
    Route::get('/contrat-droit-commun/{contrat_droit_commun}', [ContratDroitCommunController::class, 'show'])->middleware('permission:view contrat_droit_commun');
    Route::put('/contrat-droit-commun/{contrat_droit_commun}', [ContratDroitCommunController::class, 'update'])->middleware('permission:update contrat_droit_commun');
    Route::delete('/contrat-droit-commun/{contrat_droit_commun}', [ContratDroitCommunController::class, 'destroy'])->middleware('permission:delete contrat_droit_commun');

    // --- Chantiers ---
    Route::get('/chantiers', [ChantierController::class, 'index'])->middleware('permission:view chantiers');
    Route::post('/chantiers', [ChantierController::class, 'store'])->middleware('permission:create chantiers');
    Route::get('/chantiers/{chantier}', [ChantierController::class, 'show'])->middleware('permission:view chantiers');
    Route::put('/chantiers/{chantier}', [ChantierController::class, 'update'])->middleware('permission:update chantiers');
    Route::delete('/chantiers/{chantier}', [ChantierController::class, 'destroy'])->middleware('permission:delete chantiers');

    // --- Programmes ---
    Route::get('/programmes', [ProgrammeController::class, 'index'])->middleware('permission:view programmes');
    Route::post('/programmes', [ProgrammeController::class, 'store'])->middleware('permission:create programmes');
    Route::get('/programmes/{programme}', [ProgrammeController::class, 'show'])->middleware('permission:view programmes');
    Route::put('/programmes/{programme}', [ProgrammeController::class, 'update'])->middleware('permission:update programmes');
    Route::delete('/programmes/{programme}', [ProgrammeController::class, 'destroy'])->middleware('permission:delete programmes');

    // --- Domaines ---
    Route::get('/domaines', [DomaineController::class, 'index'])->middleware('permission:view domaines');
    Route::post('/domaines', [DomaineController::class, 'store'])->middleware('permission:create domaines');
    Route::get('/domaines/{domaine}', [DomaineController::class, 'show'])->middleware('permission:view domaines');
    Route::put('/domaines/{domaine}', [DomaineController::class, 'update'])->middleware('permission:update domaines');
    Route::delete('/domaines/{domaine}', [DomaineController::class, 'destroy'])->middleware('permission:delete domaines');

    // --- Communes ---
    Route::get('/communes', [CommuneController::class, 'index'])->middleware('permission:view communes');
    Route::post('/communes', [CommuneController::class, 'store'])->middleware('permission:create communes');
    Route::get('/communes/{commune}', [CommuneController::class, 'show'])->middleware('permission:view communes');
    Route::put('/communes/{commune}', [CommuneController::class, 'update'])->middleware('permission:update communes');
    Route::delete('/communes/{commune}', [CommuneController::class, 'destroy'])->middleware('permission:delete communes');

    // --- Projets ---
    Route::get('/projets', [ProjetController::class, 'index'])->middleware('permission:view projets');
    Route::post('/projets', [ProjetController::class, 'store'])->middleware('permission:create projets');
    Route::get('/projets/{projet}', [ProjetController::class, 'show'])->middleware('permission:view projets');
    Route::put('/projets/{projet}', [ProjetController::class, 'update'])->middleware('permission:update projets');
    Route::delete('/projets/{projet}', [ProjetController::class, 'destroy'])->middleware('permission:delete projets');

    // --- Provinces ---
    Route::get('/provinces', [ProvinceController::class, 'index'])->middleware('permission:view provinces');
    Route::post('/provinces', [ProvinceController::class, 'store'])->middleware('permission:create provinces');
    Route::get('/provinces/{province}', [ProvinceController::class, 'show'])->middleware('permission:view provinces');
    Route::put('/provinces/{province}', [ProvinceController::class, 'update'])->middleware('permission:update provinces');
    Route::delete('/provinces/{province}', [ProvinceController::class, 'destroy'])->middleware('permission:delete provinces');

    // --- SousProjets ---
    Route::get('/sousprojets', [SousProjetController::class, 'index'])->middleware('permission:view sousprojets');
    Route::post('/sousprojets', [SousProjetController::class, 'store'])->middleware('permission:create sousprojets');
    Route::get('/sousprojets/{sousprojet}', [SousProjetController::class, 'show'])->middleware('permission:view sousprojets');
    Route::put('/sousprojets/{sousprojet}', [SousProjetController::class, 'update'])->middleware('permission:update sousprojets');
    Route::delete('/sousprojets/{sousprojet}', [SousProjetController::class, 'destroy'])->middleware('permission:delete sousprojets');

    // --- ConvPart ---
    Route::apiResource('convparts', ConvPartController::class)->middleware(['permission:view conventions']); // Adjust permissions as needed

    // --- Engagements Financiers ---
    Route::get('/engagements-financiers', [EngagementFinancierController::class, 'index'])->middleware('permission:view engagements_financiers');
    Route::post('/engagements-financiers', [EngagementFinancierController::class, 'store'])->middleware('permission:create engagements_financiers');
    Route::get('/engagements-financiers/{engagements_financier}', [EngagementFinancierController::class, 'show'])->middleware('permission:view engagements_financiers');
    Route::put('/engagements-financiers/{engagements_financier}', [EngagementFinancierController::class, 'update'])->middleware('permission:update engagements_financiers');
    Route::delete('/engagements-financiers/{engagements_financier}', [EngagementFinancierController::class, 'destroy'])->middleware('permission:delete engagements_financiers');

    // --- Versements (Convention Payments - CP) ---
    Route::get('/versements', [VersementCPController::class, 'index'])->middleware('permission:view versements_cp');
    Route::post('/versements', [VersementCPController::class, 'store'])->middleware('permission:create versements_cp');
    Route::get('/versements/{versement}', [VersementCPController::class, 'show'])->middleware('permission:view versements_cp');
    Route::put('/versements/{versement}', [VersementCPController::class, 'update'])->middleware('permission:update versements_cp');
    Route::delete('/versements/{versement}', [VersementCPController::class, 'destroy'])->middleware('permission:delete versements_cp');

    // --- Versements (Project Payments - PP) ---
    Route::prefix('versementspp')->middleware(['permission:view versements_pp|create versements_pp'])->group(function () {
        Route::get('/project/{projetId}/engaged-partners', [VersementController::class, 'getEngagedPartnersForProject'])
            ->name('versementspp.getEngagedPartnersForProject')->where('projetId', '[0-9]+');
        Route::get('/get-engagement-id', [VersementController::class, 'getEngagementIdForProjectPartner'])
            ->name('versementspp.getEngagementIdForProjectPartner');
    });
    Route::get('/versementspp', [VersementController::class, 'index'])->middleware('permission:view versements_pp');
    Route::post('/versementspp', [VersementController::class, 'store'])->middleware('permission:create versements_pp');
    Route::get('/versementspp/{id}', [VersementController::class, 'show'])->middleware('permission:view versements_pp');
    Route::put('/versementspp/{id}', [VersementController::class, 'update'])->middleware('permission:update versements_pp');
    Route::delete('/versementspp/{id}', [VersementController::class, 'destroy'])->middleware('permission:delete versements_pp');

    // --- Document View ---
    Route::get('/document/{document}', [DocumentController::class, 'show']); // Add appropriate permission

    // --- Activity Log Routes --- <<<--- ADDED from Api 2
    // Route::middleware('permission:view activity log')->group(function () { // Consider adding permission
        Route::get('/activity-log', [ActivityLogController::class, 'index'])
             ->name('api.activity_log.index');
        Route::get('/activity-log/event-types', [ActivityLogController::class, 'getEventTypes'])
             ->name('api.activity_log.event_types');
        Route::get('/activity-log/{id}', [ActivityLogController::class, 'show'])
             ->where('id', '[0-9]+')
             ->name('api.activity_log.show');
    // });

}); // End auth:sanctum group

// --- Public Reporting Route ---
Route::get('/report/download', [ReportController::class, 'generatePdfReport'])
         ->name('report.download'); // Consider if this needs protection

// --- React Catch-all Route (Must be last) ---
Route::get('/{any?}', function () {
    if (file_exists(public_path('index.html'))) {
         return file_get_contents(public_path('index.html'));
    }
    abort(404, 'React index.html not found.');
})->where('any', '^(?!api\/)[\/\w\.-]*');