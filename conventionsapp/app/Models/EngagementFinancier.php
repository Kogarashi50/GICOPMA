<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;

class EngagementFinancier extends Model
{
    use HasFactory, LogsActivity;

    protected $table = 'engagements_financiers';
    protected $primaryKey = 'id';
    public $incrementing = true;

    // --- FIX 1: Enable timestamps, as added in the migration ---
    public $timestamps = true;

    // --- FIX 2: Add all the new fields to the fillable array ---
    protected $fillable = [
        'projet_id',
        'partenaire_id',
        'engagement_type_id', // <-- ADDED
        'montant_engage',
        'autre_engagement',   // <-- ADDED
        'commentaire',
        'date_engagement',
        'is_signatory',       // <-- ADDED
        'details_signature',  // <-- ADDED
    ];

    // --- FIX 3: Add new casts for better data handling ---
    protected $casts = [
        'montant_engage' => 'decimal:2',
        'date_engagement' => 'date',
        'is_signatory' => 'boolean', // <-- ADDED
    ];

    // --- FIX 4: Add the missing relationship to EngagementType ---
    /**
     * Get the type of engagement (e.g., Financial, Technical).
     * Assumes you have an EngagementType model and 'engagement_types' table.
     */
    public function engagementType(): BelongsTo
    {
        return $this->belongsTo(EngagementType::class, 'engagement_type_id', 'id');
    }

    // --- Existing Relationships (No Changes Needed) ---
    public function projet(): BelongsTo
    {
        return $this->belongsTo(Projet::class, 'projet_id', 'ID_Projet');
    }

    public function partenaire(): BelongsTo
    {
        return $this->belongsTo(Partenaire::class, 'partenaire_id', 'Id');
    }

    public function versements(): HasMany
    {
        return $this->hasMany(Versement::class, 'engagement_id', 'id');
    }
public function engagementsAnnuels(): HasMany
    {
        return $this->hasMany(EngagementAnnuel::class, 'engagement_id', 'id');
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logFillable()
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->setDescriptionForEvent(fn(string $eventName) => "This model has been {$eventName}")
            ->useLogName('engagement_financier');
    }
}