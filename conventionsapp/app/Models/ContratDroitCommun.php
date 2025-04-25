<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Spatie\Activitylog\Traits\LogsActivity;   // <--- MUST be imported
use Spatie\Activitylog\LogOptions; 
class ContratDroitCommun extends Model
{
    use HasFactory;
    use LogsActivity;

    /**
     * The table associated with the model.
     * Specifies the exact table name.
     * @var string
     */
    protected $table = 'contrat_droit_commun';

    /**
     * Indicates if the model should be timestamped with created_at and updated_at.
     * Set to false if your table doesn't have these columns and you don't plan to add them.
     * If you *do* have them, keep this true.
     * @var bool
     */
    public $timestamps = false; // Assuming you have/want created_at/updated_at

    /**
     * The attributes that are mass assignable.
     * Lists all columns from your schema except the primary key 'id'.
     * @var array<int, string>
     */
    protected $fillable = [
        'numero_contrat',
        'objet',
        'fournisseur_nom',
        'date_signature',
        'montant_total',
        'duree_contrat',
        'type_contrat',
        'mode_paiement',
        'observations',
        'id_fonctionnaire',

    ];

    /**
     * The attributes that should be cast to native types.
     * Important for dates and decimals.
     * @var array<string, string>
     */
    protected $casts = [
        'date_signature' => 'date:Y-m-d', // Casts to Carbon date object
        'montant_total' => 'decimal:2', // Casts to float/string with 2 decimal places
    ];

    /**
     * Get the Bons de Commande associated with this Contrat.
     * A Contrat can have many BonDeCommandes.
     */
    public function bonsDeCommande(): HasMany
    {
        // Assumes BonDeCommande model exists and has 'contrat_id' foreign key
        return $this->hasMany(BonDeCommande::class, 'contrat_id','id');
    }

    /**
     * Get the Files associated with this Contrat.
     * A Contrat can have many Files directly linked via 'id_cdc'.
     */
    public function fichiers(): HasMany
    {
        // Assumes FichierBonCommandeEtContrat model exists
        // Specifies the foreign key 'id_cdc' on the related table
        return $this->hasMany(FichierBonCommandeEtContrat::class, 'id_cdc');
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
    
            ->useLogName('contrat_droit_commune');
    }
    
}
