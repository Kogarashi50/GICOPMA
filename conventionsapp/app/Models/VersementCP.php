<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\Activitylog\Traits\LogsActivity;   // <--- MUST be imported
use Spatie\Activitylog\LogOptions; 
/**
 * Represents a payment (versement) linked to a partner commitment (convention_partenaire).
 *
 * Corresponds to the 'versementsCP' database table.
 */
class VersementCP extends Model
{
    use HasFactory;
    use LogsActivity;

    protected $table = 'versementsCP';
    protected $primaryKey = 'id';
    public $incrementing = true;
    protected $keyType = 'int';
    public $timestamps = false;

    protected $fillable = [
        'id_CP',             // Foreign key linking to convention_partenaire
        'date_versement',    // Date of payment
        'montant_verse',     // Amount of payment
        'moyen_paiement',    // Payment method (e.g., 'Virement', 'Chèque')
        'reference_paiement',// Optional payment reference (e.g., transaction ID)
        'commentaire',       // Optional comments
    ];

    protected $casts = [
        'date_versement' => 'date:Y-m-d',
        'montant_verse'  => 'decimal:2',
        'id_CP'          => 'integer',
    ];

    // Relationship to the parent ConvPart (still useful!)
    public function convPart(): BelongsTo
    {
        return $this->belongsTo(ConvPart::class, 'id_CP', 'Id_CP');
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

            ->useLogName('versementcp');
    }
}