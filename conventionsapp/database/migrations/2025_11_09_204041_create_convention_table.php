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
        Schema::create('convention', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->string('code_provisoire')->nullable();
            $table->text('intitule');
            $table->string('reference')->nullable();
            $table->foreignId('id_projet')->nullable()->constrained('projet', 'ID_Projet');
            $table->year('annee_convention')->nullable();
            $table->text('objet')->nullable();
            $table->text('observations')->nullable();
            $table->text('objectifs')->nullable();
            $table->text('localisation')->nullable(); // Stores Province IDs
            $table->decimal('cout_global', 15, 2)->nullable();
            $table->string('statut')->nullable();
            $table->string('operationalisation')->nullable();
            $table->foreignId('Id_Programme')->nullable()->constrained('programme', 'Id');
            $table->string('groupe')->nullable();
            $table->integer('rang')->nullable();
            $table->foreignId('id_fonctionnaire')->nullable()->constrained('fonctionnaires');
            $table->string('numero_approbation')->nullable();
            $table->string('session')->nullable();
            $table->foreignId('convention_cadre_id')->nullable()->constrained('convention')->onDelete('set null');
            $table->string('type')->nullable(); // e.g., Cadre, Spécifique
            $table->date('date_visa')->nullable();
            $table->date('date_reception_vise')->nullable();
            $table->integer('duree_convention')->nullable(); // In months or years
            $table->json('membres_comite_technique')->nullable();
            $table->json('membres_comite_pilotage')->nullable();
            $table->boolean('has_audit')->default(false);
            $table->text('audit_text')->nullable();
            $table->text('indicateur_suivi')->nullable();
            $table->string('cadence_reunion')->nullable();
            $table->string('fichier')->nullable();
            $table->string('classification_prov')->nullable();
            $table->date('date_envoi_visa_mi')->nullable();
            $table->string('sous_type')->nullable();
            $table->boolean('requires_council_approval')->default(false);
            $table->foreignId('secteur_id')->nullable()->constrained('secteurs');
            $table->timestamps();
        });

        // Now, add the foreign key from projet to convention that was skipped earlier
        Schema::table('projet', function (Blueprint $table) {
            $table->foreign('Convention_Code')->references('code')->on('convention')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Drop the foreign key first before dropping the convention table
        Schema::table('projet', function (Blueprint $table) {
            $table->dropForeign(['Convention_Code']);
        });
        Schema::dropIfExists('convention');
    }
};