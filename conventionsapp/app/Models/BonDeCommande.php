<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Spatie\Activitylog\Traits\LogsActivity;   // <--- MUST be imported
use Spatie\Activitylog\LogOptions; 
class BonDeCommande extends Model
{
    use HasFactory;
    use LogsActivity;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'bon_de_commande';

    /**
     * Indicates if the model should be timestamped.
     * Assuming you add created_at/updated_at columns.
     * Set to false if you ONLY use date_emission and don't want Laravel's timestamps.
     * @var bool
     */
    public $timestamps = true;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'numero_bc',
        'date_emission',
        'objet',
        'montant_total',
        'fournisseur_nom',
        'mode_paiement',
        'etat',
        'marche_id',
        'contrat_id',
        'id_fonctionnaire',

    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'date_emission' => 'date', // Or 'datetime' if time is included
        'montant_total' => 'decimal:2',
        'etat' => 'string', // Handle ENUM as string
        'marche_id' => 'integer',
        'contrat_id' => 'integer',
    ];

    /**
     * Get the Marche associated with the Bon de Commande.
     */
    public function marche_public(): BelongsTo
    {
        // Assuming Marche model exists
        return $this->belongsTo(MarchePublic::class, 'marche_id','id');
    }

    /**
     * Get the Contrat associated with the Bon de Commande.
     */
    public function contrat(): BelongsTo
    {
        // Assuming ContratDroitCommun model exists
        return $this->belongsTo(ContratDroitCommun::class, 'contrat_id','id');
    }

    /**
     * Get the files associated with the Bon de Commande.
     */
    public function fichiers(): HasMany
    {
        // Assuming FichierBonCommandeEtContrat model exists
        // Links via the 'id_bc' column on the fichier table
        return $this->hasMany(FichierBonCommandeEtContrat::class, 'id_bc');
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
    
            ->useLogName('bon_de_commande');
    }
}