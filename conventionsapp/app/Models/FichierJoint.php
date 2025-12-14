<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FichierJoint extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'fichier_joint';

    /**
     * Personnalisation des colonnes de timestamp.
     */
    const CREATED_AT = 'date_ajout'; // Utilise 'date_ajout' comme timestamp de création
    const UPDATED_AT = null;         // Désactive 'updated_at' car la colonne n'existe pas

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'ordre_service_id', // <-- MUST be here
        'marche_id',
        'lot_id',
                'fichier_categorie_id', // <-- UPDATE THIS LINE

        'appel_offre_id', // <-- NOUVEAU : Pour lier à un Appel d'Offre
        'nom_fichier',
        'intitule',       // <-- NOUVEAU : Le titre personnalisé du fichier
        'categorie',      // <-- NOUVEAU : La catégorie du fichier (cps, rc, etc.)
        'chemin_fichier',
        'type_fichier',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        // 'date_ajout' est géré automatiquement par Laravel grâce à la constante CREATED_AT
        'marche_id' => 'integer',
        'lot_id' => 'integer',
        'appel_offre_id' => 'integer', // <-- NOUVEAU
    ];

    // NOTE : L'attribut `$appends = ['download_url']` a été retiré.
    // C'est une meilleure pratique de générer les URLs dans le contrôleur (API)
    // uniquement quand c'est nécessaire, pour améliorer les performances et éviter
    // des calculs inutiles lors de chaque récupération du modèle.

    // --- RELATIONS ---

    /**
     * Récupère le marché public auquel ce fichier appartient.
     */
    public function marchePublic(): BelongsTo
    {
        return $this->belongsTo(MarchePublic::class, 'marche_id');
    }

    /**
     * Récupère le lot auquel ce fichier appartient.
     */
    public function lot(): BelongsTo
    {
        return $this->belongsTo(Lot::class, 'lot_id');
    }
public function categorie(): BelongsTo
    {
        return $this->belongsTo(FichierCategorie::class, 'fichier_categorie_id');
    }
    /**
     * NOUVELLE RELATION
     * Récupère l'appel d'offre auquel ce fichier appartient.
     */
    public function appelOffre(): BelongsTo
    {
        return $this->belongsTo(AppelOffre::class, 'appel_offre_id');
    }
}