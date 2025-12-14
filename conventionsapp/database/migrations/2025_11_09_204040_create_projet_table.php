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
        Schema::create('projet', function (Blueprint $table) {
            $table->id('ID_Projet');
            $table->string('Code_Projet')->unique();
            $table->string('Nom_Projet');
            
            $table->string('Id_Programme'); // Foreign key added below
            $table->foreign('Id_Programme')->references('Code_Programme')->on('programme')->onDelete('cascade');

            $table->foreignId('secteur_id')->nullable()->constrained('secteurs')->onDelete('set null');
            
            $table->decimal('Cout_Projet', 15, 2)->nullable();
            $table->decimal('Cout_CRO', 15, 2)->nullable();
            $table->date('Date_Debut')->nullable();
            $table->date('Date_Fin')->nullable();
            $table->text('Observations')->nullable();
            $table->float('Etat_Avan_Physi')->nullable();
            $table->float('Etat_Avan_Finan')->nullable();
            
            // This column is created here, but the foreign key constraint is added in the convention migration
            $table->string('Convention_Code')->nullable();
            
            $table->foreignId('id_fonctionnaire')->nullable()->constrained('fonctionnaires')->onDelete('set null');
            
            $table->string('maitre_ouvrage')->nullable();
            $table->string('maitre_ouvrage_delegue')->nullable();
            
            $table->integer('duree_projet_mois')->nullable();
            $table->date('date_debut_prevue')->nullable();
            $table->date('date_fin_prevue')->nullable();
            
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('projet');
    }
};