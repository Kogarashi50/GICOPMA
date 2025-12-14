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
        Schema::create('partenaire', function (Blueprint $table) {
            $table->id('Id');
            $table->string('Code')->unique()->nullable();
            $table->string('Description')->nullable();
            $table->string('Description_Arr')->nullable();
            $table->timestamps();
        });

        Schema::create('maitre_ouvrage', function (Blueprint $table) {
            $table->id();
            $table->string('nom');
            $table->text('description')->nullable();
            $table->string('contact')->nullable();
            $table->string('email')->nullable();
            $table->string('telephone')->nullable();
            $table->string('adresse')->nullable();
            $table->timestamps();
        });

        Schema::create('maitre_ouvrage_delegue', function (Blueprint $table) {
            $table->id();
            $table->string('nom');
            $table->text('description')->nullable();
            $table->string('contact')->nullable();
            $table->string('email')->nullable();
            $table->string('telephone')->nullable();
            $table->string('adresse')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('maitre_ouvrage_delegue');
        Schema::dropIfExists('maitre_ouvrage');
        Schema::dropIfExists('partenaire');
    }
};