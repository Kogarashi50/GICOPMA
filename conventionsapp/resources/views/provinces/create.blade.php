<!DOCTYPE html>
<html>
<head>
    <title>Create Province</title>
    <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
    <link rel="stylesheet" href="{{ asset('css/index.css') }}">
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="{{ asset('css/create.css') }}">
    <style>
        .error-message {
            color: red;
        }
        .has-error input, .has-error textarea {
            border-color: red;
        }
        .hidden {
            display: none;
        }
    </style>
</head>
<body>
    @include('sidebar')
    <div class="container">
        <h1>Create New Province</h1>
        <form action="{{ route('provinces.store') }}" method="POST">
            @csrf
            <div class="form-group">
                <label for="description">Description</label>
                <input type="text" name="description" class="form-control @error('description') is-invalid @enderror" required value="{{ old('description') }}">
                @error('description')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>
            <div class="form-group">
                <label for="description_arr">Description (Arabic)</label>
                <input type="text" name="description_arr" class="form-control @error('description_arr') is-invalid @enderror" required value="{{ old('description_arr') }}">
                @error('description_arr')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>
            <div class="form-group">
                <label for="code">Code Province</label>
                <input type="text" name="code" class="form-control @error('code') is-invalid @enderror" required value="{{ old('code') }}">
                @error('code')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>

            <button type="submit" class="btn btn-primary">Create</button>
        </form>
    </div>
</body>
</html>
