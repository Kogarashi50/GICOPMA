<!DOCTYPE html>
<html>
<head>
    <title>Create Sous Projet</title>
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
        <h1>Create New Sous Projet</h1>
        <form action="{{ route('sousprojets.store') }}" method="POST">
            @csrf
            <div class="form-group">
                <label for="nom_projet">Nom Sous Projet</label>
                <input type="text" name="nom_projet" class="form-control @error('nom_projet') is-invalid @enderror" required value="{{ old('nom_projet') }}">
                @error('nom_projet')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>

            <div class="form-group">
                <label for="id_province">Province</label>
                <select name="id_province" class="form-control @error('id_province') is-invalid @enderror" required>
                    <option value="">Select Province</option>
                    @foreach($provinces as $province)
                        <option value="{{ $province->Id }}" {{ old('id_province') == $province->Id ? 'selected' : '' }}>
                            {{ $province->Description }} - {{ $province->Description_Arr }}
                        </option>
                    @endforeach
                </select>
                @error('id_province')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>
            <div class="form-group">Commune
                <label for="id_commune">Programme</label>
                <select name="id_commune" class="form-control @error('id_commune') is-invalid @enderror" required>
                    <option value="">Select Commune</option>
                    @foreach($communes as $commune)
                        <option value="{{ $commune->Id }}" {{ old('id_commune') == $commune->Id ? 'selected' : '' }}>
                            {{ $commune->Description }} - {{ $commune->Description_Arr }}
                        </option>
                    @endforeach
                </select>
                @error('id_commune')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>
            <div class="form-group">
                <label for="estim_initi">Estimation initial</label>
                <input type="number" name="estim_initi" class="form-control @error('estim_initi') is-invalid @enderror" required value="{{ old('estim_initi') }}">
                @error('estim_initi')
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
            <div class="form-group">
                <label for="secteur">Secteur</label>
                <input type="text" name="secteur" class="form-control @error('secteur') is-invalid @enderror" required value="{{ old('secteur') }}">
                @error('secteur')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>
            
            <div class="form-group">
                <label for="localite">Localite</label>
                <input type="text" name="localite" class="form-control @error('localite') is-invalid @enderror" required value="{{ old('localite') }}">
                @error('localite')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>
            <div class="form-group">
                <label for="centre">Centre</label>
                <input type="text" name="centre" class="form-control @error('centre') is-invalid @enderror" required value="{{ old('centre') }}">
                @error('centre')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>
            <div class="form-group">
                <label for="site">Site</label>
                <input type="text" name="site" class="form-control @error('site') is-invalid @enderror" required value="{{ old('site') }}">
                @error('site')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>
            <div class="form-group">
                <label for="surface">Surface</label>
                <input type="text" name="surface" class="form-control @error('surface') is-invalid @enderror" required value="{{ old('surface') }}">
                @error('surface')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>
            <div class="form-group">
                <label for="lineaire">Lineaire</label>
                <input type="text" name="lineaire" class="form-control @error('lineaire') is-invalid @enderror" required value="{{ old('lineaire') }}">
                @error('lineaire')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>
            <div class="form-group">
                <label for="status">Status</label>
                <input type="text" name="status" class="form-control @error('status') is-invalid @enderror" required value="{{ old('status') }}">
                @error('status')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>
            <div class="form-group">
                <label for="douars_desservis">Douars Desservis</label>
                <input type="text" name="douars_desservis" class="form-control @error('douars_desservis') is-invalid @enderror" required value="{{ old('douars_desservis') }}">
                @error('douars_desservis')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>
            <div class="form-group">
                <label for="financement">Financement</label>
                <input type="text" name="financement" class="form-control @error('financement') is-invalid @enderror" required value="{{ old('financement') }}">
                @error('financement')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>
            <div class="form-group">
                <label for="nature_intervention">Nature Intervention</label>
                <input type="text" name="nature_intervention" class="form-control @error('nature_intervention') is-invalid @enderror" required value="{{ old('nature_intervention') }}">
                @error('nature_intervention')
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
                <label for="code_sous_projet">Code Sous Projet</label>
                <input type="number" name="code_sous_projet" class="form-control @error('code_sous_projet') is-invalid @enderror" required value="{{ old('code_sous_projet') }}">
                @error('code_sous_projet')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>
            <div class="form-group">
                <label for="benificiaire">Benificiaire
                </label>
                <input type="text" name="benificiaire" class="form-control @error('benificiaire') is-invalid @enderror" required value="{{ old('benificiaire') }}">
                @error('benificiaire')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>

            <button type="submit" class="btn btn-primary">Create</button>
        </form>
    </div>
</body>
</html>
