<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\Traits\LogsActivity;   // <--- MUST be imported
use Spatie\Activitylog\LogOptions;  
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo; // Import BelongsTo
use Illuminate\Database\Eloquent\Relations\MorphTo; // <-- 1. IMPORT THIS

class MarchePublic extends Model
{
    use HasFactory;
    use LogsActivity;
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'marche_public';

    /**
     * Indicates if the model should be timestamped.
     * Laravel assumes true by default if 'created_at' and 'updated_at' columns exist.
     *
     * @var bool
     */
    // public $timestamps = true; // Default is true

    /**
     * The attributes that are mass assignable.
     * List all columns you want to allow filling via ::create() or ::update().
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'numero_marche',
        'intitule',
        'type_marche',
        'procedure_passation',
        'mode_passation',
        'budget_previsionnel',
        'montant_attribue',
        'source_financement',
        'attributaire',
        'date_publication',
        'date_limite_offres',
        'date_notification',
        'date_debut_execution',
        'duree_marche',
        'statut',
        'id_convention',
        'id_fonctionnaire',
        // --- ADD NEW FILLABLE FIELDS ---
        'ref_appelOffre',
        'avancement_physique',
        'avancement_financier',
        'date_engagement_tresorerie',
        'projectable_id',
        'projectable_type',
        'date_visa_tresorerie',
        'date_approbation_president',
        // --- END NEW FILLABLE FIELDS ---
    ];

    /**
     * The attributes that should be cast.
     * Ensures data is treated as the correct type.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'budget_previsionnel' => 'decimal:2',
        'montant_attribue' => 'decimal:2',
        'date_publication' => 'date:Y-m-d', // Or 'datetime:Y-m-d H:i:s' if it includes time
        'date_limite_offres' => 'date:Y-m-d',
        'date_notification' => 'date:Y-m-d',
        'date_debut_execution' => 'date:Y-m-d',
        'duree_marche' => 'integer',
        'id_convention' => 'integer', // Good practice to cast Foreign Keys

        // --- ADD CASTS FOR NEW FIELDS ---
        'ref_appelOffre' => 'integer',       // Cast Foreign Key to integer
        
        'avancement_physique' => 'double',     // Cast to float/double
        'avancement_financier' => 'double',    // Cast to float/double
        'date_engagement_tresorerie' => 'date:Y-m-d',
        'date_visa_tresorerie' => 'date:Y-m-d',
        'date_approbation_president' => 'date:Y-m-d'
        // --- END CASTS FOR NEW FIELDS ---
        // Timestamps are automatically handled if columns exist and $timestamps isn't false
        // 'created_at' => 'datetime',
        // 'updated_at' => 'datetime',
    ];

    // --- Relationships ---
public function projectable(): MorphTo
    {
        return $this->morphTo();
    }
    /**
     * Get the lots associated with this public market.
     * Defines a one-to-many relationship.
     */
    public function lots(): HasMany
    {
        // Assumes 'marche_id' foreign key on 'lot' table and 'id' primary key on 'marche_public' table
        return $this->hasMany(Lot::class, 'marche_id', 'id');
    }

    /**
     * Get the general files directly associated with this public market (not linked to a specific lot).
     * Defines a one-to-many relationship, filtered.
     */
    public function fichiersJointsGeneraux(): HasMany
    {
        // Assumes 'marche_id' foreign key on 'fichier_joint' table and 'id' primary key on 'marche_public'
        return $this->hasMany(FichierJoint::class, 'marche_id', 'id')
                    ->whereNull('lot_id'); // Filter for files where lot_id IS NULL
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

            ->useLogName('marches_publics');
    }

     /**
      * Get ALL files associated with this public market, whether general or linked to one of its lots.
      * Note: This might be less efficient than fetching separately. Often used for checks.
      */
     public function tousFichiersJoints(): HasMany
     {
         // This defines files directly linked to the market:
         return $this->hasMany(FichierJoint::class, 'marche_id', 'id');
         // Fetching $marche->load('lots.fichiersJoints', 'fichiersJointsGeneraux') is often clearer.
     }

     /**
      * Get the convention associated with this public market.
      * Defines a many-to-one relationship.
      */
     public function convention(): BelongsTo // Add return type hint
     {
         // Assumes Convention model exists and foreign key is id_convention
         return $this->belongsTo(Convention::class, 'id_convention', 'id');
     }

     // --- ADD RELATIONSHIP TO APPEL D'OFFRE ---
     /**
      * Get the Appel d'Offre (Call for Tender) associated with this public market.
      * Defines a many-to-one relationship.
      */
     public function appelOffre(): BelongsTo // Add return type hint
     {
         // Foreign key on this table ('marche_public') is 'ref_appelOffre'
         // Owner key on the related table ('appel_offre') is 'id'
         // Assumes AppelOffre model exists at App\Models\AppelOffre
         return $this->belongsTo(AppelOffre::class, 'ref_appelOffre', 'id');
     }
     // --- END RELATIONSHIP ---
}