<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\User; // Import your model

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Example: Create an Admin user
        $admin = User::factory()->create([
            'username' => 'admin', // Override default username
            // 'email' => 'admin@example.com', // Override if needed
            // Password will default to 'password' from factory and get hashed by model
        ]);
        $admin->assignRole('Admin'); // Assign the role by NAME

        // Example: Create an Editor user
        $editor = User::factory()->create([
            'username' => 'editor',
             // 'email' => 'editor@example.com',
        ]);
        $editor->assignRole('Editor');

         // Example: Create a Viewer user
         $viewer = User::factory()->create([
            'username' => 'viewer',
            // 'email' => 'viewer@example.com',
         ]);
         $viewer->assignRole('Viewer');


        // Example: Create some generic users using the factory defaults
        // Utilisateur::factory(5)->create(); // Creates 5 users with random usernames
    }
}