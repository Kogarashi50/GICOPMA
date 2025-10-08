<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\Activitylog\Traits\LogsActivity;   // <--- MUST be imported
use Spatie\Activitylog\LogOptions; 
class FichierBonCommandeEtContrat extends Model
{
    use HasFactory;
    use LogsActivity;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'fichier_bon_commande';
    public $timestamps = true;
    const CREATED_AT = 'date_ajout';
    const UPDATED_AT = null;
    /**
     * Define which timestamp columns Laravel should manage.
     * If you want to use 'date_ajout' as the creation timestamp ONLY:
     * const CREATED_AT = 'date_ajout';
     * const UPDATED_AT = null; // No updated_at column
     * public $timestamps = true;
     *
     * If using standard created_at/updated_at (recommended):
     * public $timestamps = true; // Ensure columns exist in migration
      */
    // $UPDATED_AT=null;
    // $CREATED_AT='date_ajout';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'id_bc',
        'id_cdc', // Contrat Droit Commun ID
        'nom_fichier',
        'intitule', // <-- ADD THIS LINE
        'chemin_fichier',
        'type_fichier',
        // 'date_ajout', // Only if NOT using standard timestamps
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'id_bc' => 'integer',
        'id_cdc' => 'integer',
        // 'date_ajout' => 'datetime', // If using this column
    ];

    /**
     * Get the Bon de Commande that owns the file.
     */
    public function bonDeCommande(): BelongsTo
    {
        return $this->belongsTo(BonDeCommande::class, 'id_bc');
    }

    /**
     * Get the Contrat Droit Commun that owns the file.
     */
    public function contratDroitCommun(): BelongsTo
    {
        return $this->belongsTo(ContratDroitCommun::class, 'id_cdc');
    }
    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logFillable()
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()

            // ---> THIS LINE IS WHERE YOU STORE THE ACTION DESCRIPTION <---
            ->setDescriptionForEvent(fn(string $eventName) => $eventName)
            // $eventName will automatically be 'created', 'updated', or 'deleted'

            ->useLogName('fichier_bon_commande');
    }
}