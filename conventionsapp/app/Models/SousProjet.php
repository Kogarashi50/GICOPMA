<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;

class SousProjet extends Model
{
    use LogsActivity;
    protected $table ='sous_projet';

    // ***** ADD THESE LINES *****
    /**
     * The primary key associated with the table.
     *
     * @var string
     */
    protected $primaryKey = 'Code_Sous_Projet';

    /**
     * Indicates if the model's ID is auto-incrementing.
     *
     * @var bool
     */
    public $incrementing = false;

    /**
     * The data type of the auto-incrementing ID.
     * Set this if your primary key is not an integer (e.g., string)
     *
     * @var string
     */
    protected $keyType = 'string'; // Or 'int' if Code_Sous_Projet is numeric but not auto-inc
    // *************************


    protected $fillable = [
        'Code_Sous_Projet',
        'Nom_Projet',
        'ID_Projet_Maitre',
        'Id_Province',
        'Id_Commune',
        'Observations',
        'Etat_Avan_Physi',
        'Etat_Avan_Finan',
        'Estim_Initi',
        'Secteur',
        'Localite',
        'Centre',
        'Site',
        'Surface',
        'Lineaire',
        'Status',
        'Douars_Desservis',
        'Financement',
        'Nature_Intervention',
        'Benificiaire',
        'id_fonctionnaire',
    ];

    // Relationships (projet, province, commune) look correct

    public function projet()
    {
        return $this->belongsTo(Projet::class, 'ID_Projet_Maitre', 'Code_Projet');
    }

    public function province()
    {
        return $this->belongsTo(Province::class, 'Id_Province', 'Id');
    }

    public function commune()
    {
        return $this->belongsTo(Commune::class, 'Id_Commune', 'Id');
    }

    // Activity Log configuration looks correct
    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logFillable()
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->setDescriptionForEvent(fn(string $eventName) => $eventName)
            ->useLogName('sous_projet');
    }
}