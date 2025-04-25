<!DOCTYPE html>
<html>
<head>
    <title>Create Programme</title>
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
        <h1>Create New Programme</h1>
        <form action="{{ route('programmes.store') }}" method="POST">
            @csrf
            <div class="form-group">
                <label for="description">Description</label>
                <input type="text" name="description" class="form-control @error('description') is-invalid @enderror" required value="{{ old('description') }}">
                @error('description')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>
            <div class="form-group">
                <label for="code_programme">Code Programme</label>
                <input type="text" name="code_programme" class="form-control @error('code_programme') is-invalid @enderror" required value="{{ old('code_programme') }}">
                @error('code_programme')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>
            <div class="form-group">
                <label for="id_chantier">Chantier</label>
                <select name="id_chantier" class="form-control @error('id_chantier') is-invalid @enderror" required>
                    <option value="">Select Chantier</option>
                    @foreach($chantiers as $chantier)
                        <option value="{{ $chantier->Code_Chantier }}" {{ old('id_chantier') == $chantier->Code_Chantier ? 'selected' : '' }}>
                            {{ $chantier->Description }}
                        </option>
                    @endforeach
                </select>
                @error('chantier')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>
            <button type="submit" class="btn btn-primary">Create</button>
        </form>
    </div>
</body>
</html>
