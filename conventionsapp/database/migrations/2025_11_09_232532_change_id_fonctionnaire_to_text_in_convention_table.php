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
            // Step 1: Drop the existing foreign key constraint first.
            // Laravel's default naming convention is `table_column_foreign`.
            $table->dropForeign('convention_id_fonctionnaire_foreign');

            // Step 2: Now that the constraint is removed, change the column type.
            // We use ->json() as it's the most appropriate type.
            $table->json('id_fonctionnaire')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('convention', function (Blueprint $table) {
            // Step 1 (Reverse): Change the column type back to an integer.
            // We assume it was an unsigned big integer, which is standard for Laravel foreign keys.
            $table->unsignedBigInteger('id_fonctionnaire')->nullable()->change();

            // Step 2 (Reverse): Re-add the foreign key constraint.
            // Make sure 'fonctionnaires' is the correct name of your other table.
            $table->foreign('id_fonctionnaire')->references('id')->on('fonctionnaires');
        });
    }
};