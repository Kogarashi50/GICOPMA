<!DOCTYPE html>
<html>
<head>
    <title>Accueil</title>
    <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
    <link rel="stylesheet" href="{{ asset('css/index.css') }}">
    <link rel="stylesheet" href="{{ asset('css/sidebar.css') }}">
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
    <script src="https://cdn.jsdelivr.net/npm/animejs@3.2.1/lib/anime.min.js"></script>

    <style>

a:hover{
text-decoration: none;
}
#card-nn:hover{
    background-color:#747474;
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
        .card-nn {
    transition: transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out;
}

.card-nn:hover {
    transform: translateY(-10px);
    box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.1);
}

</style>
</head>
<body>
    @include('sidebar')
    <div class="container mt-5" id='container' style='width:100%;height:auto'>
        <h1 class="mb-4" style='text-align:center;color:rgb(88, 88, 88);'>Accueil</h1>
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
        <!-- -->
        <div id="cardView" class="card-container" style='display:flex;'>
                <div class="mb-4">
                    <div class="card" id='card-nn' style='background-color:#f0f0f0'>
                        <div class="card-body">
                            <a href={{Route('conventions.index')}}><h5 class="card-title text-secondary"  >Dernière Convention</h5></a>
                            <p class="card-text"><strong>Intitule:</strong> {{ $latestConvention->Intitule }}</p>
                            <p class="card-text"><strong>Code:</strong> {{ $latestConvention->Code }}</p>
                            <p class="card-text"><strong>Localisation:</strong> {{ $latestConvention->Localisation }}</p>
                            <p class="card-text"><strong>Partenaire:</strong> {{ $latestConvention->Partenaire }}</p>                         
                        </div>
                    </div>
                </div>
            </div>        <div id="cardView" class="card-container" style='display:flex;'>
                <div class="mb-4">
                    <div class="card card-nn" style='background-color:#f0f0f0'>
                        <div class="card-body">
                            <a href={{Route('projets.index')}}> <h5 class="card-title text-secondary">Dernier Projet</h5></a>
                            <p class="card-text"><strong>Nom Projet:</strong> {{ $latestProjet->Nom_Projet }}</p>
                            <p class="card-text"><strong>Code:</strong> {{ $latestProjet->Code_Projet }}</p>
                            <p class="card-text"><strong>Cout:</strong> {{ $latestProjet->Cout_Projet }}</p>
                        </div>
                    </div>
                </div>
            </div>        <div id="cardView" class="card-container" style='display:flex;'>
                <div class="mb-4">
                    <div class="card card-nn" style='background-color:#f0f0f0'>
                        <div class="card-body">
                            <a href={{Route('partenaires.index')}}> <h5 class="card-title text-secondary">Dernier Partenaire</h5></a>
                            <p class="card-text"><strong>Description:</strong> {{ $latestPartenaire->Description }}</p>
                            <p class="card-text"><strong>Code:</strong> {{ $latestPartenaire->Code }}</p>
                        </div>
                    </div>
                </div>
        </div>

        {{-- <div class="row" >
         
            @if($latestProjet)
            <div class="col-md-4">
                <div class="card mb-4" style='width:40%;'>
                    <div class="card-body">
                        <h5 class="card-title">{{ $latestProjet->Nom_Projet }}</h5>
                        <p class="card-text"><strong>Code Projet:</strong> {{ $latestProjet->Code_Projet }}</p>
                        <p class="card-text"><strong>Coût Projet:</strong> {{ $latestProjet->Cout_Projet }}</p>
                   
                    </div>
                </div>
            </div>
            @endif

            <!-- Latest Partenaire Card -->
            @if($latestPartenaire)
            <div class="col-md-4">
                <div class="card mb-4">
                    <div class="card-body">
                        <h5 class="card-title">{{ $latestPartenaire->Description }}</h5>
                        <p class="card-text"><strong>Code:</strong> {{ $latestPartenaire->Code }}</p>
                     
                    </div>
                </div>
            </div>
            @endif

            <!-- Latest Convention Card -->
            @if($latestConvention)
            <div class="col-md-4">
                <div class="card mb-4">
                    <div class="card-body">
                        <h5 class="card-title">{{ $latestConvention->Intitule }}</h5>
                        <p class="card-text"><strong>Code:</strong> {{ $latestConvention->Code }}</p>
                        <p class="card-text"><strong>Coût Global:</strong> {{ $latestConvention->Cout_Global }}</p>
                    
                    </div>
                </div>
            </div>
            
            @endif --}}
        </div>
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
        });
    </script>
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            anime({
                targets: '.card',
                opacity: [0, 1],
                translateY: [50, 0],
                duration: 500,
                delay: anime.stagger(80) 
            });
    
            if ({{ session('success') ? 'true' : 'false' }}) {
                anime({
                    targets: '.success-icon',
                    scale: [0, 1],
                    opacity: [0, 1],
                    duration: 1000
                });
            }
    
            if ({{ session('failed') ? 'true' : 'false' }}) {
                anime({
                    targets: '.fail-icon',
                    scale: [0, 1],
                    opacity: [0, 1],
                    duration: 1000
                });
            }
        });
    </script>
    

</body>
</html>
