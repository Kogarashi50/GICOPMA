<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\Projet;

class ProjectAndMarcheSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        Projet::create([
            'ID_Projet' => 2, 'Nom_Projet' => 'Création de ZAE dans la région', 'Id_Programme' => 112, 'Cout_CRO' => 348000000.00,
            'Date_Debut' => '2018-01-01', 'Observations' => 'hihi', 'Etat_Avan_Physi' => '89', 'Etat_Avan_Finan' => 98.99,
            'Date_Fin' => '2025-05-15', 'Code_Projet' => 1, 'Cout_Projet' => 100000.00,
        ]);
        Projet::create([
            'ID_Projet' => 172, 'Nom_Projet' => 'Création d’un incubateur à l’université d’Oujda', 'Id_Programme' => 111,
            'Cout_CRO' => 7128000.00, 'Date_Debut' => '2018-01-01', 'Etat_Avan_Physi' => '0', 'Date_Fin' => '2018-12-31',
            'Code_Projet' => 6, 'Cout_Projet' => 11880000.00,
        ]);
        Projet::create([
            'ID_Projet' => 176, 'Nom_Projet' => 'Projet de Partenariat RAM (Sample)', 'Id_Programme' => 2,
            'Code_Projet' => 1760, 'Cout_Projet' => 8888.00,
        ]);
        
        // This project is required by the sous_projet seeder below
        Projet::create([
            'ID_Projet' => 151, 'Nom_Projet' => 'Programme de lutte contre les disparités territoriales',
            'Id_Programme' => 426, 'Code_Projet' => 151, 'Cout_Projet' => 0,
        ]);

        DB::table('sous_projet')->insert([
            ['Code_Sous_Projet' => 1, 'Nom_Projet' => 'AEP PAR BRANCHEMENTS INDIVIDUELS', 'ID_Projet_Maitre' => 151, 'Id_Province' => '[1]', 'Id_Commune' => '[1]', 'Estim_Initi' => 4097539.00, 'Secteur' => 'AEP', 'Status' => 'en cours', 'Financement' => 'ONEE-BrancheEau', 'Benificiaire' => '5767'],
            ['Code_Sous_Projet' => 2, 'Nom_Projet' => 'RENFORCEMENT DU RESEAU AEP du Douar Ouled Naji', 'ID_Projet_Maitre' => 151, 'Id_Province' => '[1]', 'Id_Commune' => '[22]', 'Estim_Initi' => 4682901.00, 'Secteur' => 'AEP', 'Status' => 'en cours', 'Financement' => 'ONEE-BrancheEau', 'Benificiaire' => '1136']
        ]);

        DB::table('appel_offre')->insert([
            ['id' => 54, 'provinces' => '["Driouch"]', 'categorie' => 'Services', 'numero' => '01/2020/BR', 'intitule' => 'Assistance des travaux d’entretien du parc écologique d’Oujda.', 'estimation_HT' => 600000.01, 'montant_TVA' => 0.00, 'lancement_portail' => 1],
        ]);

        DB::table('marche_public')->insert([
            ['id' => 53, 'numero_marche' => '29821', 'intitule' => 'marche 2', 'projectable_id' => 1, 'projectable_type' => 'App\\Models\\SousProjet', 'procedure_passation' => '2981', 'montant_attribue' => 100000000.00, 'duree_marche' => 26, 'statut' => 'En cours', 'ref_appelOffre' => 54],
        ]);

        DB::table('lot')->insert([
            ['marche_id' => 53, 'numero_lot' => '2190', 'objet' => 'objet1', 'montant_attribue' => 100000000.00, 'attributaire' => 'att1'],
        ]);

        DB::table('ordre_service')->insert([
            ['marche_id' => 53, 'type' => 'arret', 'numero' => '21893', 'date_emission' => '2025-10-08', 'cree_par' => 7],
        ]);
    }
}