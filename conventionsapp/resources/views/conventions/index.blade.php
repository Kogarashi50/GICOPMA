<!DOCTYPE html>
<html>
<head>
    <title>CRO - Conventions</title>
    <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
    <link rel="stylesheet" href="{{ asset('css/index.css') }}">
    <link rel="stylesheet" href="{{ asset('css/sidebar.css') }}">
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.datatables.net/1.11.5/css/dataTables.bootstrap4.min.css">
    
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
    <style>
        .card-container {
            display: none;
            width: 100%;
        }
        .success-icon {
            color: #28a745;
            font-size: 48px;
            margin-bottom: 20px;
            display: none;
        }
        .fail-icon {
            color: #de0000;
            font-size: 48px;
            margin-bottom: 20px;
            display: none;
        }
        .modal-content {
            text-align: center;
        }
    </style>
</head>
<body>
    @include('sidebar')
    <div class="container mt-5" id='container'>
        <h1 class="mb-4" id='titre'>Gérer les Conventions</h1>

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
                            <i class="bi bi-check2-circle"></i>
                        </div>
                        @if (session('success'))
                            {{ session('success') }}
                        @endif
                    </div>
                </div>
            </div>
        </div>

        <!-- Modal Fail -->
        <div class="modal fade" id="failModal" tabindex="-1" role="dialog" aria-labelledby="failModalLabel" aria-hidden="true">
            <div class="modal-dialog" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="failModalLabel">Erreur!</h5>
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
                        @elseif (session('error'))
                            {{ session('error') }}
                        @endif
                    </div>
                </div>
            </div>
        </div>

        <!-- SELECTION TYPE AFFICHAGE DATA -->
        <div class="d-flex justify-content-between mb-3">
            <a href="{{ route('conventions.create') }}" class="btn btn-primary">Ajouter une Convention</a>
            <div>
                <!-- <form method="post" action="{{ route('editpref') }}" id="viewPrefForm">
                    @csrf
                    @method('put') -->
                    <label for="viewSelector" class="mr-2"></label>
                    <select id="viewSelector" name="view" class="form-control d-inline-block w-auto">
                        <option value="table">Tableau</option>
                        <option value="cards" >Cartes</option>
                    </select>
                <!-- </form> -->
            </div>
        </div>

        

        <!-- PARTIE TABLE -->
        <div id="tableView" class="table-responsive custom-table">
            <table class="table table-bordered bg-white table-striped " id="conventionsTable">
                <thead class="thead-dark">
                    <tr>
                        <th style="width: 8%;">ID</th>
                        <th style="width: 8%;">Code</th>
                        <th class="column-width">Fichier</th>
                        <th class="column-width">Classification Prov</th>
                        <th class="column-width">Categorie</th>
                        <th class="column-width">Intitule</th>
                        <th class="column-width">Reference</th>
                        <th class="column-width">Convention Signee Par</th>
                        <th class="column-width">Annee Convention</th>
                        <th class="column-width">Objet</th>
                        <th class="column-width">Objectifs</th>
                        <th class="column-width">Localisation</th>
                        <th class="column-width">Maitre Ouvrage</th>
                        <th class="column-width">Partenaire</th>
                        <th class="column-width">Cout Global</th>
                        <th class="column-width">Cout CR</th>
                        <th class="column-width">Statut</th>
                        <th class="column-width">Operationalisation</th>
                        <th class="column-width">Id Programme</th>
                        <th class="column-width">Groupe</th>
                        <th class="column-width">Rang</th>
                        <th class="column-width">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach ($conventions as $convention)
                        <tr>
                            <td class="column-width">{{ $convention->id }}</td>
                            <td class="column-width">{{ $convention->Code }}</td>
                            <td class="column-width">{{ $convention->Fichier }}</td>
                            <td class="column-width">{{ $convention->Classification_prov }}</td>
                            <td class="column-width">{{ $convention->Categorie }}</td>
                            <td class="column-width">{{ $convention->Intitule }}</td>
                            <td class="column-width">{{ $convention->Reference }}</td>
                            <td class="column-width">{{ $convention->Convention_Signee_par }}</td>
                            <td class="column-width">{{ $convention->Annee_Convention }}</td>
                            <td class="column-width">{{ $convention->Objet }}</td>
                            <td class="column-width">{{ $convention->Objectifs }}</td>
                            <td class="column-width">{{ $convention->Localisation }}</td>
                            <td class="column-width">{{ $convention->Maitre_Ouvrage }}</td>
                            <td class="column-width">{{ $convention->Partenaire }}</td>
                            <td class="column-width">{{ $convention->Cout_Global }}</td>
                            <td class="column-width">{{ $convention->Cout_CR }}</td>
                            <td class="column-width">{{ $convention->Statut }}</td>
                            <td class="column-width">{{ $convention->Operationalisation }}</td>
                            <td class="column-width">{{ $convention->Id_Programme }}</td>
                            <td class="column-width">{{ $convention->Groupe }}</td>
                            <td class="column-width">{{ $convention->Rang }}</td>
                            <td style='display:flex;gap:10px;'>
                                <a href='{{route('conventions.edit', $convention->id )}}' class='btn btn-warning'>Edit</a>
                                <a href='{{route('conventions.details', $convention->id )}}' class='btn btn-success'>Details</a>
                                <form method='post' action={{route('conventions.destroy',$convention->id)}}>
                                    @csrf
                                    @method('delete')
                                    <input type='submit' name='submit' class='btn btn-danger' value="Supprimer">
                                </form>
                            </td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        </div>

        <!-- PARTIE CARTES -->
        <div id="cardView" class="card-container" >
            @foreach ($conventions as $convention)
                <div class="mb-4">
                    <div class="card">
                        <div class="card-body">
                            <h5 class="card-title text-primary">{{ $convention->Intitule }}</h5>
                            <p class="card-text"><strong>ID:</strong> {{ $convention->id }}</p>
                            <p class="card-text"><strong>Code:</strong> {{ $convention->Code }}</p>
                            <p class="card-text"><strong>Fichier:</strong> {{ $convention->Fichier }}</p>
                            <p class="card-text"><strong>Classification Prov:</strong> {{ $convention->Classification_prov }}</p>
                            <p class="card-text"><strong>Categorie:</strong> {{ $convention->Categorie }}</p>
                            <p class="card-text"><strong>Reference:</strong> {{ $convention->Reference }}</p>
                            <p class="card-text"><strong>Convention Signee Par:</strong> {{ $convention->Convention_Signee_par }}</p>
                            <p class="card-text"><strong>Annee Convention:</strong> {{ $convention->Annee_Convention }}</p>
                            <p class="card-text"><strong>Objet:</strong> {{ $convention->Objet }}</p>
                            <p class="card-text"><strong>Objectifs:</strong> {{ $convention->Objectifs }}</p>
                            <p class="card-text"><strong>Localisation:</strong> {{ $convention->Localisation }}</p>
                            <p class="card-text"><strong>Maitre Ouvrage:</strong> {{ $convention->Maitre_Ouvrage }}</p>
                            <p class="card-text"><strong>Partenaire:</strong> {{ $convention->Partenaire }}</p>
                            <p class="card-text"><strong>Cout Global:</strong> {{ $convention->Cout_Global }}</p>
                            <p class="card-text"><strong>Cout CR:</strong> {{ $convention->Cout_CR }}</p>
                            <p class="card-text"><strong>Statut:</strong> {{ $convention->Statut }}</p>
                            <p class="card-text"><strong>Operationalisation:</strong> {{ $convention->Operationalisation }}</p>
                            <p class="card-text"><strong>Id Programme:</strong> {{ $convention->Id_Programme }}</p>
                            <p class="card-text"><strong>Groupe:</strong> {{ $convention->Groupe }}</p>
                            <p class="card-text"><strong>Rang:</strong> {{ $convention->Rang }}</p>
                            <p style='display:flex;justify-content:center;text-align:center;gap:10px;'>
                                <form method='post' action={{route('conventions.destroy',$convention->id)}}>
                                    @csrf
                                    @method('delete')
                                    <a href='{{route('conventions.edit', $convention->id )}}' class='btn btn-warning'>Edit</a>
                                    <a href='{{route('conventions.details', $convention->id )}}' class='btn btn-success'>Details</a>
                                    <input type='submit' name='submit' class='btn btn-danger' value="Supprimer">
                                </form>
                            </p>
                        </div>
                    </div>
                </div>
            @endforeach
        </div>
    </div>
    <script src="https://cdn.datatables.net/1.11.5/js/jquery.dataTables.min.js"></script>
    <script src="https://cdn.datatables.net/1.11.5/js/dataTables.bootstrap4.min.js"></script>
    <script>
        document.getElementById('viewSelector').addEventListener('change', function () {
            var tableView = document.getElementById('tableView');
            var cardView = document.getElementById('cardView');
            var container = document.getElementById('container');
            var titre = document.getElementById('titre');
            if (this.value === 'table') {
                tableView.style.display = 'block';
                cardView.style.display = 'none';
                container.style.backgroundColor = '#ffffffd7';
                titre.style.color = '#343a40';
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

    <script>
        $(document).ready(function () {
            $('.close').click(function (e) {
                $('#successModal').modal('hide');
                $('.success-icon').fadeOut(1000); 
                $('#failModal').modal('hide');
                $('.fail-icon').fadeOut(1000); 
            })
            @if(session('success'))
                $('#successModal').modal('show');
                $('.success-icon').fadeIn(1000); 
            @elseif(session('failed'))
                $('#failModal').modal('show');
                $('.fail-icon').fadeIn(1000); 
            @elseif(session('error'))
                $('#failModal').modal('show');
                $('.fail-icon').fadeIn(1000); 
            @endif
            $('#conventionsTable').DataTable({
                
                "pageLength": 10,
                "lengthChange": false,
                "searching": true,
                "paging": true,
                "info": true,
                
                "language": {
                    "lengthMenu": "Afficher _MENU_ enregistrements par page",
                    "zeroRecords": "Aucune convention trouvé",
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
        
        // document.getElementById('viewSelector').addEventListener('change', function () {
        //     document.getElementById('viewPrefForm').submit();
        // });
        document.addEventListener('DOMContentLoaded', () => {
    if (document.querySelector('.success-icon')) {
        anime({
            targets: '.success-icon',
            scale: [0, 1],
            duration: 1000,
            easing: 'easeOutElastic(1, .8)',
            delay: 500
        });
    }
    if (document.querySelector('.fail-icon')) {
        anime({
            targets: '.fail-icon',
            scale: [0, 1],
            duration: 1000,
            easing: 'easeOutElastic(1, .8)',
            delay: 500
        });
    }
});

        
    </script>
</body>
</html>
