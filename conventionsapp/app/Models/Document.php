<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log; // Import Log

class Document extends Model
{
    use HasFactory;

    protected $table = 'document';
    protected $primaryKey = 'Id_Doc';
    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = true; // Assuming created_at/updated_at

    protected $fillable = [
        'Id_Doc',
        'Id_Conv',      // Convention FK (nullable if belongs to avenant)
        'avenant_id',   // <<< ADDED: Avenant FK (nullable if belongs to convention)
        'Intitule',
        'file_name',
        'file_type',
        'file_size',
        'file_path',
    ];

    // Add default values if needed, especially for FKs if not always set
    protected $attributes = [
        'Id_Conv' => null,
        'avenant_id' => null,
    ];

    protected $casts = [
         'file_size' => 'integer',
         // Add casts for timestamps if they exist
         // 'created_at' => 'datetime',
         // 'updated_at' => 'datetime',
    ];


    // Relationship to Convention (Optional: A document might only belong to one parent)
    public function convention()
    {
        return $this->belongsTo(Convention::class, 'Id_Conv', 'id');
    }

    // <<< ADDED: Relationship to Avenant >>>
    public function avenant()
    {
        return $this->belongsTo(Avenant::class, 'avenant_id', 'id');
    }


    // Accessor for URL remains useful
    public function getFichierUrlAttribute(): ?string
    {
        if ($this->file_path && Storage::disk('public')->exists($this->file_path)) {
            return Storage::disk('public')->url($this->file_path);
        }
        return null;
    }

    // Boot method for generating ID and deleting file
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($document) {
            if (empty($document->{$document->getKeyName()})) {
                // Ensure prefix consistency if desired, or just use UUID
                $prefix = $document->Id_Conv ? 'conv_' : ($document->avenant_id ? 'av_' : 'doc_');
                $document->{$document->getKeyName()} = $prefix . Str::uuid()->toString();
            }
        });

        // Deleting physical file - This logic remains the same
        // static::deleting(function ($document) {
        //     Log::info("Attempting delete physical file via Document::deleting for ID {$document->Id_Doc}: Path: {$document->file_path}");
        //     if ($document->file_path && Storage::disk('public')->exists($document->file_path)) {
        //         try {
        //             Storage::disk('public')->delete($document->file_path);
        //             Log::info("Successfully deleted physical file: {$document->file_path}");
        //         } catch (\Exception $e) {
        //             Log::error("Failed to delete physical file {$document->file_path} for Document ID {$document->Id_Doc}: " . $e->getMessage());
        //         }
        //     } else {
        //         Log::warning("Physical file not found or path missing for deletion: {$document->file_path} (Document ID: {$document->Id_Doc})");
        //     }
        // });
    }
}