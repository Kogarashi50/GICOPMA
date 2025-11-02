<?php

namespace App\Models;

use Spatie\Permission\Models\Role as SpatieRole;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Role extends SpatieRole
{
    /**
     * A role may be assigned many alert subscriptions.
     */
    public function alertSubscriptions(): HasMany
    {
        return $this->hasMany(AlertSubscription::class, 'role_id');
    }
}