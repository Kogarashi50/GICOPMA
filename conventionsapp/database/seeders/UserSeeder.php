<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use App\Models\User;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // First, seed the fonctionnaires, including the missing one with ID 38
        DB::table('fonctionnaires')->insert([
            ['id' => 31, 'nom' => 'TABET', 'prenom' => 'Abdelhafid'],
            ['id' => 38, 'nom' => 'BOUCRAA', 'prenom' => 'Hanae'], // <-- THIS IS THE FIX
            ['id' => 71, 'nom' => 'AMER', 'prenom' => 'Abdelhakim'],
            ['id' => 76, 'nom' => 'SRHIRI', 'prenom' => 'Abdelhafid'],
            ['id' => 120, 'nom' => 'Essahli', 'prenom' => 'Ayoub'],
            ['id' => 121, 'nom' => 'Assamure', 'prenom' => 'Abdelhamid'],
            ['id' => 122, 'nom' => 'Messoussi', 'prenom' => 'Loubna'],
            ['id' => 123, 'nom' => 'Boulebroud', 'prenom' => 'Chaimae'],
            ['id' => 124, 'nom' => 'Khaloua', 'prenom' => 'Mouad'],
        ]);

        // Now, seed the users and assign roles
        $defaultPassword = Hash::make('cro1234');

        $user = User::create([
            'id' => 7,
            'email' => 'hanae.boucraa@cr-oriental.ma',
            'password' => $defaultPassword,
            'fonctionnaire_id' => 38, // This will now work
        ]);
        $user->assignRole('Admin');

        $user = User::create([
            'id' => 218,
            'email' => 'abdelhamid.assamure@cr-oriental.ma',
            'password' => $defaultPassword,
            'fonctionnaire_id' => 121,
        ]);
        $user->assignRole('gestionnaire des conventions');
        
        $user = User::create([
            'id' => 219,
            'email' => 'loubna.messoussi@cr-oriental.ma',
            'password' => $defaultPassword,
            'fonctionnaire_id' => 122,
        ]);
        $user->assignRole('gestionnaire des projets');

        $user = User::create([
            'id' => 220,
            'email' => 'chaimae.boulbroud@cr-oriental.ma',
            'password' => $defaultPassword,
            'fonctionnaire_id' => 123,
        ]);
        $user->assignRole('gestionnaire marché');

        $user = User::create([
            'id' => 221,
            'email' => 'mouad.khaloua@cr-oriental.ma',
            'password' => $defaultPassword,
            'fonctionnaire_id' => 124,
        ]);
        $user->assignRole('gestionnaire des bon de commande');
        
        $user = User::create([
            'id' => 223,
            'email' => 'loubna@gmail.com',
            'password' => $defaultPassword,
            'fonctionnaire_id' => 76,
        ]);
        $user->assignRole('loubna');
    }
}