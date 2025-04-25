<!DOCTYPE html>
<html>
<head>
    <title>Edit Projet</title>
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
        .card-container {
            display: none;
            width: 100%;
        }
      
        .fail-icon {
            color: #de0000;
            font-size: 48px;
            margin-bottom: 20px;
            display:none;
        }
        .modal-content{
            text-align:center;
        }
        .page-link {
    color: #17a2b8 ;
}
    </style>
</head>
<body>
    @include('sidebar')
    <div class="container">
    <div class="modal fade" id="failModal" tabindex="-1" role="dialog" aria-labelledby="failModalLabel" aria-hidden="true">
            <div class="modal-dialog" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="successModalLabel">Erreur!</h5>
                        <button type="button" class="close" data-dismiss="modal-f" aria-label="Close">
                            <span aria-hidden="true">&times;</span>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="fail-icon">
                            <i class="bi bi-x-circle"></i>
                        </div>
                        @if (session('failed'))
                        {{ session('failed') }}
                        @elseif(session('error'))
                        {{ session('error') }}
                        @endif
                    </div>
                </div>
            </div>
        </div>
        <h1>Edit Sous Projet</h1>
        <form action="/sousprojets/{{$sousprojet->Code_Sous_Projet}}" method="POST">
            @csrf
            @method('PUT')
            <div class="form-group">
                <label for="nom_projet">Nom Sous Projet</label>
                <input type="text" name="nom_projet" class="form-control @error('nom_projet') is-invalid @enderror" required value="{{ old('Nom_Projet')??$sousprojet->Nom_Projet }}">
                @error('nom_projet')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>

            <div class="form-group">
                <label for="id_province">Province</label>
                <select name="id_province" class="form-control @error('id_province') is-invalid @enderror" required>
                    <option value="">Select Province</option>
                    @foreach($provinces as $province)
                        <option value="{{ $province->Id }}" {{ $sousprojet->Id_Province == $province->Id ? 'selected' : '' }}>
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
                        <option value="{{ $commune->Id }}" {{$sousprojet->Id_Commune  == $commune->Id ? 'selected' : '' }}>
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
                <input type="number" name="estim_initi" class="form-control @error('estim_initi') is-invalid @enderror" required value="{{ old('estim_initi')??$sousprojet->Estim_Initi }}">
                @error('estim_initi')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>
            <div class="form-group">
                <label for="observations">Observations</label>
                <input type="text" name="observations" class="form-control @error('observations') is-invalid @enderror" required value="{{ old('observations')??$sousprojet->Observations  }}">
                @error('observations')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>
            <div class="form-group">
                <label for="secteur">Secteur</label>
                <input type="text" name="secteur" class="form-control @error('secteur') is-invalid @enderror" required value="{{ old('secteur')??$sousprojet->Secteur }}">
                @error('secteur')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>
            
            <div class="form-group">
                <label for="localite">Localite</label>
                <input type="text" name="localite" class="form-control @error('localite') is-invalid @enderror" required value="{{ old('localite')?? $sousprojet->Localite }}">
                @error('localite')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>
            <div class="form-group">
                <label for="centre">Centre</label>
                <input type="text" name="centre" class="form-control @error('centre') is-invalid @enderror" required value="{{ old('centre')??$sousprojet->Centre }}">
                @error('centre')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>
            <div class="form-group">
                <label for="site">Site</label>
                <input type="text" name="site" class="form-control @error('site') is-invalid @enderror" required value="{{ old('site')??$sousprojet->Site }}">
                @error('site')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>
            <div class="form-group">
                <label for="surface">Surface</label>
                <input type="text" name="surface" class="form-control @error('surface') is-invalid @enderror" required value="{{ old('surface')??$sousprojet->Surface  }}">
                @error('surface')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>
            <div class="form-group">
                <label for="lineaire">Lineaire</label>
                <input type="text" name="lineaire" class="form-control @error('lineaire') is-invalid @enderror" required value="{{ old('lineaire')??$sousprojet->Lineaire  }}">
                @error('lineaire')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>
            <div class="form-group">
                <label for="status">Status</label>
                <input type="text" name="status" class="form-control @error('status') is-invalid @enderror" required value="{{ old('status')??$sousprojet->Status }}">
                @error('status')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>
            <div class="form-group">
                <label for="douars_desservis">Douars Desservis</label>
                <input type="text" name="douars_desservis" class="form-control @error('douars_desservis') is-invalid @enderror" required value="{{ old('douars_desservis')??$sousprojet->Douars_Desservis }}">
                @error('douars_desservis')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>
            <div class="form-group">
                <label for="financement">Financement</label>
                <input type="text" name="financement" class="form-control @error('financement') is-invalid @enderror" required value="{{ old('financement') ??$sousprojet->Financement }}">
                @error('financement')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>
            <div class="form-group">
                <label for="nature_intervention">Nature Intervention</label>
                <input type="text" name="nature_intervention" class="form-control @error('nature_intervention') is-invalid @enderror" required value="{{ old('nature_intervention') ??$sousprojet->Nature_Intervention }}">
                @error('nature_intervention')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>
            <div class="form-group">
                <label for="etat_avan_physi">Etat Avancement physique</label>
                <input type="text" name="etat_avan_physi" class="form-control @error('etat_avan_physi') is-invalid @enderror" required value="{{ old('etat_avan_physi')??$sousprojet->Etat_Avan_Physi  }}">
                @error('etat_avan_physi')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>
            <div class="form-group">
                <label for="etat_avan_finan">Etat Avancement Financier</label>
                <input type="text" name="etat_avan_finan" class="form-control @error('etat_avan_finan') is-invalid @enderror" required value="{{ old('etat_avan_finan')??$sousprojet->Etat_Avan_Finan }}">
                @error('etat_avan_finan')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>
            <div class="form-group">
                <label for="code_sous_projet">Code Sous Projet</label>
                <input type="text" name="code_sous_projet" class="form-control @error('code_sous_projet') is-invalid @enderror" required value="{{ old('code_sous_projet')??$sousprojet->Code_Sous_Projet  }}">
                @error('code_sous_projet')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>
            <div class="form-group">
                <label for="benificiaire">Benificiaire
                </label>
                <input type="text" name="benificiaire" class="form-control @error('benificiaire') is-invalid @enderror" required value="{{ old('benificiaire')??$sousprojet->Benificiaire }}">
                @error('benificiaire')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>
            <button type="submit" class="btn btn-primary">Update</button>
        </form>
    </div>
    <script>
  $(document).ready(function () {
            $('.close').click(function (e) {
                $('#failModal').modal('hide');
                $('.fail-icon').fadeOut(1000); 
        })
            $('#menu-toggle').click(function (e) {
                e.preventDefault();
                $('#sidebar').toggle(1000);
            });
            @if(session('failed') || session('error'))
                $('#failModal').modal('show');
                $('.fail-icon').fadeIn(1000); 
            @endif  })
      
  
    </script>
</body>
</html>
