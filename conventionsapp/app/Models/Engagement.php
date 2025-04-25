<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Programme;
class Engagement extends Model
{
    protected $table = 'engagement';
    protected $fillable = [
        'ID',
        'Code_Engag',
        'Description',
        'Cout',
        'Montant_CRO',
        'Montant_Hors_CRO',
        'Rang',
        'Programme'
    ];
    public function programme()
    {
        return $this->belongsTo(Programme::class, 'Programme', 'Code_Programme');
    }
}

