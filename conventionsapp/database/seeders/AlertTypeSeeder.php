<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\AlertType;

class AlertTypeSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        $this->command->info('Creating default Alert Types...');

        $alertTypes = [
            [
                'name' => 'convention_status_changed',
                'description' => 'Alerte déclenchée lorsque le statut d\'une convention est modifié.',
                'permission_name' => 'receive convention alerts',
            ],
            [
                'name' => 'convention_expiring_soon',
                'description' => 'Alerte déclenchée 30 jours avant la date de fin d\'une convention.',
                'permission_name' => 'receive convention alerts',
            ],
            [
                'name' => 'marche_deadline_approaching',
                'description' => 'Alerte déclenchée 7 jours avant la date limite d\'un marché public.',
                'permission_name' => 'receive marche alerts',
            ],
            [
                'name' => 'new_marche_created',
                'description' => 'Alerte déclenchée lors de la création d\'un nouveau marché public.',
                'permission_name' => 'receive marche alerts',
            ],
            [
                'name' => 'user_assigned_to_projet',
                'description' => 'Alerte déclenchée lorsqu\'un utilisateur est assigné comme point focal à un projet.',
                'permission_name' => 'receive projet alerts',
            ],
        ];

        foreach ($alertTypes as $type) {
            AlertType::updateOrCreate(
                ['name' => $type['name']],
                $type
            );
        }

        $this->command->info('Default Alert Types created successfully.');
    }
}