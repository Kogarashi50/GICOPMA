<!DOCTYPE html>
<html>
<head>
    <title>CRO - Engagements</title>
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
        <h1 id='titre' class="mb-4">Gérer les Engagements</h1>

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
            <a href="{{ route('engagements.create') }}" class="btn btn-primary">Ajouter un Engagement</a>
            <div>
                <label for="viewSelector" class="mr-2"></label>
                <select id="viewSelector" class="form-control d-inline-block w-auto" style='background-color:#ffffff98;'>
                    <option value="table" selected>Tableau</option>
                    <option value="cards">Cartes</option>
                </select>
            </div>
        </div>

        <div id="tableView" class="table-responsive custom-table">
            <table class="table table-bordered table-striped " id="chantiersTable">
                <thead class="thead-dark">
                    <tr>
                        <th class="column-width" style='display:none;'>Id</th>
                        <th class="column-width">Description</th>
                        <th class="column-width">Code Engagement</th>
                        <th class="column-width">Cout</th>
                        <th class="column-width">Montant CRO</th>
                        <th class="column-width">Montant Hors CRO</th>
                        <th class="column-width">Rang</th>
                        <th class="column-width">Programme</th>
                        <th class="column-width">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach ($engagements as $engagement)
                    <tr>
                        <td class="column-width" style='display:none;'>{{ $engagement->ID }}</td>
                        <td class="column-width">
                                {{ $engagement->Description }}
                        </td>
                        <td class="column-width">{{ $engagement->Code_Engag }}</td>
                        <td class="column-width">{{ $engagement->Cout }}</td>
                        <td class="column-width">{{ $engagement->Montant_CRO }}</td>
                        <td class="column-width">{{ $engagement->Montant_Hors_CRO }}</td>
                        <td class="column-width">{{ $engagement->Rang }}</td>
                        <td class="column-width">
                            @php
                                $programme = $programmes->firstWhere('Code_Programme', $engagement->Programme);
                            @endphp
                            {{ $programme ? $programme->Description : 'Pas de programme' }}
                        </td>
                        <td style='display:flex;gap:10px;'>
                            <a href='{{ route('engagements.edit', $engagement->ID) }}' class='btn btn-warning'>Edit</a>
                            <form method='post' action='{{ route('engagements.destroy', $engagement->Code_Engag) }}'>
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
            @foreach ($engagements as $engagement)
                <div class="mb-4">
                    <div class="card">
                        <div class="card-body">
                            <h5 class="card-title text-primary">
                                    {{ $engagement->Description }}
                            </h5>
                            <p class="card-text"><strong>Code:</strong> {{ $engagement->Code_Engag }}</p>
                            <p class="card-text"><strong>Cout:</strong> {{ $engagement->Cout }}</p>
                            <p class="card-text"><strong>Montant CRO:</strong> {{ $engagement->Montant_CRO }}</p>
                            <p class="card-text"><strong>Montant Hors CRO:</strong> {{ $engagement->Montant_Hors_CRO }}</p>
                            <p class="card-text"><strong>Rang:</strong> {{ $engagement->Rang }}</p>
                            @php
                                $programme = $programmes->firstWhere('Code_Programme', $engagement->Programme);
                            @endphp
                            <p class="card-text"><strong>Programme:</strong> {{ $programme ? $programme->Description : 'Pas de programme' }}</p>
                            <p style='display:flex;justify-content:center;text-align:center;gap:10px;'>
                                <form method='post' action='{{ route('engagements.destroy', $engagement->Code_Engag) }}'>
                                    @csrf
                                    @method('delete')
                                    <a href='{{ route('engagements.edit', $engagement->ID) }}' class='btn btn-warning'>Edit</a>
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
        })
            @if(session('success'))
                $('#successModal').modal('show');
                $('.success-icon').fadeIn(1000); 
            @elseif(session('failed') || session('error'))
                $('#failModal').modal('show');
                $('.fail-icon').fadeIn(1000); 
            @endif

            $('#chantiersTable').DataTable({
                
                "pageLength": 10,
                "lengthChange": false,
                "searching": true,
                "paging": true,
                "info": true,
                
                "language": {
                    "lengthMenu": "Afficher _MENU_ enregistrements par page",
                    "zeroRecords": "Aucun engagement trouvé",
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
