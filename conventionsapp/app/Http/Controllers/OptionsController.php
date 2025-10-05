<?php

namespace App\Http\Controllers;

// --- AJOUTER CES LIGNES ---
use App\Models\MarcheType;
use App\Models\MarcheMode;
use App\Models\Projet;
use App\Models\SousProjet;
// --- FIN DES AJOUTS ---

use Illuminate\Http\JsonResponse;
// Note : Request n'est pas utilisé ici, mais c'est une bonne pratique de l'importer si vous l'ajoutez plus tard.
// use Illuminate\Http\Request;

class OptionsController extends Controller
{
    /**
     * Fournit la liste des types de marchés.
     */
    public function getMarcheTypes(): JsonResponse
    {
        // Cette ligne fonctionne maintenant car Laravel sait où trouver MarcheType
        $types = MarcheType::orderBy('nom')->get(['id', 'nom']);
        return response()->json($types);
    }

    /**
     * Fournit la liste des modes de passation de marchés.
     */
    public function getMarcheModes(): JsonResponse
    {
        // Cette ligne fonctionne maintenant car Laravel sait où trouver MarcheMode
        $modes = MarcheMode::orderBy('nom')->get(['id', 'nom']);
        return response()->json($modes);
    }

    /**
     * Fournit une liste unifiée des Projets et Sous-Projets,
     * formatée pour un menu déroulant groupé (react-select).
     */
    public function getProjetsAndSousProjets(): JsonResponse
    {
        // Ces lignes fonctionnent maintenant car Laravel sait où trouver Projet et SousProjet
        $projets = Projet::orderBy('Nom_Projet')->get(['ID_Projet', 'Nom_Projet']);
        $sousProjets = SousProjet::orderBy('Nom_Projet')->get(['Code_Sous_Projet', 'Nom_Projet']);

        $formattedProjets = $projets->map(function ($projet) {
            return [
                'value' => 'projet_' . $projet->ID_Projet, // Valeur préfixée pour l'identification
                'label' => $projet->Nom_Projet
            ];
        });

        $formattedSousProjets = $sousProjets->map(function ($sousProjet) {
            return [
                'value' => 'sous-projet_' . $sousProjet->Code_Sous_Projet, // Valeur préfixée
                'label' => $sousProjet->Nom_Projet
            ];
        });
        
        // Structure pour les groupes dans react-select
        $groupedOptions = [
            [
                'label' => 'Projets Maîtres',
                'options' => $formattedProjets
            ],
            [
                'label' => 'Sous-Projets',
                'options' => $formattedSousProjets
            ]
        ];

        return response()->json($groupedOptions);
    }
}