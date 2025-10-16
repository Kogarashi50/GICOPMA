<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\Programme;
use App\Models\Province; 
use App\Models\Document;
use App\Models\ConvPart; 
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Convention extends Model
{
    use HasFactory, LogsActivity;

    protected $table = 'convention';

  

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'code',
        'code_provisoire',
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
        'statut',
        'operationalisation',
        'Id_Programme',         
        'groupe',
        'rang',
        'id_fonctionnaire',
        'numero_approbation', // Add this
        'session',
         'convention_cadre_id', // ADD THIS
   
        'type',
        'date_visa',
        'date_reception_vise',
        'duree_convention',
        'maitre_ouvrage_delegue',
        'membres_comite_technique',
        'membres_comite_pilotage',

    ];
    protected $casts = [


    'membres_comite_technique' => 'array',
    'membres_comite_pilotage' => 'array',
];

    /**
     * Get the programme that owns the convention.
     */
// in app/Models/Convention.php

public function programme(): BelongsTo
{
    // We are adding 'Id' as the third argument
    return $this->belongsTo(Programme::class, 'Id_Programme', 'Id');
}
    /**
     * Get the projet associated with the convention.
     */
    public function projet(): BelongsTo
    {
        return $this->belongsTo(Projet::class, 'id_projet');
    }

    public function documents()
    {
        return $this->hasMany(Document::class, 'Id_Conv', 'id');
    }
public function conventionCadre(): BelongsTo
    {
        return $this->belongsTo(Convention::class, 'convention_cadre_id');
    }

    /**
     * Get all the child "specifique" conventions for a "cadre" convention.
     */
    public function conventionsSpecifiques(): HasMany
    {
        return $this->hasMany(Convention::class, 'convention_cadre_id', 'id');
    }

    public function convParts()
    {

        return $this->hasMany(ConvPart::class, 'Id_Convention', 'id');
    }

    public function partenaires()
    {
        return $this->belongsToMany(Partenaire::class, 'convention_partenaire', 'Id_Convention', 'Id_Partenaire')
                    ->withTimestamps(); 
    }
     public function avenants()
    {

        return $this->hasMany(Avenant::class, 'convention_id', 'id');
    }
    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logFillable()
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
    
            ->setDescriptionForEvent(fn(string $eventName) => $eventName)
    
            ->useLogName('convention');
    }
}