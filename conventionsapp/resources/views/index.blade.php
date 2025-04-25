<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}"> {{-- Optional for Mix --}}

        <title>{{ config('app.name', 'Laravel React App') }}</title>

        <!-- Styles -->
        <link rel="stylesheet" href="{{ mix('css/app.css') }}"> {{-- Or direct path /css/app.css --}}
    </head>
    <body>
        <div id="root">Loading Application...</div>

        <!-- Scripts -->
        <script src="{{ mix('js/app.js') }}" defer></script> {{-- Or direct path /js/app.js --}}
    </body>
</html>