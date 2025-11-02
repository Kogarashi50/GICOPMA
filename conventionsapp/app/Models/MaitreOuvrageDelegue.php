<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;

class MaitreOuvrageDelegue extends Model
{
    use HasFactory, LogsActivity;

    protected $table = 'maitre_ouvrage_delegue';

    protected $fillable = [
        'nom',
        'description',
        'contact',
        'email',
        'telephone',
        'adresse',
    ];

    /**
     * Get the conventions that belong to this maître d'ouvrage délégué.
     */
    public function conventions(): BelongsToMany
    {
        return $this->belongsToMany(Convention::class, 'convention_maitre_ouvrage_delegue', 'maitre_ouvrage_delegue_id', 'convention_id')
                    ->withTimestamps();
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logFillable()
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->setDescriptionForEvent(fn(string $eventName) => $eventName)
            ->useLogName('maitre_ouvrage_delegue');
    }
}
