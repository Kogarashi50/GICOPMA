<?php
namespace App\Http\Controllers;

use App\Models\Domaine;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class DomaineController extends Controller
{
    public function index()
    {
        $domaines =Domaine::all();
        return response()->json(['domaines'=>$domaines],200);
    }

    public function destroy(string $id)
    {
        
        try {
            DB::statement('SET FOREIGN_KEY_CHECKS=0;');
            $deleted = Domaine::where('Id', $id)->delete();
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
        $domaine = Domaine::where('Id', $id)->first();
        
        if (!$domaine) {
            return response()->json(['error','Domaine n\'existe pas.'],404);
        }
        
        return response()->json(['domaine'=>$domaine],200);
    }

    public function create()
    {
        return view('partenaires.create');
    }

    public function store(Request $request)
    {
        $data=$request->validate([
            'Code' => 'required|integer',
            'Description' => 'required|string',
            'Description_Arr' => 'required|string'
        ]);

     
        
        try {
            Domaine::create($data);
        } catch (\Exception $e) {
            return response()->json(['failed'=>'process shut down',404]);
        }

        return response()->json(['success'=>'process successfully done',200]);
    }
    public function details(string $id)
    {

        $domaine = Domaine::where('Id', $id)->first();
        
        if (!$domaine) {
            return response()->json(['error','Domaine n\'existe pas.'],404);
        }
        
        return response()->json(['success','found one.'],200);
    }
    

    public function edit(string $id)
    {
        $domaine = Domaine::where('Id', $id)->first();

        if (!$domaine) {
            return redirect()->route('partenaires.index')->with('error', 'Partenaire n\'existe pas.');
        }

        return view('partenaires.edit', compact('partenaire'));
    }

    public function update(Request $request, string $id)
    {
        $data = $request->validate([
            'Code' => 'required|integer',
            'Description' => 'required|string',
            'Description_Arr' => 'required|string',
        ]);


        try {
            DB::statement('SET FOREIGN_KEY_CHECKS=0;');
            $updated = Domaine::where('Id', $id)->update($data);
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
