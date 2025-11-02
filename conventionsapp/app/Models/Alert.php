<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class Alert extends Model
{
    use HasFactory;
    protected $with = ['alertType'];
    protected $table = 'alerts';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'user_id',
        'alert_type_id',
        'message',
        'link',
        'read_at',
        'created_at', // Also good practice to include timestamps
        'updated_at',
    ];

    protected $casts = [
        'read_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    protected static function boot()
    {
        parent::boot();
        static::creating(function ($model) {
            if (empty($model->{$model->getKeyName()})) {
                $model->{$model->getKeyName()} = Str::uuid()->toString();
            }
        });
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Get the alert type for this alert.
     * This relationship is essential.
     */
    public function alertType(): BelongsTo
    {
        return $this->belongsTo(AlertType::class, 'alert_type_id');
    }
}