<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\Activitylog\Traits\LogsActivity;   // <--- MUST be imported
use Spatie\Activitylog\LogOptions; 
/**
 * Represents a single payment (versement) made against a financial commitment.
 *
 * Maps to the 'versements' database table.
 */
class Versement extends Model
{
    use HasFactory; // Optional: if you plan to use factories
    use LogsActivity;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'versements';

    /**
     * The primary key associated with the table.
     * Laravel assumes 'id' by default, specified here for clarity.
     *
     * @var string
     */
    protected $primaryKey = 'id';

    /**
     * Indicates if the model's ID is auto-incrementing.
     * Laravel assumes true by default.
     *
     * @var bool
     */
    public $incrementing = true;

    /**
     * Indicates if the model should be timestamped.
     * Your 'versements' table schema does NOT include created_at/updated_at columns.
     * Set this to false.
     *
     * @var bool
     */
    public $timestamps = false; // IMPORTANT: No created_at/updated_at in the table

    /**
     * The attributes that are mass assignable.
     * These correspond to the columns in your 'versements' table
     * that you want to allow filling via methods like create() or fill().
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'engagement_id',    // Foreign key linking to the financial commitment
        'date_versement',   // Date the payment was made
        'montant_verse',    // Amount of the payment
        'moyen_paiement',   // Method of payment (e.g., 'Virement', 'Chèque')
        'reference_paiement', // Optional payment reference (e.g., transaction ID, check number)
        'commentaire',      // Optional notes about the payment
    ];

    /**
     * The attributes that should be cast to native types.
     * Useful for ensuring data types are handled correctly (e.g., dates, decimals).
     *
     * @var array<string, string>
     */
    protected $casts = [
        'date_versement' => 'date',         // Cast to Carbon date instance
        'montant_verse' => 'decimal:2',    // Cast to decimal with 2 places (important for money)
        'engagement_id' => 'integer',      // Optional: Cast foreign key to integer
    ];

    // --------------------------------------------------------------------------
    // Relationships
    // --------------------------------------------------------------------------

    /**
     * Get the financial engagement (commitment) that this payment belongs to.
     * Defines the inverse of a one-to-many relationship.
     * Each Versement belongs to one EngagementFinancier.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function engagementFinancier(): BelongsTo
    {
        // Foreign key on 'versements' table ('engagement_id')
        // Owner key on 'engagements_financiers' table ('id') - Laravel default
        return $this->belongsTo(EngagementFinancier::class, 'engagement_id');
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

            ->useLogName('versementpp');
    }
}