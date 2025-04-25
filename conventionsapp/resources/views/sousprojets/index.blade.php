<!DOCTYPE html>
<html>
<head>
    <title>CRO - Projets</title>
    <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
    <link rel="stylesheet" href="{{ asset('css/index.css') }}">
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
    <link rel="stylesheet" href="https://cdn.datatables.net/1.11.5/css/dataTables.bootstrap4.min.css">
    <link rel="stylesheet" href="font-awesome-4.6.3/css/font-awesome.min.css">
    <style>
        .card-container {
            display: none;
            width: 100%;
        }
        .success-icon {
            color: #28a745;
            font-size: 48px;
            margin-bottom: 20px;
            display:none;
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
            color: #17a2b8;
        }
    </style>
</head>
<body>
@include('sidebar')

    <div class="container mt-5" id='container'>
        <h1 id='titre' class="mb-4">Gérer les Projets</h1>

        <!-- MODALS POUR NOTIICATIONS CAS SUCCESS / ERREUR -->

        <!-- Modal Success -->
        <div class="modal fade" id="successModal" tabindex="-1" role="dialog" aria-labelledby="successModalLabel" aria-hidden="true">
            <div class="modal-dialog" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="successModalLabel">Success!</h5>
                        <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                            <span aria-hidden="true">&times;</span>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="success-icon">
                            <i class="bi bi-building-fill-check "></i>
                        </div>
                        @if (session('success'))
                        {{ session('success') }}
                        @endif
                    </div>
                </div>
            </div>
        </div>
        <!-- -->

        <!-- Modal Fail -->
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
        <!-- -->

        <div class="d-flex justify-content-between mb-3">
            <a href="{{ route('sousprojets.create') }}" class="btn btn-primary">Ajouter un Projet</a>
            <div>
                <label for="viewSelector" class="mr-2"></label>
                <select id="viewSelector" class="form-control d-inline-block w-auto" style='background-color:#ffffff98;'>
                    <option value="table" selected>Tableau</option>
                    <option value="cards">Cartes</option>
                </select>
            </div>
        </div>

        <div id="tableView" class="table-responsive custom-table">
            <table class="table table-bordered table-striped " id="sousprojetsTable">
                <thead class="thead-dark">
                    <tr>
                        <th class="column-width" style='display:none;'>Id</th>
                        <th class="column-width">Code Sous Projet</th>
                        <th class="column-width">Nom Projet</th>
                        <th class="column-width">Province</th>
                        <th class="column-width">Commune</th>
                        <th class="column-width">Observations</th>
                        <th class="column-width">Etat Avancement Physique</th>
                        <th class="column-width">Etat Avancement Financier</th>
                        <th class="column-width">Estimations Initial</th>
                        <th class="column-width">Secteur</th>
                        <th class="column-width">Localite</th>
                        <th class="column-width">Centre</th>
                        <th class="column-width">Site</th>
                        <th class="column-width">Surface</th>
                        <th class="column-width">Lineaire</th>
                        <th class="column-width">Status</th>
                        <th class="column-width">Douars Desservis</th>
                        <th class="column-width">Financement</th>
                        <th class="column-width">Nature Intervention</th>
                        <th class="column-width">Benificiaire</th>
                        <th class="column-width">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach ($sousprojets as $sousprojet)
                    <tr>
                        <td class="column-width" style='display:none;'>{{ $sousprojet->ID_Projet_Maitre }}</td>
                        <td class="column-width">{{ $sousprojet->Code_Sous_Projet }}</td>
                        <td class="column-width">{{ $sousprojet->Nom_Projet }}</td>
                        <td class="column-width">
                            @php
                                $province = $provinces->firstWhere('Id', $sousprojet->Id_Province);
                            @endphp
                            @if($province)
                            {{$province->Description}} - {{$province->Description_Arr}}
                            @else
                            {{'Pas de Province' }}
                            @endif
                            {{-- {{ $province ? $province->Description : 'Pas de Province' }} --}}
                        </td>
                        <td class="column-width">
                            @php
                                $commune = $communes->firstWhere('Id', $sousprojet->Id_Commune);
                            @endphp
                            @if($commune)
                            {{$commune->Description}} - {{$commune->Description_Arr}}
                            @else
                            {{'Pas de Commune' }}
                            @endif
                            {{-- {{ $commune ? $commune->Description : 'Pas de Commune' }} --}}
                        </td>
                        <td class="column-width">{{ $sousprojet->Observations }}</td>
                        <td class="column-width">{{ $sousprojet->Etat_Avan_Physi }}</td>
                        <td class="column-width">{{ $sousprojet->Etat_Avan_Finan }}</td>
                        <td class="column-width">{{ $sousprojet->Estim_Initi }}</td>
                        <td class="column-width">{{ $sousprojet->Secteur }}</td>
                        <td class="column-width">{{ $sousprojet->Localite }}</td>
                        <td class="column-width">{{ $sousprojet->Centre }}</td>
                        <td class="column-width">{{ $sousprojet->Site }}</td>
                        <td class="column-width">{{ $sousprojet->Surface }}</td>
                        <td class="column-width">{{ $sousprojet->Lineaire }}</td>
                        <td class="column-width">{{ $sousprojet->Status }}</td>
                        <td class="column-width">{{ $sousprojet->Douars_Desservis }}</td>
                        <td class="column-width">{{ $sousprojet->Financement }}</td>
                        <td class="column-width">{{ $sousprojet->Nature_Intervention }}</td>
                        <td class="column-width">{{ $sousprojet->Benificiaire }}</td>

                        {{-- <td class="column-width">{{ $sousprojet->Cout_Projet }}</td> --}}
                        <td style='display:flex;gap:10px;'>
                            <a href='{{ route('sousprojets.edit', $sousprojet->Code_Sous_Projet) }}' class='btn btn-warning'>Edit</a>
                            <form method='post' action='{{ route('sousprojets.destroy', $sousprojet->Code_Sous_Projet) }}'>
                                @csrf
                                @method('delete')
                                <input type='submit' name='submit' class='btn btn-danger' value='Supprimer'>
                            </form>
                        </td>
                    </tr>
                    @endforeach
                </tbody>
            </table>
        </div>

        <!-- Card View -->
        <div id="cardView" class="card-container">
            @foreach ($sousprojets as $sousprojet)
                <div class="mb-4">
                    <div class="card">
                        <div class="card-body">
                            <h5 class="card-title text-primary">{{ $sousprojet->Nom_Projet }}</h5>
                            @php
                                $province = $provinces->firstWhere('Id', $sousprojet->Id_Province);
                                $commune = $communes->firstWhere('Id', $sousprojet->Id_Commune);
                                
                            @endphp
                            <p class="card-text"><strong>Code:</strong> {{ $sousprojet->Code_Sous_Projet }}</p>
                            <p class="card-text"><strong>Commune:</strong> {{ $commune ? $commune->Description : 'Pas de Commune' }}</p>
                            <p class="card-text"><strong>Province:</strong> {{ $province ? $province->Description : 'Pas de Province' }}</p>
                            <p class="card-text"><strong>Observations:</strong> {{ $sousprojet->Observations }}</p>
                            <p class="card-text"><strong>Etat Avancement Physique:</strong> {{ $sousprojet->Etat_Avan_Physi }}</p>
                            <p class="card-text"><strong>Etat Avancement Financier:</strong> {{ $sousprojet->Etat_Avan_Finan }}</p>
                            <p class="card-text"><strong>Estimation Initial:</strong> {{ $sousprojet->Estim_Initi }}</p>
                            <p class="card-text"><strong>Secteur:</strong> {{ $sousprojet->Secteur }}</p>
                            <p class="card-text"><strong>Localite:</strong> {{ $sousprojet->Localite }}</p>
                            <p class="card-text"><strong>Centre:</strong> {{ $sousprojet->Centre }}</p>
                            <p class="card-text"><strong>Site:</strong> {{ $sousprojet->Site }}</p>
                            <p class="card-text"><strong>Surface:</strong> {{ $sousprojet->Surface }}</p>
                            <p class="card-text"><strong>Lineaire:</strong> {{ $sousprojet->Lineaire }}</p>
                            <p class="card-text"><strong>Status:</strong> {{ $sousprojet->Status }}</p>
                            <p class="card-text"><strong>Douars Desservis:</strong> {{ $sousprojet->Douars_Desservis }}</p>
                            <p class="card-text"><strong>Financement:</strong> {{ $sousprojet->Financement }}</p>
                            <p class="card-text"><strong>Nature Intervention:</strong> {{ $sousprojet->Nature_Intervention }}</p>
                            <p class="card-text"><strong>Benificiaire:</strong> {{ $sousprojet->Benificiare }}</p>
                            <p style='display:flex;justify-content:center;text-align:center;gap:10px;'>
                                <form method='post' action='{{ route('sousprojets.destroy', $sousprojet->Code_Sous_Projet) }}'>
                                    @csrf
                                    @method('delete')
                                    <a href='{{ route('sousprojets.edit', $sousprojet->ID_Projet_Maitre) }}' class='btn btn-warning'>Edit</a>
                                    <input type='submit' name='submit' class='btn btn-danger' value='Supprimer'>
                                </form>
                            </p>
                        </div>
                    </div>
                </div>
            @endforeach
        </div>
    </div>
