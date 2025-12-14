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
        Schema::create('convention_partenaire', function (Blueprint $table) {
            $table->id('Id_CP');
            $table->foreignId('Id_Convention')->constrained('convention', 'id')->onDelete('cascade');
            $table->foreignId('Id_Partenaire')->constrained('partenaire', 'Id')->onDelete('cascade');
            $table->foreignId('avenant_id')->nullable()->constrained('avenants')->onDelete('set null');
            
            $table->decimal('Montant_Convenu', 15, 2)->nullable();
            $table->boolean('is_signatory')->default(false);
            $table->text('autre_engagement')->nullable();
            
            $table->foreignId('engagement_type_id')->nullable()->constrained('engagement_types')->onDelete('set null');
            $table->text('engagement_description')->nullable();

            $table->date('date_signature')->nullable();
            $table->text('details_signature')->nullable();
            
            // The withTimestamps() in the Partenaire model relationship implies these columns are desired.
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('convention_partenaire');
    }
};