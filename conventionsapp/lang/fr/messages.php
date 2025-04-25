<?php

// lang/fr/messages.php

return [
    // General & Server Errors
    'validation_errors' => 'Erreurs de validation.',
    'server_error' => 'Erreur serveur.',
    'server_error_fetching' => 'Erreur serveur lors de la récupération des :resource.', // ':resource' sera remplacé (ex: marchés)
    'server_error_creating' => 'Erreur serveur lors de la création.',
    'server_error_updating' => 'Erreur serveur lors de la mise à jour.',
    'server_error_deleting' => 'Erreur serveur lors de la suppression.',
    'delete_failed_db' => 'La suppression (base de données) a échoué.',

    // Resource Specific Success Messages
    'marche_created' => 'Marché, lots et fichiers créés avec succès.',
    'marche_updated' => 'Marché, lots et fichiers mis à jour.',
    'marche_deleted' => 'Marché et fichiers associés supprimés avec succès.',

    // JSON Errors
    'invalid_json_format' => 'Format JSON invalide pour :field.', // ':field' sera remplacé (ex: lots_data)
    'json_must_be_list' => 'Le champ :field doit être une liste (array).', // ':field' sera remplacé

    // File/Directory Operations
    'file_move_failed' => 'Échec du déplacement du fichier :filename. Vérifiez les permissions.', // ':filename' sera remplacé
    'directory_create_failed' => 'Impossible de créer le répertoire :directory.', // ':directory' sera remplacé
    'directory_not_writable' => 'Le répertoire n\'est pas accessible en écriture :directory.', // ':directory' sera remplacé
    'rollback_cleanup_failed' => 'Nettoyage après erreur : Échec de suppression du fichier :path', // ':path' sera remplacé

    // Add other general messages as needed
    // 'resource_not_found' => ':Resource non trouvé.',
    // 'unauthorized' => 'Accès non autorisé.',
];