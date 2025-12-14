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
        Schema::create('avenants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('convention_id')->constrained('convention')->onDelete('cascade');
            $table->string('numero_avenant');
            $table->date('date_signature')->nullable();
            $table->text('objet')->nullable();
            $table->json('type_modification')->nullable();
            $table->decimal('montant_modifie', 15, 2)->nullable();
            $table->decimal('montant_avenant', 15, 2)->nullable();
            $table->date('nouvelle_date_fin')->nullable();
            $table->foreignId('id_fonctionnaire')->nullable()->constrained('fonctionnaires')->onDelete('set null');
            $table->string('code')->nullable();
            $table->year('annee_avenant')->nullable();
            $table->string('session')->nullable();
            $table->string('numero_approbation')->nullable();
            $table->string('statut')->nullable();
            $table->date('date_visa')->nullable();
            $table->text('remarques')->nullable();
            $table->timestamp('date_creation')->useCurrent();
            // No 'updated_at' timestamp as specified in the model (const UPDATED_AT = null)
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('avenants');
    }
};