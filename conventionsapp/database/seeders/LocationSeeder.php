<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class LocationSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::table('province')->insert([
            ['Id' => 1, 'Code' => '02.113.', 'Description' => 'Province: Berkane', 'Description_Arr' => 'إقليم: بركان'],
            ['Id' => 2, 'Code' => '02.167.', 'Description' => 'Province: Driouch', 'Description_Arr' => 'إقليم: الدريوش'],
            ['Id' => 3, 'Code' => '02.251.', 'Description' => 'Province: Figuig', 'Description_Arr' => 'إقليم: فجيج'],
            ['Id' => 4, 'Code' => '02.265.', 'Description' => 'Province: Guercif', 'Description_Arr' => 'إقليم: جرسيف'],
            ['Id' => 5, 'Code' => '02.275.', 'Description' => 'Province: Jerada', 'Description_Arr' => 'إقليم: جرادة'],
            ['Id' => 6, 'Code' => '02.381.', 'Description' => 'Province: Nador', 'Description_Arr' => 'إقليم: الناضور'],
            ['Id' => 7, 'Code' => '02.411.', 'Description' => 'Préfecture: Oujda-Angad', 'Description_Arr' => 'عمالة: وجدة - أنكاد'],
            ['Id' => 8, 'Code' => '02.533.', 'Description' => 'Province: Taourirt', 'Description_Arr' => 'إقليم: تاوريرت'],
        ]);

        // A sample of communes
        DB::table('commune')->insert([
            ['Code' => '02.533.09.11.', 'Description' => 'Melg El Ouidane', 'Description_Arr' => 'ملك الويدان', 'province_id' => 8],
            ['Code' => '02.533.07.21.', 'Description' => 'Tancherfi', 'Description_Arr' => 'تنشرفي', 'province_id' => 8],
            ['Code' => '02.411.05.19.', 'Description' => 'Sidi Moussa Lemhaya', 'Description_Arr' => 'سيدي موسى المهاية', 'province_id' => 7],
            ['Code' => '02.381.07.17.', 'Description' => 'Tiztoutine', 'Description_Arr' => 'تزطوطين', 'province_id' => 6],
            ['Code' => '02.275.05.15.', 'Description' => 'Oulad Sidi Abdelhakem', 'Description_Arr' => 'أولاد سيدي عبد الحاكم', 'province_id' => 5],
            ['Code' => '02.265.07.17.', 'Description' => 'Taddart', 'Description_Arr' => 'تادرت', 'province_id' => 4],
            ['Code' => '02.251.05.07.', 'Description' => 'Tendrara', 'Description_Arr' => 'تندرارة', 'province_id' => 3],
            ['Code' => '02.167.09.29.', 'Description' => 'Tsaft', 'Description_Arr' => 'اتصافت', 'province_id' => 2],
            ['Code' => '02.113.05.19.', 'Description' => 'Zegzel', 'Description_Arr' => 'زكزل', 'province_id' => 1],
        ]);
    }
}