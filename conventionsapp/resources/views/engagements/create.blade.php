<!DOCTYPE html>
<html>
<head>
    <title>Create Engagement</title>
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
        <h1>Create New Engagement</h1>
        <form action="{{ route('engagements.store') }}" method="POST">
            @csrf
            <div class="form-group">
                <label for="description">Description</label>
                <input type="text" name="description" class="form-control @error('description') is-invalid @enderror" required value="{{ old('description') }}">
                @error('description')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>

            <div class="form-group">
                <label for="code_engag">Code Engagement</label>
                <input type="text" name="code_engag" class="form-control @error('code_engag') is-invalid @enderror" required value="{{ old('code_engag') }}">
                @error('code_engag')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>
            <div class="form-group">
                <label for="cout">Cout</label>
                <input type="text" name="cout" class="form-control @error('cout') is-invalid @enderror" required value="{{ old('cout') }}">
                @error('cout')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>
            <div class="form-group">
                <label for="montant_cro">Montant CRO</label>
                <input type="text" name="montant_cro" class="form-control @error('montant_cro') is-invalid @enderror" required value="{{ old('montant_cro') }}">
                @error('montant_cro')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>
            <div class="form-group">
                <label for="montant_hors_cro">Montant hors CRO</label>
                <input type="text" name="montant_hors_cro" class="form-control @error('montant_hors_cro') is-invalid @enderror" required value="{{ old('montant_hors_cro') }}">
                @error('montant_hors_cro')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>
            <div class="form-group">
                <label for="rang">Rang</label>
                <input type="text" name="rang" class="form-control @error('rang') is-invalid @enderror" required value="{{ old('rang') }}">
                @error('rang')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>
            <div class="form-group">
                <label for="programme">Programme</label>
                <select name="programme" class="form-control @error('programme') is-invalid @enderror" required>
                    <option value="">Select Programme</option>
                    @foreach($programmes as $programme)
                        <option value="{{ $programme->Code_Programme }}" {{ old('programme') == $programme->Code_Programme ? 'selected' : '' }}>
                            {{ $programme->Description }}
                        </option>
                    @endforeach
                </select>
                @error('programme')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>
            <button type="submit" class="btn btn-primary">Create</button>
        </form>
    </div>
</body>
</html>
