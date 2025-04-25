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
            <a href="{{ route('projets.create') }}" class="btn btn-primary">Ajouter un Projet</a>
            <div>
                <label for="viewSelector" class="mr-2"></label>
                <select id="viewSelector" class="form-control d-inline-block w-auto" style='background-color:#ffffff98;'>
                    <option value="table" selected>Tableau</option>
                    <option value="cards">Cartes</option>
                </select>
            </div>
        </div>

        <div id="tableView" class="table-responsive custom-table">
            <table class="table table-bordered table-striped " id="projetsTable">
                <thead class="thead-dark">
                    <tr>
                        <th class="column-width" style='display:none;'>Id</th>
                        <th class="column-width">Nom Projet</th>
                        <th class="column-width">Domaine</th>
                        <th class="column-width">Programme</th>
                        <th class="column-width">Chantier</th>
                        <th class="column-width">Convention</th>
                        <th class="column-width">Cout CRO</th>
                        <th class="column-width">Date Debut</th>
                        <th class="column-width">Date Fin</th>
                        <th class="column-width">Etat Avancement Physique</th>
                        <th class="column-width">Etat Avancement Financier</th>
                        <th class="column-width">Code Projet</th>
                        <th class="column-width">Cout Projet</th>
                        <th class="column-width">Observations</th>
                        <th class="column-width">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach ($projets as $projet)
                    <tr>
                        <td class="column-width" style='display:none;'>{{ $projet->ID_Projet }}</td>
                        <td class="column-width">{{ $projet->Nom_Projet }}</td>
                        <td class="column-width">
                            @php
                                $domaine = $domaines->firstWhere('Code_Domaine', $projet->Id_Domaine);
                            @endphp
                            {{ $domaine ? $domaine->Description : 'Pas de domaine' }}
                        </td>
                        <td class="column-width">
                            @php
                                $programme = $programmes->firstWhere('Code_Programme', $projet->Id_Programme);
                            @endphp
                            {{ $programme ? $programme->Description : 'Pas de programme' }}
                        </td>
                        <td class="column-width">
                            @php
                                $chantier = $chantiers->firstWhere('Code_Chantier', $projet->Id_Chantier);
                            @endphp
                            {{ $chantier ? $chantier->Description : 'Pas de chantier' }}
                        </td>
                        <td class="column-width">
                            @php
                                $convention = $conventions->firstWhere('Code', $projet->Convention_Code);
                            @endphp
                            {{ $convention ? $convention->Intitule : 'Pas de convention' }}
                        </td>
                        <td class="column-width">{{ $projet->Cout_CRO }}</td>
                        <td class="column-width">{{ $projet->Date_Debut }}</td>
                        <td class="column-width">{{ $projet->Date_Fin }}</td>
                        <td class="column-width">{{ $projet->Etat_Avan_Physi }}</td>
                        <td class="column-width">{{ $projet->Etat_Avan_Finan }}</td>
                        <td class="column-width">{{ $projet->Code_Projet }}</td>
                        <td class="column-width">{{ $projet->Cout_Projet }}</td>
                        <td class="column-width">{{ $projet->Observations }}</td>
                        <td style='display:flex;gap:10px;'>
                            <a href='{{ route('projets.edit', $projet->ID_Projet) }}' class='btn btn-warning'>Edit</a>
                            <form method='post' action='{{ route('projets.destroy', $projet->Code_Projet) }}'>
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
            @foreach ($projets as $projet)
                <div class="mb-4">
                    <div class="card">
                        <div class="card-body">
                            <h5 class="card-title text-primary">{{ $projet->Nom_Projet }}</h5>
                            @php
                                $domaine = $domaines->firstWhere('Code_Domaine', $projet->Id_Domaine);
                                $programme = $programmes->firstWhere('Code_Programme', $projet->Id_Programme);
                                $chantier = $chantiers->firstWhere('Code_Chantier', $projet->Id_Chantier);
                                $convention = $conventions->firstWhere('Code', $projet->Convention_Code);
                            @endphp
                            <p class="card-text"><strong>Domaine:</strong> {{ $domaine ? $domaine->Description : 'Pas de domaine' }}</p>
                            <p class="card-text"><strong>Programme:</strong> {{ $programme ? $programme->Description : 'Pas de programme' }}</p>
                            <p class="card-text"><strong>Chantier:</strong> {{ $chantier ? $chantier->Description : 'Pas de chantier' }}</p>
                            <p class="card-text"><strong>Convention:</strong> {{ $convention ? $convention->Intitule : 'Pas de convention' }}</p>
                            <p class="card-text"><strong>Cout CRO:</strong> {{ $projet->Cout_CRO }}</p>
                            <p class="card-text"><strong>Date Debut:</strong> {{ $projet->Date_Debut }}</p>
                            <p class="card-text"><strong>Date Fin:</strong> {{ $projet->Date_Fin }}</p>
                            <p class="card-text"><strong>Etat Avancement Physique:</strong> {{ $projet->Etat_Avan_Physi }}</p>
                            <p class="card-text"><strong>Etat Avancement Financier:</strong> {{ $projet->Etat_Avan_Finan }}</p>
                            <p class="card-text"><strong>Code Projet:</strong> {{ $projet->Code_Projet }}</p>
                            <p class="card-text"><strong>Cout Projet:</strong> {{ $projet->Cout_Projet }}</p>
                            <p class="card-text"><strong>Observations:</strong> {{ $projet->Observations }}</p>
                            <p style='display:flex;justify-content:center;text-align:center;gap:10px;'>
                                <form method='post' action='{{ route('projets.destroy', $projet->Code_Projet) }}'>
                                    @csrf
                                    @method('delete')
                                    <a href='{{ route('projets.edit', $projet->ID_Projet) }}' class='btn btn-warning'>Edit</a>
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

            $('#projetsTable').DataTable({
                "pageLength": 10,
                "lengthChange": false,
                "searching": true,
                "paging": true,
                "info": true,
                "language": {
                    "lengthMenu": "Afficher _MENU_ enregistrements par page",
                    "zeroRecords": "Aucun projet trouvé",
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
