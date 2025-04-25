<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
// Need Casts\AsArrayObject or Casts\AsCollection for easier JSON handling
use Illuminate\Database\Eloquent\Casts\AsArrayObject;
use Spatie\Activitylog\Traits\LogsActivity;   // <--- MUST be imported
use Spatie\Activitylog\LogOptions; 
/**
 * App\Models\AppelOffre
 *
 * Represents an 'appel_offre' (Call for Tender) record in the database.
 * Stores multiple province names in a JSON column.
 *
 * @property int $id
 * @property string $categorie Type of tender (Travaux, Etudes, Services, Fournitures)
 * @property array|null $provinces Array of province/prefecture names (stored as JSON)
 * @property string $numero Unique tender reference number
 * @property string $intitule Title/Subject of the tender
 * @property float|null $estimation Total estimated cost (TTC?) - nullable
 * @property float $estimation_HT Estimated cost before tax (HT)
 * @property float $montant_TVA Calculated VAT amount
 * @property int|null $duree_execution Duration in days
 * @property \Illuminate\Support\Carbon|null $date_verification Verification date
 * @property \Illuminate\Support\Carbon|null $date_ouverture Bid opening date
 * @property \Illuminate\Support\Carbon|null $last_session_op Date of the last bid opening session
 * @property bool $lancement_portail Flag indicating if published on portal
 * @property \Illuminate\Support\Carbon|null $date_lancement_portail Date published on portal
 * @property \Illuminate\Support\Carbon|null $created_at Timestamp of creation
 * @property \Illuminate\Support\Carbon|null $updated_at Timestamp of last update
 *
 */
class AppelOffre extends Model
{
    use LogsActivity;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'appel_offre';

    /**
     * Indicates if the model should be timestamped.
     *
     * @var bool
     */
    public $timestamps = true;

    /**
     * The attributes that are mass assignable.
     * Replace 'province' ENUM with 'provinces' JSON.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'categorie',
        'provinces', // <-- CHANGED to plural JSON field name
        'numero',
        'intitule',
        'estimation',
        'estimation_HT',
        'montant_TVA',
        'duree_execution',
        'date_verification',
        'date_ouverture',
        'last_session_op',
        'lancement_portail',
        'date_lancement_portail',
        'date_publication', // <-- ADDED to fillable
        'id_fonctionnaire',


    ];

    /**
     * The attributes that should be cast to native types.
     * Cast the 'provinces' column to a PHP array.
     *
     * @var array<string, string>
     */
    protected $casts = [
        // Cast the JSON column to a PHP array when accessed/set
        'provinces' => 'array', 
        'date_publication' => 'date:Y-m-d', // <-- ADDED cast for datetime column

        'estimation' => 'decimal:2',
        'estimation_HT' => 'decimal:2',
        'montant_TVA' => 'decimal:2',
        'duree_execution' => 'integer',
        'date_verification' => 'date:Y-m-d',
        'date_ouverture' => 'date:Y-m-d',
        'last_session_op' => 'date:Y-m-d',
        'lancement_portail' => 'boolean',
        'date_lancement_portail' => 'date:Y-m-d',
    ];
    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logFillable()
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
    
            // ---> THIS LINE IS WHERE YOU STORE THE ACTION DESCRIPTION <---
            ->setDescriptionForEvent(fn(string $eventName) => $eventName)
            // $eventName will automatically be 'created', 'updated', or 'deleted'
    
            ->useLogName('appel_offre');
    }


    // --- Relationships ---
    // No province relationship needed as it's stored directly.

}