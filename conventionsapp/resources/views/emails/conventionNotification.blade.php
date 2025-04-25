<!DOCTYPE html>
<html>
<head>
    <title>Nouvelle Convention Créée</title>
</head>
<body>
    @if($type=='create')
    <h2>Alerte: Création d'une nouvelle convention</h2>
    <p>Bonjour,</p>
    <p>Une nouvelle convention a été crée par {{$username}} avec les détails suivants :</p>
    <ul>
        <li><strong>Code:</strong> {{ $code}}</li>
    </ul>
    <p>Créée le : {{ $createdAt }}</p>
    <p>Merci.</p>
    @elseif($type=='delete')
    <h2>Alerte: Suppression d'une convention</h2>
    <p>Bonjour,</p>
    <p>Une  convention a été supprimée par {{$username}} avec les détails suivants :</p>
    <ul>
        <li><strong>Code:</strong> {{ $code}}</li>
    </ul>
    <p>Merci.</p>
    @elseif($type=='update')
    <h2>Alerte: Modification d'une convention</h2>
    <p>Bonjour,</p>
    <p>Une convention a été modifié par {{$username}} avec les détails suivants :</p>
    <ul>
        <li><strong>Code:</strong> {{ $code}}</li>
    </ul>
    <p>Merci.</p>
    @endif
</body>
</html>
