<?php
// File: app/Models/EngagementAnnuel.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EngagementAnnuel extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'engagements_annuels';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'id_cp',
        'annee',
        'montant_prevu',
    ];

    /**
     * Get the parent commitment (ConvPart) that this yearly engagement belongs to.
     */
    public function convPart(): BelongsTo
    {
        return $this->belongsTo(ConvPart::class, 'id_cp', 'Id_CP');
    }
}