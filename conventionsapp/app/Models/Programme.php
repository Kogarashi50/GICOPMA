<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Chantier;
use Spatie\Activitylog\Traits\LogsActivity;   // <--- MUST be imported
use Spatie\Activitylog\LogOptions;  
class Programme extends Model
{
    use LogsActivity;

    protected $table = "programme";
    protected $fillable = [
        'Id',
        'Description',
        'Code_Programme',
        'Id_Chantier',
    ];
    public function chantier()
    {
        return $this->belongsTo(Chantier::class, 'Id_Chantier', 'Code_Chantier');
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

