<!DOCTYPE html>
<html>
<head>
    <title>Edit Chantier</title>

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
        <h1>Modification du Chantier</h1>
        <form action="{{ route('chantiers.update', $chantier->Id) }}" method="POST">
            @csrf
            @method('PUT')
            
            <div class="form-group" id="description">
                <label for="description">Description</label>
                <input type="text" name="description" class="form-control @error('description') is-invalid @enderror" required value="{{ $chantier->Description }}">
                @error('description')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>
            
            <div class="form-group">
                <label for="code_chantier">Code</label>
                <input type="text" name="code_chantier" class="form-control @error('code_chantier') is-invalid @enderror" required value="{{ $chantier->Code_Chantier }}">
                @error('code_chantier')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>
            <div class="form-group">
                <label for="id_domaine">Domaine id</label>
                <input type="text" name="id_domaine" class="form-control @error('id_domaine') is-invalid @enderror" required value="{{ $chantier->Id_Domaine }}">
                @error('id_domaine')
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
