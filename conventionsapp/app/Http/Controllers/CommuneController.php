<?php
namespace App\Http\Controllers;

use App\Models\Commune;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class CommuneController extends Controller
{
    public function index()
    {
        $communes =Commune::all();
        return response()->json(['communes'=>$communes],200);
    }

    public function destroy(string $id)
    {
        
        try {
            DB::statement('SET FOREIGN_KEY_CHECKS=0;');
            $deleted = Commune::where('Id', $id)->delete();
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
        $commune = Commune::where('Id', $id)->first();
        
        if (!$commune) {
            return response()->json(['error','Commune n\'existe pas.'],404);
        }
        
        return response()->json(['commune'=>$commune],200);
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
            Commune::create($data);
        } catch (\Exception $e) {
            return response()->json(['failed'=>'process shut down',404]);
        }

        return response()->json(['success'=>'process successfully done',200]);
    }
    public function details(string $id)
    {

        $commune = Commune::where('Id', $id)->first();
        
        if (!$commune) {
            return response()->json(['error','commune n\'existe pas.'],404);
        }
        
        return response()->json(['success','found one.'],200);
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
            $updated = Commune::where('Id', $id)->update($data);
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
