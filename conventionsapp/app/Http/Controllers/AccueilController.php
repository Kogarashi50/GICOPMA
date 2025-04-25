<?php

namespace App\Http\Controllers;

use App\Models\Projet;
use App\Models\Partenaire;
use App\Models\Convention;

class AccueilController extends Controller
{
    public function index()
    {
        // Fetch the latest entries
        $latestProjet = Projet::latest('ID_Projet')->first();
        $Projets = Projet::get();
        $latestPartenaire = Partenaire::latest('Id')->first();
        $latestConvention = Convention::latest('id')->first();

        return response()->json(["Projects"=>$Projets]);
    }
}
