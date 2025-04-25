<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Utilisateur;

class UpdateUserPasswords extends Command
{
    protected $signature = 'users:update-passwords';

    protected $description = 'Update users\' passwords to use Bcrypt hashing';

    public function __construct()
    {
        parent::__construct();
    }

    public function handle()
    {
        $users = Utilisateur::all();

        foreach ($users as $user) {
            $user->password = bcrypt($user->password);
            $user->save();
        }

        $this->info('Passwords updated successfully.');
    }
}