</div>
</div>
    <script src="https://cdn.datatables.net/1.11.5/js/jquery.dataTables.min.js"></script>
    <script src="https://cdn.datatables.net/1.11.5/js/dataTables.bootstrap4.min.js"></script>
    <script>
        $(document).ready(function () {
            $('#menu-toggle').click(function (e) {
                e.preventDefault();
                $('#sidebar').toggle(1000);
            });
            $('.close').click(function (e) {
                $('#successModal').modal('hide');
                $('.success-icon').fadeOut(1000);
                $('#failModal').modal('hide');
                $('.fail-icon').fadeOut(1000);
            });
            @if(session('success'))
                $('#successModal').modal('show');
                $('.success-icon').fadeIn(1000);
            @elseif(session('failed') || session('error'))
                $('#failModal').modal('show');
                $('.fail-icon').fadeIn(1000);
            @endif

            $('#sousprojetsTable').DataTable({
                "pageLength": 10,
                "lengthChange": false,
                "searching": true,
                "paging": true,
                "info": true,
                "language": {
                    "lengthMenu": "Afficher _MENU_ enregistrements par page",
                    "zeroRecords": "Aucun sousprojet trouvé",
                    "info": "Affichage de _PAGE_ sur _PAGES_",
                    "infoEmpty": "Aucun enregistrement disponible",
                    "search": "Recherche:",
                    "paginate": {
                        "first": "Premier",
                        "last": "Dernier",
                        "next": "Suivant",
                        "previous": "Précédent"
                    }
                },
                "autoWidth": true,
                "responsive": true
            });
        });

        document.getElementById('viewSelector').addEventListener('change', function () {
            var tableView = document.getElementById('tableView');
            var cardView = document.getElementById('cardView');
            var container = document.getElementById('container');
            var titre = document.getElementById('titre');
            if (this.value === 'table') {
                tableView.style.display = 'block';
                cardView.style.display = 'none';
                container.style.backgroundColor = '#ffffffdd';
                titre.style.color = '#343a40';
                titre.style.textShadow = '';
                titre.style.transition = 'all 0.6s ease';
                container.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.1)';
                container.style.transition = 'background-color 0.5s ease, box-shadow 0.5s ease';
            } else {
                tableView.style.display = 'none';
                cardView.style.display = 'flex';
                container.style.backgroundColor = '#ffffff00';
                container.style.boxShadow = 'none';
                titre.style.color = '#ffffff';
                titre.style.textShadow = '3px 3px 3px rgb(0,0,0,0.3)';
                titre.style.transition = 'all 0.6s ease';
                container.style.transition = 'background-color 0.5s ease, box-shadow 0.5s ease';
            }
        });
    </script>
</body>
</html>
