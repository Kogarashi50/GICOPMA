<?php
return [
    'defaults' => [
        'guard' => 'web', // Default for web requests
        'passwords' => 'users', // Match provider key
    ],
    'guards' => [
        'web' => [
            'driver' => 'session',
            'provider' => 'users', // Your provider name
        ],
        // Define the sanctum guard for API token authentication
        'sanctum' => [
            'driver' => 'sanctum',
            'provider' => 'users', // Use your provider name
        ],
        'create communes' => [
        'driver' => 'session', // Or 'sanctum', 'token', etc. Choose the right driver
        'provider' => 'users',   // Make sure this provider ('users') exists below
        ],
    ],
    'providers' => [
        // Define your user provider
        'users' => [
            'driver' => 'eloquent',
            'model' =>  App\Models\User::class,// Correct path to YOUR model
        ],
    ],
    'passwords' => [
        // Ensure this key matches 'defaults.passwords' and 'providers' key
        'users' => [
            'provider' => 'users',
            'table' => env('AUTH_PASSWORD_RESET_TOKEN_TABLE', 'password_reset_tokens'),
            'expire' => 60,
            'throttle' => 60,
        ],
    ],
    'password_timeout' => env('AUTH_PASSWORD_TIMEOUT', 10800),
];