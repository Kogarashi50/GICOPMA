<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\Convention; // <-- Import the Convention model

class ConventionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Using Eloquent's create method is safer and more flexible
        Convention::create([
            'id' => 357,
            'code' => '10',
            'type' => 'convention',
            'Intitule' => 'Convention de partenariat avec la compagnie nationale Royal Air Maroc',
            'Annee_Convention' => '2030',
            'localisation' => '2',
            'Cout_Global' => 8888.00,
            'Statut' => 'signé',
            'Id_Programme' => 2,
            'id_projet' => 176, // This project ID must exist in the projet table
        ]);

        Convention::create([
            'id' => 414,
            'code' => '1073/07/2021',
            'type' => 'cadre',
            'Intitule' => 'intitu',
            'numero_approbation' => 1073,
            'session' => 7,
            'Annee_Convention' => '2021',
            'Statut' => 'visé',
            'Id_Programme' => 2,
            'date_visa' => '2025-09-18',
            'date_reception_vise' => '2025-09-18',
        ]);

        Convention::create([
            'id' => 430,
            'code' => '29839/04/2024',
            'type' => 'cadre',
            'Intitule' => 'int',
            'numero_approbation' => 29839,
            'session' => 4,
            'Annee_Convention' => '2024',
            'Cout_Global' => 200000000.00,
            'Statut' => 'en cours de visa',
            'Id_Programme' => 2,
            'date_envoi_visa_mi' => '2025-10-13',
        ]);

        // Seed related tables (avenants, convention_partenaire)
        
        
        
    }
}