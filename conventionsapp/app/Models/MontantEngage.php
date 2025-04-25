<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\Traits\LogsActivity;   // <--- MUST be imported
use Spatie\Activitylog\LogOptions;  
class MontantEngage extends Model
{
    use LogsActivity;
    protected $fillable = [
        'id_convention',
        'id_partenaire',
        'montant_engage',
        'date',
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
    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logFillable()
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()

            // ---> THIS LINE IS WHERE YOU STORE THE ACTION DESCRIPTION <---
            ->setDescriptionForEvent(fn(string $eventName) => $eventName)
            // $eventName will automatically be 'created', 'updated', or 'deleted'

            ->useLogName('montant_engage');
    }
}
