<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Spatie\Activitylog\Traits\LogsActivity;   // <--- MUST be imported
use Spatie\Activitylog\LogOptions; 
class Fonctionnaire extends Model
{
    use HasFactory;
    use LogsActivity;

    protected $table = 'fonctionnaires'; // Ensure table name is correct
    protected $primaryKey = 'id';       // Ensure primary key is correct

    // Add fillable fields if you create Fonctionnaires through Eloquent
    // protected $fillable = [...];

    public $timestamps = true; // Assuming you have created_at/updated_at

    /**
     * Get the user associated with the fonctionnaire.
     */
    public function user(): HasOne
    {
        // Assumes one Fonctionnaire has at most one User
        return $this->hasOne(User::class, 'fonctionnaire_id', 'id');
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

            ->useLogName('fonctionnaire');
    }
}