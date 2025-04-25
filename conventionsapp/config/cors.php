<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Here you may configure your settings for cross-origin resource sharing
    | or "CORS". This determines which origins are allowed to access your
    | API. You are free to adjust these settings as needed.
    |
    | To learn more: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
    |
    */

'paths' => ['api/*','sanctum/csrf-cookie'],
    'allowed_methods' => ['*'], // Allows all common methods (GET, POST, PUT, PATCH, DELETE, OPTIONS)
    // For production, you might want to list methods explicitly: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']

    'allowed_origins' => [
        // Add the URL of your React frontend application here.
        // Use an environment variable for flexibility between environments.
        env('FRONTEND_URL', 'http://localhost:3000'), // Default for local React dev server
    ],

    'allowed_origins_patterns' => [], // Keep empty unless you need complex regex matching for origins

    'allowed_headers' => [
        '*'
    ],

    'exposed_headers' => [
        // Headers your backend might send that the frontend needs access to.
        // Usually empty unless you have specific custom headers to expose.
    ],

    'max_age' => 0, // Controls caching of preflight requests (OPTIONS). 0 = no cache (good for dev). Increase for production (e.g., 3600).

    'supports_credentials' => true, // MUST be true to allow Authorization headers (and cookies if using Sanctum SPA mode)

];