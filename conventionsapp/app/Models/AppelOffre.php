<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany; // <-- IMPORTANT : Assurez-vous que cette ligne est importée
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;

class AppelOffre extends Model
{
    use LogsActivity;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'appel_offre';

    /**
     * Indicates if the model should be timestamped.
     *
     * @var bool
     */
    public $timestamps = true;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'categorie',
        'provinces',
        'numero',
        'intitule',
        'estimation',
        'estimation_HT',
        'montant_TVA',
        'duree_execution',
        'date_verification',
        'date_ouverture',
        'last_session_op',
        'lancement_portail',
        'date_lancement_portail',
        'date_publication',
        'id_fonctionnaire',
    ];

    /**
     * The attributes that should be cast to native types.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'provinces' => 'array',
        'date_publication' => 'date:Y-m-d',
        'estimation' => 'decimal:2',
        'estimation_HT' => 'decimal:2',
        'montant_TVA' => 'decimal:2',
        'duree_execution' => 'integer',
        'date_verification' => 'date:Y-m-d',
        'date_ouverture' => 'date:Y-m-d',
        'last_session_op' => 'date:Y-m-d',
        'lancement_portail' => 'boolean',
        'date_lancement_portail' => 'date:Y-m-d',
    ];
    
    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logFillable()
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->setDescriptionForEvent(fn(string $eventName) => $eventName)
            ->useLogName('appel_offre');
    }


    // --- NOUVELLE RELATION ---
    /**
     * Get all the files associated with this call for tender.
     */
    public function fichiers(): HasMany
    {
        // Un AppelOffre "a plusieurs" FichierJoint
        // La clé étrangère dans la table `fichier_joint` est `appel_offre_id`
        return $this->hasMany(FichierJoint::class, 'appel_offre_id');
    }
    // --- FIN DE LA NOUVELLE RELATION ---
}