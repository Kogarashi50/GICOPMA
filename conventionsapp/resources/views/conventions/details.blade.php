<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Convention Details</title>
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
    </style>
</head>
<body>
    @include('sidebar')
    <div class="container mt-5">
        <div class="row">
            <div class="col-lg-12">
                <h1 class="header-title mb-4">Détails du Convention - ({{$convention->Code}})</h1>
                <div class='card-container'>
                <div class="card">
                    <div class="card-header">
                        Informations Générales
                    </div>
                    <div class="card-body">
                        <p><strong>Code:</strong> {{ $convention->Code }}</p>
                        <p><strong>Fichier:</strong> {{ $convention->Fichier }}</p>
                        <p><strong>Classification Prov:</strong> {{ $convention->Classification_prov }}</p>
                        <p><strong>Catégorie:</strong> {{ $convention->Categorie }}</p>
                        <p><strong>Intitulé:</strong> {{ $convention->Intitule }}</p>
                        <p><strong>Référence:</strong> {{ $convention->Reference }}</p>
                    </div>
                </div>
                <div class="card">
                    <div class="card-header">
                        Détails du Convention
                    </div>
                    <div class="card-body">
                        <p><strong>Convention Signée Par:</strong> {{ $convention->Convention_Signee_par }}</p>
                        <p><strong>Année de la Convention:</strong> {{ $convention->Annee_Convention }}</p>
                        <p><strong>Objet:</strong> {{ $convention->Objet }}</p>
                        <p><strong>Objectifs:</strong> {{ $convention->Objectifs }}</p>
                        <p><strong>Localisation:</strong> {{ $convention->Localisation }}</p>
                        <p><strong>Maître Ouvrage:</strong> {{ $convention->Maitre_Ouvrage }}</p>
                        <p><strong>Partenaire:</strong> {{ $convention->Partenaire }}</p>
                        <p><strong>Coût Global:</strong> {{ $convention->Cout_Global }}</p>
                        <p><strong>Coût CR:</strong> {{ $convention->Cout_CR }}</p>
                        <p><strong>Groupe:</strong> {{ $convention->Groupe }}</p>
                        <p><strong>Rang:</strong> {{ $convention->Rang }}</p>
                    </div>
                </div>
                <div class="card">
                    <div class="card-header">
                        État du Convention
                    </div>
                    <div class="card-body">
                        <p><strong>Statut:</strong> {{ $convention->Statut }}</p>
                        <p><strong>Operationalisation:</strong> {{ $convention->Operationalisation }}</p>
                    </div>
                </div>
                <div class="card">
                    <div class="card-header">Informations du Programme</div>
                    <div class="card-body">
                        @if($programme)
                            <p><strong>Description Programme:</strong> {{ $programme->Description }}</p>
                            <p><strong>Code Programme:</strong> {{ $programme->Code_Programme }}</p>
                        @else
                            <p><em>Pas de programme.</em></p>
                        @endif
                    </div>
                </div>
                <div class="card">
                    <div class="card-header">
                     Informations du Chantier
                    </div>
                    <div class="card-body">
                        @if($chantier)
                            <p><strong>Description Chantier:</strong> {{ $chantier->Description }}</p>
                            <p><strong>Code Chantier:</strong> {{ $chantier->Code_Chantier }}</p>
                        @else
                            <p><em>Pas de chantier.</em></p>
                        @endif
                    </div>
                </div>
                <div class="card">
                    <div class="card-header">
                       Informations du Domaine 
                    </div>
                    <div class="card-body">
                        @if($domaine)
                            <p><strong>Description Domaine:</strong> {{ $domaine->Description }} -  {{ $domaine->Description_Arr }} </p>
                            <p><strong>Code Domaine:</strong> {{ $domaine->Code_Domaine }}</p>
                        @else
                            <p><em>Pas de domaine.</em></p>
                        @endif
                    </div>
                </div>
                <div class="card">
                    <div class="card-header">
                       Informations du Document 
                    </div>
                    <div class="card-body">
                        @if($document)
                            <p><strong><a href='/documents/{{$document->Id_Doc}}'> Document </a></strong> </p>
                            <p><strong>Intitule:</strong> {{ $document->Intitule }}</p>
                        @else
                            <p><em>Pas de Document.</em></p>
                        @endif
                    </div>
                </div>
                <div class="card">
                    <div class="card-header">
                       Informations des projets 
                    </div>
                    <div class="card-body">
                        @if($projet)
                            <p><strong>Code Projet:</strong> {{ $projet->Code_Projet }}</p>
                            <p><strong>Nom Projet:</strong> {{ $projet->Nom_Projet }}</p>
                            <p><strong>Cout CRO:</strong> {{ $projet->Cout_CRO }}</p>
                            <p><strong>Date Debut:</strong> {{ $projet->Date_Debut }}</p>
                            <p><strong>Date Fin:</strong> {{ $projet->Date_Fin }}</p>
                            <p><strong>Observations:</strong> {{ $projet->Observations }}</p>
                        @else
                            <p><em>Pas de Projet.</em></p>
                        @endif
                    </div>
                </div>
            </div>
            <a href="{{ route('conventions.index') }}" class="btn btn-primary" style='margin-top:20px;margin-bottom:50px;'>Revenir à la liste</a>

        </div>
    </div>
</div>
</div>
</div>
    

</body>
</html>
