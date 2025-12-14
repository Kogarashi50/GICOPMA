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
        // 1. File Categories Lookup Table
        Schema::create('fichier_categories', function (Blueprint $table) {
            $table->id();
            $table->string('label'); // e.g., "Cahier des prescriptions spéciales"
            $table->string('value')->unique(); // e.g., "cps"
            $table->timestamps();
        });

        // 2. Main attached files table for procurement
        Schema::create('fichier_joint', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ordre_service_id')->nullable()->constrained('ordre_service')->onDelete('cascade');
            $table->foreignId('marche_id')->nullable()->constrained('marche_public')->onDelete('cascade');
            $table->foreignId('lot_id')->nullable()->constrained('lot')->onDelete('cascade');
            $table->foreignId('appel_offre_id')->nullable()->constrained('appel_offre')->onDelete('cascade');
            $table->foreignId('fichier_categorie_id')->nullable()->constrained('fichier_categories')->onDelete('set null');

            $table->string('nom_fichier');
            $table->string('chemin_fichier');
            $table->string('intitule');
            $table->string('categorie')->nullable(); // Kept for legacy data, but FK is preferred
            $table->string('type_fichier')->nullable();
            
            $table->timestamp('date_ajout')->nullable(); // This is the CREATED_AT column
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('fichier_joint');
        Schema::dropIfExists('fichier_categories');
    }
};