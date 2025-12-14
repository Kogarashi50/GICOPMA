<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;

class RolesAndPermissionsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Reset cached roles and permissions
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        // Define all permissions
        $permissions = [
            'view dashboard', 'view conventions', 'create conventions', 'update conventions', 'delete conventions',
            'view partenaires', 'create partenaires', 'update partenaires', 'delete partenaires', 'view partenaire summary',
            'view chantiers', 'create chantiers', 'update chantiers', 'delete chantiers', 'view programmes',
            'create programmes', 'update programmes', 'delete programmes', 'view domaines', 'create domaines',
            'update domaines', 'delete domaines', 'view projets', 'create projets', 'update projets', 'delete projets',
            'view sousprojets', 'create sousprojets', 'update sousprojets', 'delete sousprojets', 'view communes',
            'create communes', 'update communes', 'delete communes', 'view marches', 'create marches', 'update marches',
            'delete marches', 'download fichiers', 'view provinces', 'create provinces', 'update provinces',
            'delete provinces', 'view engagements', 'create engagements', 'update engagements', 'delete engagements',
            'view bon_commande', 'create bon_commande', 'update bon_commande', 'delete bon_commande',
            'view contrat_droit_commun', 'create contrat_droit_commun', 'update contrat_droit_commun', 'delete contrat_droit_commun',
            'view avenants', 'create avenants', 'update avenants', 'delete avenants', 'view versements_cp',
            'create versements_cp', 'update versements_cp', 'delete versements_cp', 'view ordres_service',
            'create ordres_service', 'update ordres_service', 'delete ordres_service', 'view engagements_financiers',
            'create engagements_financiers', 'update engagements_financiers', 'delete engagements_financiers',
            'view versements_pp', 'create versements_pp', 'update versements_pp', 'delete versements_pp',
            'download report', 'view appeloffres', 'create appeloffres', 'update appeloffres', 'delete appeloffres',
            'manage users', 'manage roles', 'view history', 'view observations', 'create observations',
            'update observations', 'delete observations', 'view secteurs', 'create secteurs', 'update secteurs',
            'delete secteurs', 'receive convention alerts'
        ];

        foreach ($permissions as $permission) {
            Permission::create(['name' => $permission, 'guard_name' => 'sanctum']);
        }

        // Create Roles
        $adminRole = Role::create(['name' => 'Admin', 'guard_name' => 'sanctum']);
        $conventionManagerRole = Role::create(['name' => 'gestionnaire des conventions', 'guard_name' => 'sanctum']);
        $projectManagerRole = Role::create(['name' => 'gestionnaire des projets', 'guard_name' => 'sanctum']);
        $marcheManagerRole = Role::create(['name' => 'gestionnaire marché', 'guard_name' => 'sanctum']);
        $bcManagerRole = Role::create(['name' => 'gestionnaire des bon de commande', 'guard_name' => 'sanctum']);
        $viewerRole = Role::create(['name' => 'Viewer', 'guard_name' => 'sanctum']);
        $loubnaRole = Role::create(['name' => 'loubna', 'guard_name' => 'sanctum']);
        
        // Assign all permissions to Admin
        $adminRole->givePermissionTo(Permission::all());
        
        // Assign specific permissions to other roles
        $conventionManagerRole->givePermissionTo(['view conventions', 'create conventions', 'update conventions', 'delete conventions', 'view partenaires', 'create partenaires', 'update partenaires', 'delete partenaires', 'view programmes', 'create programmes', 'update programmes', 'delete programmes', 'view communes', 'create communes', 'update communes', 'delete communes', 'view provinces', 'create provinces', 'update provinces', 'delete provinces', 'view engagements', 'create engagements', 'update engagements', 'delete engagements', 'view avenants', 'create avenants', 'update avenants', 'delete avenants', 'view versements_cp', 'create versements_cp', 'update versements_cp', 'delete versements_cp']);
        $projectManagerRole->givePermissionTo(['view projets', 'create projets', 'update projets', 'delete projets', 'view sousprojets', 'create sousprojets', 'update sousprojets', 'delete sousprojets', 'view partenaires', 'create partenaires', 'update partenaires', 'delete partenaires', 'view programmes', 'create programmes', 'update programmes', 'delete programmes', 'view communes', 'create communes', 'update communes', 'delete communes', 'view provinces', 'create provinces', 'update provinces', 'delete provinces', 'view engagements_financiers', 'create engagements_financiers', 'update engagements_financiers', 'delete engagements_financiers', 'view versements_pp', 'create versements_pp', 'update versements_pp', 'delete versements_pp']);
        $marcheManagerRole->givePermissionTo(['view marches', 'create marches', 'update marches', 'delete marches', 'view appeloffres', 'create appeloffres', 'update appeloffres', 'delete appeloffres', 'view ordres_service', 'create ordres_service', 'update ordres_service', 'delete ordres_service', 'view communes', 'create communes', 'update communes', 'delete communes', 'view provinces', 'create provinces', 'update provinces', 'delete provinces']);
        $bcManagerRole->givePermissionTo(['view bon_commande', 'create bon_commande', 'update bon_commande', 'delete bon_commande', 'view contrat_droit_commun', 'create contrat_droit_commun', 'update contrat_droit_commun', 'delete contrat_droit_commun', 'view communes', 'create communes', 'update communes', 'delete communes', 'view provinces', 'create provinces', 'update provinces', 'delete provinces']);
        $viewerRole->givePermissionTo(['view domaines', 'create domaines', 'update domaines', 'delete domaines', 'view projets', 'create projets', 'update projets', 'delete projets']);
        
        // Assign permissions for 'loubna' role
        $loubnaRole->givePermissionTo(['view dashboard', 'view conventions', 'create conventions', 'update conventions', 'delete conventions', 'view sousprojets', 'create sousprojets', 'update sousprojets', 'delete sousprojets', 'view provinces', 'create provinces', 'update provinces', 'delete provinces', 'view partenaires', 'create partenaires', 'update partenaires', 'delete partenaires', 'receive convention alerts']);
    }
}