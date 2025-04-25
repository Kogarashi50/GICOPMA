<!DOCTYPE html>
<html>
<head>
    <title>Edit Partenaire</title>

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
        <h1>Modification du Partenaire</h1>
        <form action="{{ route('partenaires.update', $partenaire->Id) }}" method="POST">
            @csrf
            @method('PUT')
            
            <div class="form-group" id="description">
                <label for="description">Description</label>
                <input type="text" name="description" class="form-control @error('description') is-invalid @enderror" required value="{{ $partenaire->Description }}">
                @error('description')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>
            
            <div class="form-group">
                <label for="code">Code</label>
                <input type="text" name="code" class="form-control @error('code') is-invalid @enderror" required value="{{ $partenaire->Code }}">
                @error('code')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>
            
            <button type="submit" class="btn btn-primary">Modifier</button>
        </form>
    </div>
</div>
</div>
</body>
</html>
