<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\AlertType; // Make sure to import the model

class ConventionVisaAlertTypesSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        $alertTypes = [
            [
                'name' => 'convention_visa_approaching_18_days',
                'description' => 'Alerte levée 18 jours après l\'envoi d\'une convention pour visa au MI.',
                // This permission ensures only users who can receive convention alerts will get this.
                'permission_name' => 'receive convention alerts',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'convention_visa_approaching_20_days',
                'description' => 'Alerte levée 20 jours après l\'envoi d\'une convention pour visa au MI.',
                'permission_name' => 'receive convention alerts',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'convention_visa_late_25_days',
                'description' => 'Alerte critique levée 25 jours après l\'envoi d\'une convention pour visa au MI (en retard).',
                'permission_name' => 'receive convention alerts',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ];

        // Using updateOrInsert to prevent duplicates if the seeder is run multiple times.
        foreach ($alertTypes as $type) {
            AlertType::updateOrInsert(['name' => $type['name']], $type);
        }
    }
}