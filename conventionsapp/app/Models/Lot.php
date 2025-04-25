<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Spatie\Activitylog\Traits\LogsActivity;   // <--- MUST be imported
use Spatie\Activitylog\LogOptions; 
class Lot extends Model
{
    use HasFactory;
    use LogsActivity;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'lot';

    /**
      * Indicates if the model should be timestamped.
      * Set based on whether your 'lot' table has 'created_at'/'updated_at'.
      *
      * @var bool
      */
     public $timestamps = false; // Set to true if you add timestamp columns

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'marche_id', // Foreign key needs to be fillable if creating via relationship create()
        'numero_lot',
        'objet',
        'montant_attribue',
        'attributaire',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'montant_attribue' => 'decimal:2',
        'marche_id' => 'integer', // Good practice to cast foreign keys
    ];

    // --- Relationships ---

    /**
     * Get the main public market that this lot belongs to.
     * Defines the inverse of the one-to-many relationship.
     */
    public function marchePublic(): BelongsTo
    {
        // Assumes 'marche_id' foreign key on 'lot' table references 'id' on 'marche_public' table
        return $this->belongsTo(MarchePublic::class, 'marche_id', 'id');
    }

    /**
     * Get the files specifically associated with this lot.
     * Defines a one-to-many relationship.
     */
    public function fichiersJoints(): HasMany
    {
        // Assumes 'lot_id' foreign key on 'fichier_joint' table and 'id' primary key on 'lot' table
        return $this->hasMany(FichierJoint::class, 'lot_id', 'id');
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

            ->useLogName('lot');
    }

}