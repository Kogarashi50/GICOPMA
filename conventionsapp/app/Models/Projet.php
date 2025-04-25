<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo; // Good practice to import
use Illuminate\Database\Eloquent\Relations\HasMany;   // Import HasMany
use Spatie\Activitylog\Traits\LogsActivity;   // <--- MUST be imported
use Spatie\Activitylog\LogOptions; 
class Projet extends Model
{
    use LogsActivity;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'projet';

    /**
     * The primary key associated with the table.
     * Laravel assumes 'id' by default, explicitly setting it for clarity.
     *
     * @var string
     */
    protected $primaryKey = 'ID_Projet'; // Explicitly define the primary key

    /**
     * Indicates if the model's ID is auto-incrementing.
     * Set to false if ID_Projet is not auto-incrementing (e.g., a code).
     * Assuming it's auto-incrementing based on general practice, but adjust if needed.
     *
     * @var bool
     */
    public $incrementing = true; // Set to false if ID_Projet is not an auto-incrementing integer

    /**
     * The data type of the primary key.
     *
     * @var string
     */
    protected $keyType = 'int'; // Or 'string' if it's not an integer

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        // Keep the exact casing as defined in your previous model
        "ID_Projet", // Typically, you might not want the PK in fillable if it's auto-incrementing
        "Nom_Projet",
        "Id_Domaine",
        "Id_Programme",
        "Id_Chantier",
        "Cout_CRO",
        "Date_Debut",
        "Observations",
        "Etat_Avan_Physi",
        "Date_Fin",
        "Convention_Code",
        "Code_Projet",
        "Cout_Projet",
        'id_fonctionnaire',

    ];
    protected $casts = [
        'Etat_Avan_Finan' => 'float', // or 'decimal:2'
        'Etat_Avan_Physi' => 'float', // or 'decimal:2'
        'Cout_Projet' => 'float', // or 'decimal:2'
        'Date_Fin' => 'date', // or 'decimal:2'
        'Date_Debut' => 'date', // or 'decimal:2'
        'Cout_CRO' => 'float', // or 'decimal:2'
        

    ];
    /**
     * Indicates if the model should be timestamped.
     *
     * @var bool
     */
    public $timestamps = true; // Keep as true since you have it

    /**
     * Get the domaine associated with the projet.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function domaine(): BelongsTo
    {
        // Foreign key on projet table ('Id_Domaine'), Owner key on domaine table ('Code')
        return $this->belongsTo(Domaine::class, 'Id_Domaine', 'Code');
    }

    /**
     * Get the programme associated with the projet.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function programme(): BelongsTo
    {
        // Foreign key on projet table ('Id_Programme'), Owner key on programme table ('Code_Programme')
        return $this->belongsTo(Programme::class, 'Id_Programme', 'Code_Programme');
    }

    /**
     * Get the chantier associated with the projet.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function chantier(): BelongsTo
    {
        // Foreign key on projet table ('Id_Chantier'), Owner key on chantier table ('Code_Chantier')
        return $this->belongsTo(Chantier::class, 'Id_Chantier', 'Code_Chantier');
    }

    /**
     * Get the convention associated with the projet.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function convention(): BelongsTo
    {
        // Foreign key on projet table ('Convention_Code'), Owner key on convention table ('Code')
        return $this->belongsTo(Convention::class, 'Convention_Code', 'Code');
    }

    /**
     * Get the financial engagements associated with the projet.
     * ADDED RELATIONSHIP
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function engagementsFinanciers(): HasMany
    {
        // Foreign key in 'engagements_financiers' table ('projet_id')
        // Local key (primary key) in 'projet' table ('ID_Projet')
        return $this->hasMany(EngagementFinancier::class, 'projet_id', 'ID_Projet');
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

            ->useLogName('projet');
    }
}