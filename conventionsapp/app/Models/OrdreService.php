<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\Activitylog\Traits\LogsActivity;   // <--- MUST be imported
use Spatie\Activitylog\LogOptions;
use App\Models\FichierJoint;  
// Use Storage facade if you plan to add URL accessors later
// use Illuminate\Support\Facades\Storage;

class OrdreService extends Model
{
    use HasFactory;
    use LogsActivity;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'ordre_service';

    /**
     * The primary key associated with the table.
     *
     * @var string
     */
    protected $primaryKey = 'id';

    /**
     * Indicates if the IDs are auto-incrementing.
     *
     * @var bool
     */
    public $incrementing = true;

    /**
     * The "type" of the auto-incrementing ID.
     * (BIGINT is handled by PHP's int/string types)
     *
     * @var string
     */
    protected $keyType = 'int';

    /**
     * Define custom timestamp column names to match the database schema.
     */
    const CREATED_AT = 'cree_le';
    const UPDATED_AT = 'modifie_le';

    /**
     * Indicates if the model should be timestamped using the custom columns.
     *
     * @var bool
     */
    public $timestamps = true;

    /**
     * The attributes that are mass assignable.
     * These are the fields you expect to fill when creating/updating
     * via methods like ::create() or ->update().
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'marche_id',        // Foreign key to MarchePublic (Required for creation)
        'type',             // ENUM ('commencement', 'arret')
        'numero',           // Service order number/reference
        'date_emission',    // Issue date
        'description',      // Optional text description
        'fichier_joint',    // Relative path/filename of the attached file
        'cree_par',         // ID of the user who created it (nullable, treated as integer attribute)
        'id_fonctionnaire',
    ];

    /**
     * The attributes that should be cast to native types.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'date_emission' => 'date:Y-m-d', // Cast to Carbon date object, format for serialization
        'marche_id' => 'integer',      // Cast foreign key to integer
        'cree_par' => 'integer',       // Cast user ID attribute to integer
        // 'type' will be treated as string by default, which is usually sufficient for ENUMs.
        // Consider Laravel Enum casting (Laravel 9+) for stricter typing if needed:
        // 'type' => \App\Enums\OrdreServiceType::class,
    ];

    //--------------------------------------------------------------------------
    // Relationships
    //--------------------------------------------------------------------------

    /**
     * Get the MarchePublic (public market) that this service order belongs to.
     * Defines the inverse of a one-to-many relationship (an OrdreService belongs to one MarchePublic).
     */
    public function marchePublic(): BelongsTo
    {
        // Foreign key is 'marche_id', Owner key on 'marche_public' is 'id'.
        return $this->belongsTo(MarchePublic::class, 'marche_id', 'id');
    }

    /**
     * Note: No 'createur' relationship is defined here because 'cree_par'
     * is just an integer attribute storing a user ID, without a formal
     * foreign key constraint in the database schema provided earlier.
     * User details would need to be fetched manually using the 'cree_par' ID.
     */
    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logFillable()
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()

            // ---> THIS LINE IS WHERE YOU STORE THE ACTION DESCRIPTION <---
            ->setDescriptionForEvent(fn(string $eventName) => $eventName)
            // $eventName will automatically be 'created', 'updated', or 'deleted'

            ->useLogName('ordre_service');
    }
    public function fichiers()
{
    return $this->hasMany(FichierJoint::class);
}


    //--------------------------------------------------------------------------
    // Accessors & Mutators (Optional Enhancements)
    //--------------------------------------------------------------------------

    /**
     * Example Accessor: Get the full URL for the attached file.
     * Uncomment and modify if needed, requires `use Illuminate\Support\Facades\Storage;`.
     * Assumes storage linked at public/storage and files are in the public disk.
     *
     * public function getFichierJointUrlAttribute(): ?string
     * {
     *     if ($this->fichier_joint && Storage::disk('public')->exists($this->fichier_joint)) {
     *         return Storage::disk('public')->url($this->fichier_joint);
     *     }
     *     return null;
     * }
     */

    /**
     * Example Mutator: Ensure 'type' is always stored in lowercase.
     *
     * public function setTypeAttribute($value): void
     * {
     *     $this->attributes['type'] = strtolower($value);
     * }
     */
}