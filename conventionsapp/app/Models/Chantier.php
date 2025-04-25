<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\Traits\LogsActivity;   // <--- MUST be imported
use Spatie\Activitylog\LogOptions; 
class Chantier extends Model
{
    use LogsActivity;
    
    protected $table = "chantier";
    protected $fillable = [
    'Id',
        'Description',
        'Code_Chantier',
        'Id_Domaine',
    ];
    public function domaine()
    {
        return $this->belongsTo(Domaine::class, 'Id_Domaine', 'Code');
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
    
            ->useLogName('chantier');
    }
}
