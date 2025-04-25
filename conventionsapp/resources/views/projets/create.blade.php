<!DOCTYPE html>
<html>
<head>
    <title>Create Projet</title>
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
        <h1>Create New Projet</h1>
        <form action="{{ route('projets.store') }}" method="POST">
            @csrf
            <div class="form-group">
                <label for="nom_projet">Nom Projet</label>
                <input type="text" name="nom_projet" class="form-control @error('nom_projet') is-invalid @enderror" required value="{{ old('nom_projet') }}">
                @error('nom_projet')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>

            <div class="form-group">
                <label for="id_domaine">Domaine</label>
                <select name="id_domaine" class="form-control @error('id_domaine') is-invalid @enderror" required>
                    <option value="">Select Domaine</option>
                    @foreach($domaines as $domaine)
                        <option value="{{ $domaine->Code_Domaine }}" {{ old('id_domaine') == $domaine->Code_Domaine ? 'selected' : '' }}>
                            {{ $domaine->Description }}
                        </option>
                    @endforeach
                </select>
                @error('domaine')
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
            <div class="form-group">
                <label for="convention_code">Convention</label>
                <select name="convention_code" class="form-control @error('convention_code') is-invalid @enderror" required>
                    <option value="">Select Convention</option>
                    @foreach($conventions as $convention)
                        <option value="{{ $convention->Code }}" {{ old('convention_code') == $convention->Code ? 'selected' : '' }}>
                            {{ $convention->Intitule }}
                        </option>
                    @endforeach
                </select>
                @error('convention')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>
            <div class="form-group">
                <label for="cout_cro">Cout CRO</label>
                <input type="text" name="cout_cro" class="form-control @error('cout_cro') is-invalid @enderror" required value="{{ old('cout_cro') }}">
                @error('cout_cro')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>
            <div class="form-group">
                <label for="date_debut">Date Debut</label>
                <input type="date" name="date_debut" class="form-control @error('date_debut') is-invalid @enderror" required value="{{ old('date_debut') }}">
                @error('date_debut')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>
            <div class="form-group">
                <label for="date_fin">Date Fin</label>
                <input type="date" name="date_fin" class="form-control @error('date_fin') is-invalid @enderror" required value="{{ old('date_fin') }}">
                @error('date_fin')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>
            <div class="form-group">
                <label for="etat_avan_physi">Etat Avancement physique</label>
                <input type="text" name="etat_avan_physi" class="form-control @error('etat_avan_physi') is-invalid @enderror" required value="{{ old('etat_avan_physi') }}">
                @error('etat_avan_physi')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>
            <div class="form-group">
                <label for="etat_avan_finan">Etat Avancement Financier</label>
                <input type="text" name="etat_avan_finan" class="form-control @error('etat_avan_finan') is-invalid @enderror" required value="{{ old('etat_avan_finan') }}">
                @error('etat_avan_finan')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>
            <div class="form-group">
                <label for="code_projet">Code Projet</label>
                <input type="text" name="code_projet" class="form-control @error('code_projet') is-invalid @enderror" required value="{{ old('code_projet') }}">
                @error('code_projet')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>
            <div class="form-group">
                <label for="cout_projet">Cout Projet</label>
                <input type="text" name="cout_projet" class="form-control @error('cout_projet') is-invalid @enderror" required value="{{ old('cout_projet') }}">
                @error('cout_projet')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>
            <div class="form-group">
                <label for="observations">Observations</label>
                <input type="text" name="observations" class="form-control @error('observations') is-invalid @enderror" required value="{{ old('observations') }}">
                @error('observations')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>
            <button type="submit" class="btn btn-primary">Create</button>
        </form>
    </div>
</body>
</html>
