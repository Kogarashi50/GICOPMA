<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Contrat Droit Commun (Common Law Contract)
        Schema::create('contrat_droit_commun', function (Blueprint $table) {
            $table->id();
            $table->string('numero_contrat')->unique();
            $table->text('objet');
            $table->string('fournisseur_nom');
            $table->date('date_signature');
            $table->decimal('montant_total', 15, 2);
            $table->string('duree_contrat')->nullable();
            $table->string('type_contrat')->nullable();
            $table->string('mode_paiement')->nullable();
            $table->text('observations')->nullable();
            $table->foreignId('id_fonctionnaire')->nullable()->constrained('fonctionnaires');
            // No timestamps per model
        });

        // 2. Bon de Commande (Purchase Order)
        Schema::create('bon_de_commande', function (Blueprint $table) {
            $table->id();
            $table->string('numero_bc')->unique();
            $table->date('date_emission');
            $table->text('objet');
            $table->decimal('montant_total', 15, 2);
            $table->string('fournisseur_nom');
            $table->string('mode_paiement')->nullable();
            $table->string('etat'); // e.g., 'émis', 'payé', 'annulé'
            
            // Can be linked to a Marche or a Contrat
            $table->foreignId('marche_id')->nullable()->constrained('marche_public');
            $table->foreignId('contrat_id')->nullable()->constrained('contrat_droit_commun');
            
            $table->foreignId('id_fonctionnaire')->nullable()->constrained('fonctionnaires');
            $table->timestamps();
        });

        // 3. Files for Bon de Commande and Contrat Droit Commun
        Schema::create('fichier_bon_commande', function (Blueprint $table) {
            $table->id();
            $table->foreignId('id_bc')->nullable()->constrained('bon_de_commande')->onDelete('cascade');
            $table->foreignId('id_cdc')->nullable()->constrained('contrat_droit_commun')->onDelete('cascade');
            $table->string('nom_fichier');
            $table->string('intitule');
            $table->string('chemin_fichier');
            $table->string('type_fichier')->nullable();
            $table->timestamp('date_ajout')->nullable(); // CREATED_AT
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('fichier_bon_commande');
        Schema::dropIfExists('bon_de_commande');
        Schema::dropIfExists('contrat_droit_commun');
    }
};