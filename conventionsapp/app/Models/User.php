<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Casts\Attribute; // <-- Import Attribute
use Spatie\Permission\Traits\HasRoles; // <-- If using Spatie Permissions
use Spatie\Activitylog\Traits\LogsActivity;   // <--- MUST be imported
use Spatie\Activitylog\LogOptions; 
class User extends Authenticatable
{
    // Apply the necessary traits
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes, HasRoles; // Added HasRoles
    use LogsActivity;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'email',            // <<< --- ADDED (Required by error)
        'password',         // <<< --- ADDED (Usually required for creation)
        'status',           // <<< --- ADDED (Sent by frontend form)
        'fonctionnaire_id', // <<< --- ADDED (Sent by frontend form)
        // Add 'name' or other fields if you have them and they should be fillable
    ];

    /**
     * The attributes that should be hidden for serialization.
     * (Prevents sending sensitive info like passwords in API responses)
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];
    public $guard_name = 'sanctum';

    /**
     * The attributes that should be cast.
     * (Ensures data types are correct, e.g., dates, hashed passwords)
     *
     * @var array<string, string>
     */
    protected $casts = [
        'email_verified_at' => 'datetime', // Standard Laravel field
        // Use the modern 'hashed' caster for passwords (Laravel 9+)
        // If using older Laravel, you might need a mutator instead.
        'password' => 'hashed',
    ];

    /**
     * Get the fonctionnaire that owns the user.
     */
    public function fonctionnaire(): BelongsTo
    {
        // Ensure the related model class exists and the namespace is correct
        return $this->belongsTo(Fonctionnaire::class, 'fonctionnaire_id', 'id');
    }

    /**
     * Get the user's full name from the related fonctionnaire.
     *
     * This accessor computes the full name.
     * You access it like $user->nom_complet
     */
    protected function nomComplet(): Attribute // Accessor name matches desired key
    {
        return Attribute::make(
            get: function () {
                // Eager load 'fonctionnaire' if not already loaded to avoid N+1 issues
                // Although loading should ideally happen in the controller/route
                $this->loadMissing('fonctionnaire');

                // Combine prenom and nom, handling potential nulls
                return $this->fonctionnaire
                            ? trim(($this->fonctionnaire->prenom ?? '') . ' ' . ($this->fonctionnaire->nom ?? ''))
                            : $this->email; // Fallback to email if no fonctionnaire
            }
        );
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

            ->useLogName('utilisateur');
    }

    /**
     * The accessors to append to the model's array form.
     * This makes 'nom_complet' automatically appear in JSON responses.
     *
     * @var array
     */
    protected $appends = ['nom_complet'];

}