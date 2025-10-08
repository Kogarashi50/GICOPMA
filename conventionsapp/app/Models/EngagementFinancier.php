<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo; // Import BelongsTo
use Spatie\Activitylog\Traits\LogsActivity;   // <--- MUST be imported
use Spatie\Activitylog\LogOptions; 
use Illuminate\Database\Eloquent\Relations\HasMany; 
class EngagementFinancier extends Model
{
    use HasFactory; // Optional: if you plan to use factories
    use LogsActivity;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'engagements_financiers';

    /**
     * The primary key associated with the table.
     * Laravel assumes 'id' by default, so this is optional but good for clarity.
     *
     * @var string
     */
    protected $primaryKey = 'id';

    /**
     * Indicates if the model's ID is auto-incrementing.
     * Laravel assumes true by default, so this is optional.
     *
     * @var bool
     */
    public $incrementing = true;

    /**
     * Indicates if the model should be timestamped.
     * Your table schema doesn't explicitly show created_at/updated_at columns.
     * Set this to false if they don't exist. If they DO exist or you plan to add them, set it to true.
     * Based strictly on your CREATE TABLE, they are missing.
     *
     * @var bool
     */
    public $timestamps = false; // Set to true if you have/add created_at and updated_at columns

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'projet_id',
        'partenaire_id',
        'montant_engage',
        'commentaire',
        'date_engagement',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'montant_engage' => 'decimal:2', // Casts to float/string depending on driver, ensures 2 decimal places on retrieval/setting
        'date_engagement' => 'date', // Casts to Carbon instance
    ];

    /**
     * Get the projet associated with the engagement financier.
     *
     * Note: We need to specify the foreign key ('projet_id') and the owner key ('ID_Projet')
     * because they don't follow Laravel's default conventions ('projet_id' and 'id').
     * We deduce 'ID_Projet' from your Projet model's fillable array. If the actual PK is different, adjust accordingly.
     */
    public function projet(): BelongsTo
    {
        // Foreign key on engagements_financiers table, Owner key on projet table
        return $this->belongsTo(Projet::class, 'projet_id', 'ID_Projet');
    }

    /**
     * Get the partenaire associated with the engagement financier.
     *
     * Note: We need to specify the foreign key ('partenaire_id') and the owner key ('id')
     * because the owner key ('id') matches the default convention but it's good practice
     * to be explicit when the foreign key doesn't strictly follow the pattern (e.g., partenaire_id instead of partner_id).
     */
    public function partenaire(): BelongsTo
    {
        // Foreign key on engagements_financiers table, Owner key on partenaire table
        return $this->belongsTo(Partenaire::class, 'partenaire_id', 'Id');
    }
    public function versements(): HasMany
{
    // Foreign key in 'versements' table ('engagement_id')
    // Local key (primary key) in 'engagements_financiers' table ('id')
    return $this->hasMany(Versement::class, 'engagement_id', 'id');
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

        ->useLogName('engagement_financier');
}

}