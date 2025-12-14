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
        // 1. alert_types
        Schema::create('alert_types', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->text('description')->nullable();
            $table->string('permission_name')->nullable();
            $table->timestamps();
        });

        // 2. alerts
        Schema::create('alerts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('alert_type_id')->constrained('alert_types')->onDelete('cascade');
            $table->text('message');
            $table->string('link')->nullable();
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
        });

        // 3. alert_opt_outs
        Schema::create('alert_opt_outs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('alert_type_id')->constrained('alert_types')->onDelete('cascade');
            $table->timestamps();
            $table->unique(['user_id', 'alert_type_id']);
        });

        // 4. alert_subscriptions
        Schema::create('alert_subscriptions', function (Blueprint $table) {
            $table->id();
            // Note: The roles table comes from spatie/laravel-permission
            $table->foreignId('role_id')->constrained('roles')->onDelete('cascade');
            $table->foreignId('alert_type_id')->constrained('alert_types')->onDelete('cascade');
            $table->timestamps();
            $table->unique(['role_id', 'alert_type_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('alert_subscriptions');
        Schema::dropIfExists('alert_opt_outs');
        Schema::dropIfExists('alerts');
        Schema::dropIfExists('alert_types');
    }
};