<?php
namespace App\Http\Controllers;

use App\Models\Document;
use Illuminate\Http\Request;

class DocumentController extends Controller
{
    public function show($id)
    {
        $document = Document::findOrFail($id);
        $filePath = public_path('documents/' . $document->Id_Doc);

        if (!file_exists($filePath)) {
            abort(404);
        }

        return response()->file($filePath);
    }
}
