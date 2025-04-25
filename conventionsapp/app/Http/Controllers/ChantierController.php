<?php
namespace App\Http\Controllers;

use App\Models\Chantier;
use App\Models\Domaine;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class ChantierController extends Controller
{
    public function index()
    {
        
        // $view = session('view');
        $chantiers = Chantier::with('domaine')
        ->orderBy('created_at', 'desc')
        ->get();
        return response()->json(['chantiers' => $chantiers],200);
    }

    public function destroy(string $id)
    {
        try {
            DB::statement('SET FOREIGN_KEY_CHECKS=0;');
            $deleted = Chantier::where('Id', $id)->delete();
            DB::statement('SET FOREIGN_KEY_CHECKS=1;');
            if ($deleted) {
                return response()->json(['success'=>'done done'],200);
            } else {
                return response()->json(['failed'=>'non trouve '],404);
            }
        } catch (\Exception $e) {
            DB::statement('SET FOREIGN_KEY_CHECKS=1;');
            return response()->json(['failed'=>'process shut down'],400);
        }
    }


    public function show(string $id)
    {
        $chantier = Chantier::where('Id', $id)->first();
                $chantier->load('domaine');

        if (!$chantier) {
            return response()->json(['message' => 'Erreur lors de la récupération du chantier.'], 500);      
          }
                    return response()->json(['chantier' => $chantier]);

        }

   

    public function store(Request $request)
    {
        $data=$request->validate([
            'Code_Chantier' => 'required|integer',
            'Description' => 'required|string',
            'Id_Domaine' => 'required',
        ]);

        // Chantier::create($data);
        $data = $request->all();

        try {
            Chantier::create($data);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Erreur lors de la création du chantier.'], 500);
                }

        return response()->json(['message' => 'Chantier créé avec succès.'], 201);     }
    
 
    public function update(Request $request,string $id)
    {               $data=$request->validate([
                         'Code_Chantier' => 'required|integer',
                        'Description' => 'required|string',
                        'Id_Domaine' => 'required',
    ]);

    // Chantier::create($data);
    try {
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        $updated = Chantier::where('Id', $id)->update($data);
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        if ($updated) {
            return response()->json(['success'=>'done done'],200);
        } else {
            return response()->json(['failed'=>'user not found'],404);
        }
    } catch (\Exception $e) {
        return response()->json(['failed'=>'process shut down'],404);
    }   
}  
  }
        // try {
        //     DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        //     $updated = DB::table('chantier')->where('Id', $id)->update($data);
        //     DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        //     if ($updated) {
        //         return redirect()->route('chantiers.index')->with('success', 'Partenaire modifié avec success.');
        //     } else {
        //         return redirect()->route('chantiers.edit', $id)->with('failed', 'Erreur lors du modification du partenaire [ERR1].');
        //     }
        // } catch (\Exception $e) {
        //     return redirect()->route('chantiers.edit', $id)->with('failed', 'Erreur lors du modification du partenaire [ERR2].');
        // }



