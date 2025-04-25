<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\Traits\LogsActivity;   // <--- MUST be imported
use Spatie\Activitylog\LogOptions; 
class Domaine extends Model
{
    use LogsActivity;

    protected $table ='domaine';
    protected $fillable = [ 'Id','Code',             
    'Description',   
    'Description_Arr'];
    public $timestamps=true;
    public function getActivitylogOptions(): LogOptions
{
    return LogOptions::defaults()
        ->logFillable()
        ->logOnlyDirty()
        ->dontSubmitEmptyLogs()

        // ---> THIS LINE IS WHERE YOU STORE THE ACTION DESCRIPTION <---
        ->setDescriptionForEvent(fn(string $eventName) => $eventName)
        // $eventName will automatically be 'created', 'updated', or 'deleted'

        ->useLogName('domaine');
}
}
