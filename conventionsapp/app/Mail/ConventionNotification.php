<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Session; // Import Session facade if not already imported

class ConventionNotification extends Mailable
{
    use Queueable, SerializesModels;

    public $type;
    public $code;
    public $createdAt;
    public $username;

    /**
     * Create a new message instance.
     *
     * @param string $code
     * @param string $type
     */
    public function __construct($code,$type)
    {
        $this->code = $code;
        $this->type = $type;
        $this->createdAt = now()->format('Y-m-d H:i:s'); // Fetches the current time and formats it
        $this->username = Auth::user()->username;
    }

    /**
     * Build the message.
     *
     * @return $this
     */
    public function build()
    {
        $user = Auth::user();
        if($this->type=='create'){
            $subject="Convention Crée";
        }
        else if($this->type=='delete'){
            $subject="Convention Supprimée";
        }
        else if($this->type=='update'){
            $subject="Convention Modifiée";
        }
        return $this->from('mouad@mouadtaj.tech')
                    ->to('mosporangaming@gmail.com')
                    ->subject($subject)
                    ->view('emails.conventionNotification')
                    ->with([
                        'code' => $this->code,
                        'createdAt' => $this->createdAt,
                        'username' => $this->username,
                        'type' => $this->type,
                    ]);
    }
}
