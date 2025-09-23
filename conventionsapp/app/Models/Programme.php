<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Domaine;
use Spatie\Activitylog\Traits\LogsActivity;   // <--- MUST be imported
use Spatie\Activitylog\LogOptions;  
use Illuminate\Database\Eloquent\Relations\BelongsTo; // <-- Import BelongsTo
class Programme extends Model
{
    use LogsActivity;
    protected $primaryKey = 'Id';
    protected $table = "programme";
    protected $fillable = [
        'Description',
        'Code_Programme',
        'domaine_id',
    ];
    public function domaine()
    {
        // This links 'domaine_id' on this table to the 'Id' on the 'domaine' table.
        return $this->belongsTo(Domaine::class, 'domaine_id', 'Id');
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

            ->useLogName('programme');
    }
}

