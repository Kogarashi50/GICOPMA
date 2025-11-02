<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EngagementType extends Model
{
    use HasFactory;

    protected $table = 'engagement_types';

    protected $fillable = [
        'nom',
        'description',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    /**
     * Get the convention partenaires for this engagement type.
     */
    public function conventionPartenaires(): HasMany
    {
        return $this->hasMany(ConvPart::class, 'engagement_type_id');
    }

    /**
     * Scope to get only active engagement types.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
