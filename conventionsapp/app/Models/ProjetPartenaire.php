<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProjetPartenaire extends Model
{
    protected $fillable = [
        'id_projet',
        'id_partenaire',
        'montant',
        'type_engagement',
        'parcourir',
        'structure',
        'rechercher',
        'inserer',
        'vider',
        'supprimer',
        'type',
        'interclassement',
        'taille',
        'perte',
    ];
}
