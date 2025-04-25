<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\Programme;
use App\Models\Province; // Make sure Province is imported
use App\Models\Document;
use App\Models\ConvPart; // Import ConvPart
use App\Models\Partenaire; // Import Partenaire
use App\Models\Avenant;
use App\Models\Projet;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\Activitylog\Traits\LogsActivity;   // <--- MUST be imported
use Spatie\Activitylog\LogOptions; 
class Convention extends Model
{
    // Add HasFactory trait for better testing/seeding capabilities
    use HasFactory;
    use LogsActivity;

    protected $table = 'convention';

    // Assuming your primary key is 'id' which is Eloquent's default
    // protected $primaryKey = 'id';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'code',
        'fichier', // Filename stored here, actual file info in Document model
        'classification_prov',
        'categorie',
        'intitule',
        'reference',
        'id_projet',
        'annee_convention',
        'objet',
        'observations',
        'objectifs',
        'localisation',         // String of Province IDs
        'maitre_ouvrage',
        'partenaire',           // String of ALL Partner IDs (potentially redundant if only using ConvPart)
        'cout_global',
        'cout_cr',
        'statut',
        'operationalisation',
        'Id_Programme',         // Foreign Key to Programme
        'groupe',
        'rang',
        'id_fonctionnaire',
        

        // 'date_signature',       // <<< REMOVED - Moved to ConvPart
        // 'details_signatures',   // <<< REMOVED - Moved to ConvPart ('details_signature')
    ];

    /**
     * Get the programme associated with the convention.
     */
    public function programme()
    {
        // Ensure foreign key 'id_programme' matches Programme's primary key name ('Id'?)
        return $this->belongsTo(Programme::class, 'Id_Programme', 'Id');
    }

    /**
     * Get the province(s) associated with the convention.
     * NOTE: This relationship definition assumes 'localisation' column stores a SINGLE Province ID.
     * If it stores a semicolon-separated string "1;3;5", this relationship won't work directly
     * for loading Province models. You would need an accessor or handle the string manually.
     */
    // public function localisation()
    // {
    //     // This line is likely incorrect if 'localisation' stores "1;3;5"
    //     // return $this->belongsTo(Province::class, 'localisation', 'Id');
    // }

    /**
     * Get the document associated with the convention.
     */
    public function documents()
    {
        // Ensure foreign key 'Id_Conv' matches Convention's primary key ('id'?)
        return $this->hasMany(Document::class, 'Id_Conv', 'id');
    }

    /**
     * Get the partner commitments (ConvPart records) for the convention.
     * This is the primary relationship for managing partners and their signature status/details.
     */
    public function convParts()
    {
        // Ensure foreign key 'Id_Convention' matches Convention's primary key ('id'?)
        // Ensure ConvPart model's primary key is 'Id_CP' if using that in relationships elsewhere
        return $this->hasMany(ConvPart::class, 'Id_Convention', 'id');
    }
    public function projet(): BelongsTo
    {
        // Foreign key on this model ('convention' table): 'id_projet'
        // Owner key on the related model ('projet' table): 'ID_Projet' (adjust if PK name differs)
        return $this->belongsTo(Projet::class, 'id_projet', 'ID_Projet');
    }


    /**
     * Get the partners associated via the pivot table (convention_partenaire).
     * NOTE: This relationship might be redundant if all partner association,
     * commitments, and signature info are handled via the 'convParts' relationship.
     * Decide if you need this Many-to-Many relationship based on your application's needs.
     */
    public function partenaires()
    {
        // Ensure keys match your pivot table columns and related model primary keys
        return $this->belongsToMany(Partenaire::class, 'convention_partenaire', 'Id_Convention', 'Id_Partenaire')
                    ->withTimestamps(); // Optional: if pivot table has timestamps
    }
     public function avenants()
    {
        // convention_id is the foreign key in the avenants table
        // id is the primary key in the conventions table
        return $this->hasMany(Avenant::class, 'convention_id', 'id');
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
    
            ->useLogName('convention');
    }
}