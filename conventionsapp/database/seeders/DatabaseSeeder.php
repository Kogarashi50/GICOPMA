<?php

namespace Database\Seeders;

use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();
    
        
            $this->call([
                // RolesAndPermissionsSeeder::class,
                RolesAndPermissionsSeeder::class,
            LocationSeeder::class,
            CoreDataSeeder::class,
            UserSeeder::class,
            ProjectAndMarcheSeeder::class,
            ConventionSeeder::class,
            ConventionVisaAlertTypesSeeder::class,
           


                //PermissionsSeeder::class,
                //RolesSeeder::class,
                //UserSeeder::class, // Include if you created one
                // Other seeders...
            ]);
    }
}
