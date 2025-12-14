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
        // Pivot table for Convention <-> Commune
        Schema::create('commune_convention', function (Blueprint $table) {
            $table->primary(['convention_id', 'commune_id']);
            $table->foreignId('convention_id')->constrained('convention')->onDelete('cascade');
            $table->foreignId('commune_id')->constrained('commune', 'Id')->onDelete('cascade');
            $table->timestamps();
        });

        // --- THIS IS THE CORRECTED BLOCK for maitre_ouvrage ---
        Schema::create('convention_maitre_ouvrage', function (Blueprint $table) {
            $table->primary(['convention_id', 'maitre_ouvrage_id']);
            // This line now correctly constrains to the 'convention' table
            $table->foreignId('convention_id')->constrained('convention')->onDelete('cascade'); 
            $table->foreignId('maitre_ouvrage_id')->constrained('maitre_ouvrage')->onDelete('cascade');
            $table->timestamps();
        });
        // --------------------------------------------------------

        // Pivot table for Convention <-> MaitreOuvrageDelegue
        Schema::create('convention_maitre_ouvrage_delegue', function (Blueprint $table) {
            $table->foreignId('convention_id');
            $table->foreignId('maitre_ouvrage_delegue_id');
            $table->timestamps();

            $table->primary(['convention_id', 'maitre_ouvrage_delegue_id'], 'conv_mod_primary');

            $table->foreign('convention_id', 'conv_mod_convention_id_foreign')
                  ->references('id')->on('convention')->onDelete('cascade');
            
            $table->foreign('maitre_ouvrage_delegue_id', 'conv_mod_delegue_id_foreign')
                  ->references('id')->on('maitre_ouvrage_delegue')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('convention_maitre_ouvrage_delegue');
        // --- THIS LINE WAS MISSING ---
        Schema::dropIfExists('convention_maitre_ouvrage');
        // -----------------------------
        Schema::dropIfExists('commune_convention');
    }
};