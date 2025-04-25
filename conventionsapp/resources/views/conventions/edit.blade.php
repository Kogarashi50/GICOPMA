<!DOCTYPE html>
<html>
<head>
    <title>Edit Convention</title>

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
    </style>
</head>
<body>
    @include('sidebar')
    <div class="container">
        <h1>Edit Convention</h1>
        <form action="{{ route('conventions.update', $convention->id) }}" method="POST">
            @csrf
            @method('PUT')
            
            <div class="form-group">
                <label for="code">Code</label>
                <input type="text" name="code" class="form-control @error('code') is-invalid @enderror" required value="{{ $convention->Code }}">
                @error('code')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>
            
            <div class="form-group">
                <label for="fichier">Fichier</label>
                <input type="text" name="fichier" class="form-control @error('fichier') is-invalid @enderror" required value="{{ $convention->Fichier }}">
                @error('fichier')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>
            
            <div class="form-group">
                <label for="classification_prov">Classification Prov</label>
                <input type="text" name="classification_prov" class="form-control @error('classification_prov') is-invalid @enderror" required value="{{ $convention->Classification_prov }}">
                @error('classification_prov')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>
            
            <div class="form-group">
                <label for="categorie">Categorie</label>
                <input type="text" name="categorie" class="form-control @error('categorie') is-invalid @enderror" required value="{{ $convention->Categorie }}">
                @error('categorie')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>
            
            <div class="form-group">
                <label for="intitule">Intitule</label>
                <input type="text" name="intitule" class="form-control @error('intitule') is-invalid @enderror" required value="{{ $convention->Intitule }}">
                @error('intitule')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>
            
            <div class="form-group">
                <label for="reference">Reference</label>
                <input type="text" name="reference" class="form-control @error('reference') is-invalid @enderror" required value="{{ $convention->Reference }}">
                @error('reference')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>
            
            <div class="form-group">
                <label for="convention_signee_par">Convention Signee Par</label>
                <input type="text" name="convention_signee_par" class="form-control @error('convention_signee_par') is-invalid @enderror" required value="{{ $convention->Convention_Signee_par }}">
                @error('convention_signee_par')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>
            
            <div class="form-group">
                <label for="annee_convention">Annee Convention</label>
                <input type="number" name="annee_convention" class="form-control @error('annee_convention') is-invalid @enderror" required value="{{ $convention->Annee_Convention }}">
                @error('annee_convention')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>
            
            <div class="form-group">
                <label for="objet">Objet</label>
                <input name="objet" class="form-control @error('objet') is-invalid @enderror" required value="{{ $convention->Objet }}" />
                @error('objet')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>
            
            <div class="form-group">
                <label for="objectifs">Objectifs</label>
                <input name="objectifs" class="form-control @error('objectifs') is-invalid @enderror" required value="{{ $convention->Objectifs }}" />
                @error('objectifs')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>
            
            <div class="form-group">
                <label for="localisation">Localisation</label>
                <input type="text" name="localisation" class="form-control @error('localisation') is-invalid @enderror" required value="{{ $convention->Localisation }}">
                @error('localisation')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>
            
            <div class="form-group">
                <label for="maitre_ouvrage">Maitre Ouvrage</label>
                <input type="text" name="maitre_ouvrage" class="form-control @error('maitre_ouvrage') is-invalid @enderror" required value="{{ $convention->Maitre_Ouvrage }}">
                @error('maitre_ouvrage')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>
            
            <div class="form-group">
                <label for="partenaire">Partenaire</label>
                <input type="text" name="partenaire" class="form-control @error('partenaire') is-invalid @enderror" required value="{{ $convention->Partenaire }}">
                @error('partenaire')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>
            
            <div class="form-group">
                <label for="cout_global">Cout Global</label>
                <input type="number" step="0.01" name="cout_global" class="form-control @error('cout_global') is-invalid @enderror" required value="{{ $convention->Cout_Global }}">
                @error('cout_global')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>
            
            <div class="form-group">
                <label for="cout_cr">Cout CR</label>
                <input type="number" step="0.01" name="cout_cr" class="form-control @error('cout_cr') is-invalid @enderror" required  value="{{ $convention->Cout_CR }}">
                @error('cout_cr')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>
            
            <div class="form-group">
                <label for="statut">Statut</label>
                <input type="text" name="statut" class="form-control @error('statut') is-invalid @enderror" required value="{{ $convention->Statut }}">
                @error('statut')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>
            
            <div class="form-group">
                <label for="operationalisation">Operationalisation</label>
                <input type="text" name="operationalisation" class="form-control @error('operationalisation') is-invalid @enderror" required value="{{ $convention->Operationalisation }}">
                @error('operationalisation')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>
            
            <div class="form-group">
                <label for="id_programme">Id Programme</label>
                <input type="number" name="id_programme" class="form-control @error('id_programme') is-invalid @enderror" required value="{{ $convention->Id_Programme }}">
                @error('id_programme')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>
            
            <div class="form-group">
                <label for="groupe">Groupe</label>
                <input type="text" name="groupe" class="form-control @error('groupe') is-invalid @enderror" required value="{{ $convention->Groupe }}">
                @error('groupe')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>
            
            <div class="form-group">
                <label for="rang">Rang</label>
                <input type="number" name="rang" class="form-control @error('rang') is-invalid @enderror" required value="{{ $convention->Rang }}">
                @error('rang')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>
            
            <button type="submit" class="btn btn-primary">Update</button>
        </form>
    </div>
</div>
</div>
</body>
</html>
