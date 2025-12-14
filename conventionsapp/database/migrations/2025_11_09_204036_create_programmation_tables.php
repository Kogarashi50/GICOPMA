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
        Schema::create('domaine', function (Blueprint $table) {
            $table->id('Id');
            $table->string('Code')->unique()->nullable();
            $table->string('Description')->nullable();
            $table->string('Description_Arr')->nullable();
            $table->timestamps();
        });

        Schema::create('programme', function (Blueprint $table) {
            $table->id('Id');
            $table->string('Code_Programme')->unique();
            $table->string('Description')->nullable();
            $table->foreignId('domaine_id')->nullable()->constrained('domaine', 'Id');
            $table->timestamps();
        });
        
        Schema::create('secteurs', function (Blueprint $table) {
            $table->id();
            $table->string('description_fr');
            $table->string('description_ar')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('secteurs');
        Schema::dropIfExists('programme');
        Schema::dropIfExists('domaine');
    }
};