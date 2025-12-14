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
        // 1. Appel d'Offre (Call for Tenders)
        Schema::create('appel_offre', function (Blueprint $table) {
            $table->id();
            $table->string('categorie')->nullable();
            $table->json('provinces')->nullable();
            $table->string('numero')->unique();
            $table->text('intitule');
            $table->decimal('estimation', 15, 2)->nullable();
            $table->decimal('estimation_HT', 15, 2)->nullable();
            $table->decimal('montant_TVA', 15, 2)->nullable();
            $table->integer('duree_execution')->nullable(); // in days/months
            $table->date('date_verification')->nullable();
            $table->dateTime('date_ouverture')->nullable();
            $table->dateTime('last_session_op')->nullable();
            $table->boolean('lancement_portail')->default(false);
            $table->date('date_lancement_portail')->nullable();
            $table->date('date_publication')->nullable();
            $table->foreignId('id_fonctionnaire')->nullable()->constrained('fonctionnaires');
            $table->timestamps();
        });

        // 2. Marche Public (Public Contract/Market)
        Schema::create('marche_public', function (Blueprint $table) {
            $table->id();
            $table->string('numero_marche')->unique();
            $table->text('intitule');
            $table->string('type_marche')->nullable();
            $table->string('procedure_passation')->nullable();
            $table->string('mode_passation')->nullable();
            $table->decimal('budget_previsionnel', 15, 2)->nullable();
            $table->decimal('montant_attribue', 15, 2)->nullable();
            $table->string('source_financement')->nullable();
            $table->string('attributaire')->nullable();
            $table->date('date_publication')->nullable();
            $table->date('date_limite_offres')->nullable();
            $table->date('date_notification')->nullable();
            $table->date('date_debut_execution')->nullable();
            $table->integer('duree_marche')->nullable();
            $table->string('statut')->nullable();
            
            $table->foreignId('id_convention')->nullable()->constrained('convention');
            $table->foreignId('id_fonctionnaire')->nullable()->constrained('fonctionnaires');
            $table->foreignId('ref_appelOffre')->nullable()->constrained('appel_offre');

            $table->double('avancement_physique')->nullable();
            $table->double('avancement_financier')->nullable();
            $table->date('date_engagement_tresorerie')->nullable();
            $table->date('date_visa_tresorerie')->nullable();
            $table->date('date_approbation_president')->nullable();

            $table->morphs('projectable'); // Adds projectable_id (UNSIGNED BIGINT) and projectable_type (VARCHAR)
            
            $table->timestamps();
        });

        // 3. Lot (Contract Lot)
        Schema::create('lot', function (Blueprint $table) {
            $table->id();
            $table->foreignId('marche_id')->constrained('marche_public')->onDelete('cascade');
            $table->string('numero_lot');
            $table->text('objet');
            $table->decimal('montant_attribue', 15, 2)->nullable();
            $table->string('attributaire')->nullable();
            // No timestamps per model
        });

        // 4. Ordre de Service (Service Order)
        Schema::create('ordre_service', function (Blueprint $table) {
            $table->id();
            $table->foreignId('marche_id')->constrained('marche_public')->onDelete('cascade');
            $table->enum('type', ['commencement', 'arret', 'reprise']); // Added reprise as a common option
            $table->string('numero');
            $table->date('date_emission');
            $table->text('description')->nullable();
            $table->string('fichier_joint')->nullable(); // Path to file
            $table->unsignedBigInteger('cree_par')->nullable(); // Not a foreign key
            $table->foreignId('id_fonctionnaire')->nullable()->constrained('fonctionnaires');
            $table->timestamp('cree_le')->nullable();
            $table->timestamp('modifie_le')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ordre_service');
        Schema::dropIfExists('lot');
        Schema::dropIfExists('marche_public');
        Schema::dropIfExists('appel_offre');
    }
};