<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany; // Added
use Illuminate\Database\Eloquent\Relations\BelongsToMany; // Added
use Spatie\Activitylog\Traits\LogsActivity;   // <--- MUST be imported
use Spatie\Activitylog\LogOptions; 
class Avenant extends Model
{
    use HasFactory;
    use LogsActivity;

    protected $table = 'avenants';
    protected $primaryKey = 'id';
    public $incrementing = true;
    public $timestamps = true;
    const CREATED_AT = 'date_creation';
    const UPDATED_AT = null; // Keep or set to null

    protected $fillable = [
        'convention_id',
        'numero_avenant',
        'date_signature',
        'objet',
        'type_modification',
        'montant_modifie',
        'nouvelle_date_fin',
        'id_fonctionnaire',

        // 'fichier_avenant', // <<< REMOVED
        'remarques',
        // Note: partenaire_ids is NOT directly fillable if using pivot table
    ];

    protected $casts = [
        'date_signature' => 'date:Y-m-d',
        'nouvelle_date_fin' => 'date:Y-m-d',
        'montant_modifie' => 'decimal:2',
    ];

    public function convention(): BelongsTo
    {
        return $this->belongsTo(Convention::class, 'convention_id', 'id');
    }

    public function documents(): HasMany
    {
        return $this->hasMany(Document::class, 'avenant_id', 'id');
    }

    /**
     * Get the partner commitments specifically associated with this avenant.
     * Uses the 'convention_partenaire' table via the ConvPart model.
     */
    public function partnerCommitments(): HasMany // <<< CHANGED/ADDED Relationship
    {
        // An Avenant has many entries in convention_partenaire where avenant_id matches
        return $this->hasMany(ConvPart::class, 'avenant_id', 'id');
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
    
            ->useLogName('avenant');
    }

    // REMOVED getFichierUrlAttribute()
    // REMOVED deleting boot method for single file
}