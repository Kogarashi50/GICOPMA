<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\Traits\LogsActivity;   // <--- MUST be imported
use Spatie\Activitylog\LogOptions;
use App\Models\Province; 
class Commune extends Model
{
    use LogsActivity;

    protected $table = 'commune';
    protected $fillable = [ 'Id','Code',             
    'Description',   
    'Description_Arr',
    'province_id'];
    public $timestamps=true;
    
    // Relationship: Commune belongs to Province
    public function province()
    {
        return $this->belongsTo(Province::class, 'province_id', 'Id');
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
    
            ->useLogName('commune');
    }
}
