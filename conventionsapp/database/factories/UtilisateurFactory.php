<?php

namespace Database\Factories;

use App\Models\Utilisateur; // Ensure the correct model is imported
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash; // Import Hash if needed (though model cast handles it)
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Utilisateur>
 */
class UtilisateurFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     * --model=Utilisateur should have set this automatically.
     *
     * @var string
     */
    protected $model = Utilisateur::class; // Correct model linked

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'username' => fake()->unique()->userName(), // Generate a unique username
            // 'email' => fake()->unique()->safeEmail(), // Add if you have an email column
            // 'email_verified_at' => now(), // Add if you have verification
            'password' => 'admin', // Default password - Will be hashed by the model's cast automatically! No need for Hash::make here.
            // 'remember_token' => Str::random(10), // Add if needed
            // Add any other required fields for your 'utilisateurs' table
        ];
    }

    /**
     * Indicate that the model's email address should be unverified.
     * (Example state - remove if not needed)
     */
    // public function unverified(): static
    // {
    //     return $this->state(fn (array $attributes) => [
    //         'email_verified_at' => null,
    //     ]);
    // }
}