<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory; // <<< ADD HasFactory trait
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ConvPart extends Model
{
    use HasFactory; // <<< ADD HasFactory trait

    /**
     * The table associated with the model.
     * Explicitly defining is good practice.
     *
     *
     */
    protected $table = 'convention_partenaire';

    /**
     * The primary key associated with the table.
     * Define if it's not 'id'.
     *
     * 
     */
    protected $primaryKey = 'Id_CP'; // Assuming this is your primary key

    /**
     * Indicates if the model's ID is auto-incrementing.
     * Set to false if Id_CP is not auto-incrementing (e.g., UUID).
     *
     * 
     */
    public $incrementing = true;

    /**
     * The data type of the auto-incrementing ID.
     *
     *
     */
    protected $keyType = 'int'; // Or 'string' etc.

    /**
     * Indicates if the model should be timestamped.
     * Set to true if your table has created_at and updated_at columns.
     *
     *
     */
    // public $timestamps = true; // Uncomment if you have timestamps

    /**
     * The attributes that are mass assignable.
     *
     * 
     */
    protected $fillable = [
        // 'Id_CP', // <<< REMOVE Primary Key if auto-incrementing
        'Id_Convention',
        'Id_Partenaire',
        'Montant_Convenu',
        'is_signatory',  
        'autre_engagement',       // <<< ADDED
        'engagement_type_id',      // <<< ADDED for multiple engagement types
        'engagement_description',  // <<< ADDED for custom engagement description
        'date_signature', 
        'avenant_id',      // <<< ADDED
        'details_signature',    // <<< ADDED
    ];

    /**
     * The attributes that should be cast.
     * Useful for ensuring boolean and date types.
     *
     * 
     */
    protected $casts = [
        'Montant_Convenu' => 'decimal:2', // Example: cast to decimal with 2 places
        'is_signatory' => 'boolean',      // <<< ADDED cast
        'date_signature' => 'date:Y-m-d', // <<< ADDED cast (ensures correct format)
    ];


    /**
     * Get the partner associated with this commitment.
     */
    public function partenaire()
    {
        // Ensure 'Id_Partenaire' is the FK in conv_parts
        // Ensure 'Id' is the PK in the partenaires table
        return $this->belongsTo(Partenaire::class, 'Id_Partenaire', 'Id');
    }

    /**
     * Get the convention associated with this commitment.
     */
    public function convention()
    {
        // Ensure 'Id_Convention' is the FK in conv_parts
        // Ensure 'id' is the PK in the convention table
        return $this->belongsTo(Convention::class, 'Id_Convention', 'id');
    }
     public function avenant()
    {
        // Assuming an Avenant can have many ConvPart entries
        return $this->belongsTo(Avenant::class, 'avenant_id', 'id'); // Adjust keys if needed
    }
    public function versements(): HasMany
    {
        // foreign key on the *related* model's table ('versementsCP'.'id_CP')
        // local key (PK) on *this* model's table ('convention_partenaire'.'Id_CP')
        return $this->hasMany(VersementCP::class, 'id_CP', 'Id_CP');
    }
    public function engagementsAnnuels(): HasMany
    {
        return $this->hasMany(EngagementAnnuel::class, 'id_cp', 'Id_CP');
    }

    /**
     * Get the engagement type for this convention partenaire.
     */
    public function engagementType()
    {
        return $this->belongsTo(EngagementType::class, 'engagement_type_id');
    }
}