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
        Schema::table('convention', function (Blueprint $table) {
            // Change the 'session' column to a string type
            $table->string('session', 50)->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('convention', function (Blueprint $table) {
            // Revert back to an integer if needed (optional)
            $table->integer('session')->nullable()->change();
        });
    }
};