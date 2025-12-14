<?php
namespace App\Http\Controllers;

use App\Models\Commune;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\JsonResponse; 

class CommuneController extends Controller
{
    public function getOptions(Request $request): JsonResponse
    {
        Log::info("API: Fetching Commune options for dropdown.");
        try {
            $provinceId = $request->query('province_id');
            
            // If province_id is provided, filter communes by province
            if ($provinceId) {
                $communes = Commune::where('province_id', $provinceId)
                    ->orderBy('Description')
                    ->get(['Id', 'Description', 'province_id']);
            } else {
                // Otherwise, return all communes
                $communes = Commune::orderBy('Description')->get(['Id', 'Description', 'province_id']);
            }

            $options = $communes->map(function ($commune) {
                return ['value' => $commune->Id, 'label' => $commune->Description];
            });

            Log::info("API: Returning " . $options->count() . " Commune options" . ($provinceId ? " for province_id: {$provinceId}" : ""));
            return response()->json($options); // Return the array of {value, label} directly
        } catch (\Exception $e) {
            Log::error('Error fetching Commune options: ' . $e->getMessage());
            return response()->json(['message' => 'Erreur serveur lors du chargement des options de communes.'], 500);
        }
    }
    
    /**
     * Get communes by province ID
     */
    public function getByProvince(Request $request, $provinceId): JsonResponse
    {
        Log::info("API: Fetching communes for province_id: {$provinceId}");
        try {
            $communes = Commune::where('province_id', $provinceId)
                ->orderBy('Description')
                ->get(['Id', 'Description', 'Code', 'Description_Arr']);

            $options = $communes->map(function ($commune) {
                return ['value' => $commune->Id, 'label' => $commune->Description];
            });

            Log::info("API: Returning " . $options->count() . " communes for province_id: {$provinceId}");
            return response()->json($options);
        } catch (\Exception $e) {
            Log::error('Error fetching communes by province: ' . $e->getMessage());
            return response()->json(['message' => 'Erreur serveur lors du chargement des communes.'], 500);
        }
    }
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
            'Description_Arr' => 'required|string',
            'province_id' => 'nullable|exists:province,Id'
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
            'province_id' => 'nullable|exists:province,Id'
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
