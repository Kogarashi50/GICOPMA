<?php

namespace App\Http\Controllers;

use App\Models\Convention;
use App\Models\Projet;
use App\Models\MarchePublic;
use App\Models\Province; // Needed for Localisation names
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Barryvdh\DomPDF\Facade\Pdf; // <-- Import the PDF Facade
use Carbon\Carbon; // For generation date

class ReportController extends Controller
{
    /**
     * Generate and stream the comprehensive PDF report.
     *
     * @param Request $request
     * @return \Illuminate\Http\Response
     */
    public function generatePdfReport(Request $request)
    {
        Log::info('--- PDF Report Generation Started ---');

        try {
            // 1. Fetch ALL Data with Eager Loading
            // Conventions Section Data
            $conventions = Convention::with([
                'programme:Id,Description', // Select specific fields
                'projet:ID_Projet,Code_Projet,Nom_Projet', // Select specific fields
                'documents:Id_Doc,Id_Conv,file_name,Intitule,file_type', // Select specific fields
                'convParts.partenaire:Id,Description', // Nested eager load partner name
                'convParts.versements:id,id_CP,montant_verse', // Nested eager load payments (only amount needed for sum)
                'avenants' // Load avenants (define needed fields if possible: 'avenants:id,convention_id,numero,objet,...')
            ])->orderBy('code')->get();

            // Projet Section Data
            $projets = Projet::with([
                //'domaine:Code,Description',
                'programme:Code_Programme,Description',
                //'chantier:Code_Chantier,Description',
                'convention:id,Code,Intitule', // Use 'id' and 'Code' to link back
                'engagementsFinanciers.partenaire:Id,Description', // Partner details
                'engagementsFinanciers.versements:id,engagement_id,montant_verse' // Payment details
            ])->orderBy('Code_Projet')->get();

            // Marche Section Data
            $marches = MarchePublic::with([
                'convention:id,Intitule', // Convention title
                'lots.fichiersJoints:id,lot_id,nom_fichier,type_fichier', // Files specific to lots
                'fichiersJointsGeneraux:id,marche_id,nom_fichier,type_fichier' // General files for the market
            ])->orderBy('numero_marche')->get();

            // Fetch Province lookup list (if localisation is used)
            // Assuming 'localisation' in Convention holds semicolon-separated IDs
            $provinces = Province::pluck('Description', 'Id')->all(); // Fetch as associative array [Id => Description]

            Log::info('Data fetched successfully.', [
                'conventions' => $conventions->count(),
                'projets' => $projets->count(),
                'marches' => $marches->count(),
                'provinces' => count($provinces),
            ]);
            $statusStyles = [
                // Convention Statuses
                "non approuvé" => ['badge-class' => 'badge-danger', 'text' => 'Non Approuvé'],
                "en cours d'approbation" => ['badge-class' => 'badge-warning', 'text' => "En Cours d'Approbation"],
                "approuvé" => ['badge-class' => 'badge-success', 'text' => 'Approuvé'],
                "non visé" => ['badge-class' => 'badge-secondary', 'text' => 'Non Visé'], // Using secondary for grey
                "en cours de visa" => ['badge-class' => 'badge-warning', 'text' => 'En Cours de Visa'],
                "visé" => ['badge-class' => 'badge-info', 'text' => 'Visé'],
                "non signé" => ['badge-class' => 'badge-dark', 'text' => 'Non Signé'], // Using dark
                "en cours de signature" => ['badge-class' => 'badge-warning', 'text' => 'En Cours de Signature'],
                "signé" => ['badge-class' => 'badge-primary', 'text' => 'Signé'],
                // Marche Statuses (add any specific ones if different)
                'En préparation' => ['badge-class' => 'badge-secondary', 'text' => 'En préparation'],
                'En cours' => ['badge-class' => 'badge-primary', 'text' => 'En cours'],
                'Terminé' => ['badge-class' => 'badge-success', 'text' => 'Terminé'],
                'Résilié' => ['badge-class' => 'badge-danger', 'text' => 'Résilié'],
                // Add Project Statuses if applicable
                // ...
                // Default
                'default' => ['badge-class' => 'badge-light', 'text' => 'Inconnu']
            ];
            // 2. Prepare Data Array for the View
            $data = [
                'reportTitle' => 'GICOPMA - GESTION INTEGREE DES CONVENTIONS, PROJETS, MARCHES',
                'generationDate' => Carbon::now()->format('d/m/Y H:i:s'),
                'conventions' => $conventions,
                'projets' => $projets,
                'marches' => $marches,
                'provincesLookup' => $provinces,
                'statusStyles' => $statusStyles, 
            ];

            // 3. Load View and Generate PDF
            Log::info('Loading PDF view...');
            $pdf = Pdf::loadView('pdf.report', $data)
                     ->setPaper('a4', 'portrait'); // Optional: Set paper size/orientation

            Log::info('PDF generated. Streaming...');

            // 4. Stream or Download the PDF
            // ->stream() shows in browser, ->download() forces download
            return $pdf->stream('gicopma_report_' . date('Ymd_His') . '.pdf');

        } catch (\Exception $e) {
            Log::error('!!! PDF Report Generation Failed !!!', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            // Return an error response (maybe HTML error page or JSON)
            return response()->json(['message' => 'Erreur lors de la génération du rapport PDF.'], 500);
        } finally {
            Log::info('--- PDF Report Generation Ended ---');
        }
    }
}