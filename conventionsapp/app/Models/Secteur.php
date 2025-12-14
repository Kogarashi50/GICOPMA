<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Secteur extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'secteurs';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'description_fr',
        'description_ar',
    ];

    /**
     * Get all of the conventions for the Secteur.
     */
    public function conventions(): HasMany
    {
        return $this->hasMany(Convention::class, 'secteur_id');
    }
    public function projets(): HasMany
{
    return $this->hasMany(Projet::class, 'secteur_id');
}
}