<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class CoreDataSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::table('domaine')->insert([
            ['Id' => 1, 'Description' => 'Transverse', 'Code' => 400, 'Description_Arr' => 'الأفقي'],
            ['Id' => 2, 'Description' => 'Social', 'Code' => 200, 'Description_Arr' => 'الإجتماعي'],
            ['Id' => 3, 'Description' => 'Economique', 'Code' => 100, 'Description_Arr' => 'الإقتصادي'],
            ['Id' => 4, 'Description' => 'Environnemental', 'Code' => 300, 'Description_Arr' => 'البيئي'],
        ]);

        DB::table('secteurs')->insert([
            ['id' => 1, 'description_fr' => 'Secteur de la Santé', 'description_ar' => 'قطاع الصحة'],
            ['id' => 2, 'description_fr' => 'Secteur de l\'Éducation et de la Formation', 'description_ar' => 'قطاع التربية والتكوين'],
            ['id' => 3, 'description_fr' => 'Secteur de l\'Agriculture et de la Pêche', 'description_ar' => 'قطاع الفلاحة والصيد البحري'],
        ]);
        
        DB::table('maitre_ouvrage')->insert([
            ['id' => 1, 'nom' => 'Ministère de l\'Éducation Nationale'],
            ['id' => 2, 'nom' => 'Ministère de la Santé'],
            ['id' => 3, 'nom' => 'Ministère de l\'Agriculture'],
        ]);

        DB::table('maitre_ouvrage_delegue')->insert([
            ['id' => 1, 'nom' => 'Agence de Développement Social'],
            ['id' => 2, 'nom' => 'Office National de l\'Eau Potable'],
            ['id' => 3, 'nom' => 'Agence Urbaine'],
        ]);

        DB::table('partenaire')->insert([
            ['Id' => 1, 'Description' => 'Conseil Provincial de Berkane', 'Code' => 400, 'Description_Arr' => ''],
            ['Id' => 2, 'Description' => 'Fournisseurs', 'Code' => 401, 'Description_Arr' => ''],
            ['Id' => 4, 'Description' => 'Agence de Développement de l’Oriental', 'Code' => 402, 'Description_Arr' => ''],
        ]);

 

        // --- THIS IS THE FIX ---
        DB::table('programme')->insert([
            ['Id' => 1, 'Description' => 'Programme de mobilité urbaine', 'Code_Programme' => 426, 'domaine_id' => 1],
            ['Id' => 2, 'Description' => 'Renforcements des équipements publics', 'Code_Programme' => 427, 'domaine_id' => 1],
            ['Id' => 3, 'Description' => 'Programme de construction de retenues collinaires', 'Code_Programme' => 312, 'domaine_id' => 4],
            ['Id' => 4, 'Description' => 'Programme d’appui financier incitatif aux entreprises', 'Code_Programme' => 112, 'domaine_id' => 3],
            ['Id' => 5, 'Description' => 'Création d’un incubateur', 'Code_Programme' => 111, 'domaine_id' => 3],
            ['Id' => 6, 'Description' => 'Programme de partenariat RAM', 'Code_Programme' => 2, 'domaine_id' => 2], // Added for id_programme=2
        ]);
        // -------------------------
        
        DB::table('engagement_types')->insert([
            ['nom' => 'Financier'],
            ['nom' => 'Technique'],
            ['nom' => 'Formation'],
        ]);
    }
}