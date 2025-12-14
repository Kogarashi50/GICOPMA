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
        Schema::create('observations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('id_fonctionnaire')->nullable()->constrained('fonctionnaires');
            $table->text('observation');
            $table->date('date_observation');
            $table->json('fichiers_joints')->nullable();
            // No timestamps per model
        });
        
        Schema::create('sous_projet', function (Blueprint $table) {
            $table->string('Code_Sous_Projet')->primary();
            $table->string('Nom_Projet');
            $table->string('ID_Projet_Maitre');
            $table->foreign('ID_Projet_Maitre')->references('Code_Projet')->on('projet');
            
            $table->json('Id_Province')->nullable();
            $table->json('Id_Commune')->nullable();
            $table->text('Observations')->nullable();
            $table->float('Etat_Avan_Physi')->nullable();
            $table->float('Etat_Avan_Finan')->nullable();
            $table->decimal('Estim_Initi', 15, 2)->nullable();
            $table->string('Secteur')->nullable();
            $table->string('Localite')->nullable();
            $table->string('Centre')->nullable();
            $table->string('Site')->nullable();
            $table->string('Surface')->nullable();
            $table->string('Lineaire')->nullable();
            $table->string('Status')->nullable();
            $table->text('Douars_Desservis')->nullable();
            $table->text('Financement')->nullable();
            $table->text('Nature_Intervention')->nullable();
            $table->text('Benificiaire')->nullable();
            $table->foreignId('id_fonctionnaire')->nullable()->constrained('fonctionnaires');
            $table->timestamps();
        });

        // Legacy Engagement table
        Schema::create('engagement', function (Blueprint $table) {
            $table->id('ID');
            $table->string('Code_Engag')->unique();
            $table->text('Description')->nullable();
            $table->decimal('Cout', 15, 2)->nullable();
            $table->decimal('Montant_CRO', 15, 2)->nullable();
            $table->decimal('Montant_Hors_CRO', 15, 2)->nullable();
            $table->integer('Rang')->nullable();
            $table->string('Programme');
            $table->foreign('Programme')->references('Code_Programme')->on('programme');
            $table->timestamps(); // Model does not specify, but it's good practice
        });

        // Other legacy/unstructured tables
        Schema::create('montant_engage', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('id_convention')->nullable();
            $table->unsignedBigInteger('id_partenaire')->nullable();
            $table->decimal('montant_engage', 15, 2)->nullable();
            $table->date('date')->nullable();
            // Other fields seem non-standard and are added as nullable strings
            $table->string('parcourir')->nullable();
            $table->string('structure')->nullable();
            $table->string('rechercher')->nullable();
            $table->string('inserer')->nullable();
            $table->string('vider')->nullable();
            $table->string('supprimer')->nullable();
            $table->string('type')->nullable();
            $table->string('interclassement')->nullable();
            $table->string('taille')->nullable();
            $table->string('perte')->nullable();
            $table->timestamps();
        });

        Schema::create('projet_partenaire', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('id_projet')->nullable();
            $table->unsignedBigInteger('id_partenaire')->nullable();
            $table->decimal('montant', 15, 2)->nullable();
            $table->string('type_engagement')->nullable();
            // Other fields
            $table->string('parcourir')->nullable();
            $table->string('structure')->nullable();
            $table->string('rechercher')->nullable();
            $table->string('inserer')->nullable();
            $table->string('vider')->nullable();
            $table->string('supprimer')->nullable();
            $table->string('type')->nullable();
            $table->string('interclassement')->nullable();
            $table->string('taille')->nullable();
            $table->string('perte')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('projet_partenaire');
        Schema::dropIfExists('montant_engage');
        Schema::dropIfExists('engagement');
        Schema::dropIfExists('sous_projet');
        Schema::dropIfExists('observations');
    }
};