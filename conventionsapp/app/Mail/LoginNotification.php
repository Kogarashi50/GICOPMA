<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Contracts\Queue\ShouldQueue;
use App\Models\Utilisateur; // Assuming this is your User model namespace

class LoginNotification extends Mailable
{
    use Queueable, SerializesModels;

    public $username;
    public $role;
    public $view;
    public $loginTime;

    /**
     * Create a new message instance.
     *
     * @param  Utilisateur  $user
     * @return void
     */
    public function __construct(Utilisateur $user)
    {
        $this->username = $user->username;
        $this->role = $user->role;
        $this->view = $user->view;
        $this->loginTime = now(); // Fetches the current time
    }

    /**
     * Build the message.
     *
     * @return $this
     */
    public function build()
    {
        return $this->from('mouad@mouadtaj.tech')
                    ->to('mosporangaming@gmail.com')
                    ->subject('User Logged In')
                    ->view('emails.loginNotification')
                    ->with([
                        'username' => $this->username,
                        'role' => $this->role,
                        'view' => $this->view,
                        'loginTime' => $this->loginTime->format('Y-m-d H:i:s'),
                    ]);
    }
}
