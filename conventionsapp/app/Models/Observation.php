<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo; // You might need this for the 'fonctionnaire' relationship
use Illuminate\Support\Facades\Storage;

class Observation extends Model
{
    use HasFactory;
    public $timestamps=false;
    protected $incrimenting=true;
    protected $primaryKey='id';
    protected $table='observations';


    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'id_fonctionnaire',
        'observation',
        'date_observation',
        'fichiers_joints', // <-- Add the new column to allow mass assignment
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'fichiers_joints' => 'array', // <-- Automatically converts the JSON column to/from a PHP array
    ];

    /**
     * Get the fonctionnaire that owns the observation.
     */
    public function fonctionnaire(): BelongsTo
    {
        return $this->belongsTo(Fonctionnaire::class, 'id_fonctionnaire');
    }

    /**
     * The "booted" method of the model.
     *
     * @return void
     */
    protected static function boot()
    {
        parent::boot();

        // This event is triggered whenever an Observation is being deleted.
        static::deleting(function ($observation) {
            // Delete all physical files associated with this observation from storage.
            if (is_array($observation->fichiers_joints)) {
                foreach ($observation->fichiers_joints as $file) {
                    // Check if the file object has a path and delete it.
                    if (isset($file['chemin_fichier'])) {
                        Storage::disk('public')->delete($file['chemin_fichier']);
                    }
                }
            }

            // After deleting individual files, delete the entire parent directory for this observation.
            // This is good practice for cleanup.
            Storage::disk('public')->deleteDirectory('uploads/observations/' . $observation->id);
        });
    }
}