<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage; // Import Storage facade
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
      * Indicates if the model should be timestamped.
      * Map Laravel's timestamp columns to your actual table columns.
      */
     const CREATED_AT = 'date_ajout'; // Use 'date_ajout' as the creation timestamp
     const UPDATED_AT = null; // Disable 'updated_at' if the column doesn't exist

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'marche_id', // Allow filling these foreign keys
        'lot_id',
        'nom_fichier',
        'chemin_fichier',
        'type_fichier',
        // 'date_ajout' is handled by CREATED_AT mapping
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        // 'date_ajout' => 'datetime', // Handled by CREATED_AT constant
        'marche_id' => 'integer',
        'lot_id' => 'integer',
    ];

     /**
      * The accessors to append to the model's array form.
      * Useful for adding dynamic attributes like download URLs to JSON responses.
      *
      * @var array
      */
     protected $appends = ['download_url']; // Add dynamic attribute for download URL


    // --- Relationships ---

    /**
     * Get the main public market that this file might belong to (if marche_id is set).
     */
    public function marchePublic(): BelongsTo
    {
        return $this->belongsTo(MarchePublic::class, 'marche_id', 'id');
    }

    /**
     * Get the lot that this file might belong to (if lot_id is set).
     */
    public function lot(): BelongsTo
    {
        return $this->belongsTo(Lot::class, 'lot_id', 'id');
    }

    // --- Accessors & Mutators ---

    /**
     * Get the full URL for downloading the file.
     * Generates a temporary URL or uses the public storage URL.
     *
     * @return string|null
     */
    public function getDownloadUrlAttribute(): ?string
    {
        $path = $this->chemin_fichier;
        $disk = 'public'; // Assuming file is on the public disk

        if ($path && Storage::disk($disk)->exists($path)) {
            // Option 1: If files are truly public via storage:link
             return Storage::disk($disk)->url($path);

            // Option 2: Generate a temporary signed URL (more secure if files aren't public)
            // Requires a route definition like: Route::get('/files/download/{fichier_joint}', [FichierJointController::class, 'downloadSigned'])->name('file.download.signed');
            // return URL::temporarySignedRoute(
            //     'file.download.signed', now()->addMinutes(30), ['fichier_joint' => $this->id]
            // );

            // Option 3: Link to the direct download controller action (less common to put in model)
            // return route('api.file.download', ['fichier_joint' => $this->id]); // Assuming route is named
        }

        return null; // Return null if file doesn't exist
    }
   
}