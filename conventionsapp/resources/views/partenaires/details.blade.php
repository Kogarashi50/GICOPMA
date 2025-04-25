<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Détails du Partenaire</title>
    <link href="https://maxcdn.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="{{ asset('css/home.css') }}">
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&family=Open+Sans:wght@300;600&display=swap" rel="stylesheet">
    <style>
        body {
            font-family: 'Roboto', sans-serif;
            background-color: #f8f9fa;
        }
        .header-title {
            font-family: 'Open Sans', sans-serif;
            font-weight: 600;
        }
        .card-header, .card-body {
            margin-bottom: 20px;
        }
        .card-header {
            font-weight: bold;
        }
        .btn-custom {
            background-color: #007bff;
            color: white;
        }
        .btn-custom:hover {
            background-color: #0056b3;
        }
        .text-success{
            font-weight: bold;
            transition: all 0.3s ease;
            
            /* text-decoration: none; */
        }
        a:hover{
            text-decoration: none;
        }
    </style>
</head>
<body>
    @include('sidebar')
    <div class="container mt-5">
        <div class="row">
            <div class="col-lg-12">
                <h1 class="header-title mb-4">Détails du Partenaire</h1>
                <div class='card-container'>
                    <div class="card">
                        <div class="card-header">
                            Informations Générales
                        </div>
                        <div class="card-body">
                            <p><strong>Description:</strong> {{ $partenaire->Description }} {{ $partenaire->Description_Arr }}</p>
                            <p><strong>Code:</strong> {{ $partenaire->Code }}</p>
                        </div>
                    </div>

                    @foreach($conventions as $convention)
                        <div class="card">
                            <div class="card-header">
                                Détails de la Convention
                            </div>
                            <div class="card-body">
                                <p><strong>Convention Signée Par:</strong> {{ $convention->Convention_Signee_par }}</p>
                                <p><strong>Année de la Convention:</strong> {{ $convention->Annee_Convention }}</p>
                                <p><strong>Plus D'informations:</strong>
                                    {{-- <a href='{{ route('conventions.details', $convention->id) }}' class='btn btn-success'>Details</a> --}}
                                    <a href='{{ route('conventions.details', $convention->id) }}' class='text text-success'>Details</a>
                                </p>
                            </div>
                        </div>
                    @endforeach
                    @foreach($projets as $projet)
                        <div class="card">
                            <div class="card-header">
                                Détails du Projet
                            </div>
                            <div class="card-body">
                                <p><strong>Nom Projet:</strong> {{ $projet->Nom_Projet }}</p>
                                <p><strong>Code Projet:</strong> {{ $projet->Code_Projet }}</p>
                                <p><strong>Plus D'informations:</strong>
                                    {{-- <a href='{{ route('conventions.details', $convention->id) }}' class='btn btn-success'>Details</a> --}}
                                </p>
                            </div>
                        </div>
                    @endforeach

                   
                </div>
            </div>
            <a href="{{ route('partenaires.index') }}" class="btn btn-primary" style='margin-top:20px;margin-bottom:50px;'>Revenir à la liste</a>
        </div>
    </div>
</div>
</div>

</body>
</html>
