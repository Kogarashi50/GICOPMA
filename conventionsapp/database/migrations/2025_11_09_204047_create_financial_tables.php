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
        // Financial commitments for a Projet from a Partenaire
        Schema::create('engagements_financiers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('projet_id')->constrained('projet', 'ID_Projet')->onDelete('cascade');
            $table->foreignId('partenaire_id')->constrained('partenaire', 'Id')->onDelete('cascade');
            $table->decimal('montant_engage', 15, 2);
            $table->text('commentaire')->nullable();
            $table->date('date_engagement');
            // No timestamps as per model
        });

        // Payments made against an EngagementFinancier
        Schema::create('versements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('engagement_id')->constrained('engagements_financiers')->onDelete('cascade');
            $table->date('date_versement');
            $table->decimal('montant_verse', 15, 2);
            $table->string('moyen_paiement')->nullable();
            $table->string('reference_paiement')->nullable();
            $table->text('commentaire')->nullable();
            // No timestamps as per model
        });

        // Planned yearly payments for a convention partner
        Schema::create('engagements_annuels', function (Blueprint $table) {
            $table->id();
            $table->foreignId('id_cp')->constrained('convention_partenaire', 'Id_CP')->onDelete('cascade');
            $table->year('annee');
            $table->decimal('montant_prevu', 15, 2);
            $table->timestamps();
        });

        // Actual payments made by a convention partner
        Schema::create('versementsCP', function (Blueprint $table) {
            $table->id();
            $table->foreignId('id_CP')->constrained('convention_partenaire', 'Id_CP')->onDelete('cascade');
            $table->date('date_versement');
            $table->decimal('montant_verse', 15, 2);
            $table->string('moyen_paiement')->nullable();
            $table->string('reference_paiement')->nullable();
            $table->text('commentaire')->nullable();
            // No timestamps as per model
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('versementsCP');
        Schema::dropIfExists('engagements_annuels');
        Schema::dropIfExists('versements');
        Schema::dropIfExists('engagements_financiers');
    }
};