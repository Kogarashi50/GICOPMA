<!DOCTYPE html>
<html>
<head>
    <title>Create Convention</title>

    <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
    <link rel="stylesheet" href="{{ asset('css/index.css') }}">
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="{{ asset('css/create.css') }}">
    {{-- <script src="https://code.jquery.com/jquery-3.5.1.min.js"></script>
    <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.bundle.min.js"></script> --}}
 
    <style>
        .error-message {
            color: red;
        }
        .has-error input, .has-error textarea {
            border-color: red;
        }
    </style>
</head>
<body>
    @include('sidebar')
    <div class="container">
        <h1>Create New Convention</h1>
        <form action="{{ route('conventions.store') }}" method="POST">
            @csrf
            <div class="form-group">
                <label for="code">Code</label>
                <input type="text" name="code" class="form-control @error('code') is-invalid @enderror" required value="{{ old('code') }}">
                @error('code')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>
            <div class="form-group">
                <label for="fichier">Fichier</label>
                <input type="file" name="fichier" class="form-control @error('fichier') is-invalid @enderror" required>
                @error('fichier')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>
            <div class="form-group">
                <label for="classification_prov">Classification Prov</label>
                <input type="text" name="classification_prov" class="form-control @error('classification_prov') is-invalid @enderror" required value="{{ old('classification_prov') }}">
                @error('classification_prov')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>
            <div class="form-group">
                <label for="categorie">Categorie</label>
                <input type="text" name="categorie" class="form-control @error('categorie') is-invalid @enderror" required value="{{ old('categorie') }}">
                @error('categorie')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>
            <div class="form-group">
                <label for="intitule">Intitule</label>
                <input type="text" name="intitule" class="form-control @error('intitule') is-invalid @enderror" required value="{{ old('intitule') }}">
                @error('intitule')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>
            <div class="form-group">
                <label for="reference">Reference</label>
                <input type="text" name="reference" class="form-control @error('reference') is-invalid @enderror" required value="{{ old('reference') }}">
                @error('reference')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>
            <div class="form-group">
                <label for="convention_signee_par">Convention Signee Par</label>
                <input type="text" name="convention_signee_par" class="form-control @error('convention_signee_par') is-invalid @enderror" required value="{{ old('convention_signee_par') }}">
                @error('convention_signee_par')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>
            <div class="form-group">
                <label for="annee_convention">Annee Convention</label>
                <input type="number" name="annee_convention" class="form-control @error('annee_convention') is-invalid @enderror" required value="{{ old('annee_convention') }}">
                @error('annee_convention')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>
            <div class="form-group">
                <label for="objet">Objet</label>
                <input name="objet" class="form-control @error('objet') is-invalid @enderror" required value="{{ old('objet') }}" />
                @error('objet')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>
            <div class="form-group">
                <label for="objectifs">Objectifs</label>
                <input name="objectifs" class="form-control @error('objectifs') is-invalid @enderror" required value="{{ old('objectifs') }}" />
                @error('objectifs')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>
            <div class="form-group">
                <label for="localisation">Localisation</label>
                <input type="text" name="localisation" class="form-control @error('localisation') is-invalid @enderror" required value="{{ old('localisation') }}">
                @error('localisation')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>
            <div class="form-group">
                <label for="maitre_ouvrage">Maitre Ouvrage</label>
                <input type="text" name="maitre_ouvrage" class="form-control @error('maitre_ouvrage') is-invalid @enderror" required value="{{ old('maitre_ouvrage') }}">
                @error('maitre_ouvrage')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>
            <div class="form-group">
                <label for="partenaire">Partenaire</label>
                <input type="text" name="partenaire" class="form-control @error('partenaire') is-invalid @enderror" required value="{{ old('partenaire') }}">
                @error('partenaire')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>
            <div class="form-group">
                <label for="cout_global">Cout Global</label>
                <input type="number" step="0.01" name="cout_global" class="form-control @error('cout_global') is-invalid @enderror" required value="{{ old('cout_global') }}">
                @error('cout_global')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>
            <div class="form-group">
                <label for="cout_cr">Cout CR</label>
                <input type="number" step="0.01" name="cout_cr" class="form-control @error('cout_cr') is-invalid @enderror" required value="{{ old('cout_cr') }}">
                @error('cout_cr')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>
            <div class="form-group">
                <label for="statut">Statut</label>
                <input type="text" name="statut" class="form-control @error('statut') is-invalid @enderror" required value="{{ old('statut') }}">
                @error('statut')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>
            <div class="form-group">
                <label for="operationalisation">Operationalisation</label>
                <input type="text" name="operationalisation" class="form-control @error('operationalisation') is-invalid @enderror" required value="{{ old('operationalisation') }}">
                @error('operationalisation')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>
            <div class="form-group">
                <label for="id_programme">Programme</label>
                <select name="id_programme" class="form-control @error('id_programme') is-invalid @enderror" required>
                    <option value="">Select Programme</option>
                    @foreach($programmes as $programme)
                        <option value="{{ $programme->Code_Programme }}" {{ old('id_programme') == $programme->Code_Programme ? 'selected' : '' }}>
                            {{ $programme->Description }}
                        </option>
                    @endforeach
                </select>
                @error('programme')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>
            <div class="form-group">
                <label for="groupe">Groupe</label>
                <input type="text" name="groupe" class="form-control @error('groupe') is-invalid @enderror" required value="{{ old('groupe') }}">
                @error('groupe')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>
            <div class="form-group">
                <label for="rang">Rang</label>
                <input type="number" name="rang" class="form-control @error('rang') is-invalid @enderror" required value="{{ old('rang') }}">
                @error('rang')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>
            <button type="submit" class="btn btn-primary">Create</button>
        </form>
    </div>
</div>
</div>
</body>
</html>
