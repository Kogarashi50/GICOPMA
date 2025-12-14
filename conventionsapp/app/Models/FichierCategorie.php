<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FichierCategorie extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'fichier_categories';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'label',
        'value',
    ];

    /**
     * Get all the files associated with this category.
     */
    public function fichiers(): HasMany
    {
        return $this->hasMany(FichierJoint::class, 'fichier_categorie_id');
    }
}