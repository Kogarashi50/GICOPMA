<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>{{ $reportTitle }}</title>
    <style>
        /* --- Styles (keep the same CSS as the previous version) --- */
        @page { margin: 20mm 15mm 25mm 15mm; }
        body { font-family: 'Poppins', sans-serif; font-size: 9pt; line-height: 1.5;letter-spacing:1px; color: #333; }
        h1, h2, h3, h4 { font-weight: bold; margin-top: 1.1em; margin-bottom: 0.5em; color: #2c3e50; page-break-after: avoid; font-family:'Nunito', sans-serif; }
        h1 { font-size: 20pt; text-align: center; margin-bottom: 1.5em; }
        h2 { font-size: 16pt; border-bottom: 2px solid #3c3c3c; padding-bottom: 6px; margin-top: 25px; color:#3c3c3c; }
        h3 { font-size: 13pt; color:rgb(30, 30, 30); margin-top: 20px; border-bottom: 1px dashed #bdc3c7; padding-bottom: 4px;}
        h4 { font-size: 10pt; color:#6c757d; margin-top: 15px; font-weight: bold; margin-bottom: 8px; }
        .info-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; page-break-inside: avoid; }
        .info-table td { border: none; padding: 4px 0; vertical-align: top; word-wrap: break-word; }
        .info-table td:first-child { font-weight: bold; color: #555; width: 180px; padding-right: 10px; }
        .data-table { width: 100%; border-collapse: collapse; margin-bottom: 18px; font-size: 8pt; page-break-inside: avoid; }
        .data-table th, .data-table td { padding: 5px 7px; text-align: left; vertical-align: top; word-wrap: break-word; }
        .data-table th { background-color: #f5f5f5; font-weight: bold; color: #3c3c3c; white-space: nowrap; }
        .data-table tr:nth-child(even) td { background-color: #f5f5f5; }
        .data-table td{
            color:black;
            padding:5px
        
        }
        .data-table tr td:first-child, .data-table th:first-child {
  border-top-left-radius: 20px;
  border-bottom-left-radius: 20px;
}

.data-table tr td:last-child, .data-table th:last-child {
  border-top-right-radius: 20px;
  border-bottom-right-radius: 20px;
}
        .page-break { page-break-after: always; }
        .section { margin-bottom: 25px; }
        .item-container { margin-bottom: 25px; border-top: 1px solid #ddd; padding-top: 15px; page-break-inside: avoid; }
        .currency { text-align: right; white-space: nowrap; } .center { text-align: center; }
        .badge { display: inline-block; padding: 3px 8px; font-size: 8pt; font-weight: bold; line-height: 1; color: #fff; text-align: center; white-space: nowrap; vertical-align: baseline; border-radius: 10px; }
        .badge-success { background-color: #28a745; } .badge-primary { background-color: #0d6efd; } .badge-dark { background-color: #212529; } .badge-secondary { background-color: #6c757d; } .badge-danger { background-color: #dc3545; } .badge-warning { background-color: #ffc107; color: #000; } .badge-info { background-color: #0dcaf0; color: #000; } .badge-light { background-color: #f8f9fa; color: #000; border: 1px solid #dee2e6;}
        .text-muted { color: #6c757d; } .fst-italic { font-style: italic; }
        p { margin-top: 0.3em; margin-bottom: 0.8em; }
        .toc { margin: 20px 0 30px 0; padding: 15px; border: 1px solid #eee; background-color: #f9f9f9; }
        .toc h3 { margin-top: 0; margin-bottom: 15px; color:#3c3c3c; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
        .toc ul { list-style: none; padding-left: 0; margin-bottom: 0;} .toc li { margin-bottom: 8px; }
        .toc a { text-decoration: none; color:rgb(87, 87, 87); font-weight: bold; font-size: 10pt;}
        .info-table td strong{
            color:black
        }
        #footer { position: fixed; bottom: -20mm; left: 0; right: 0; height: 15mm; text-align: center; font-size: 8pt; color: #888; border-top: 0.5px solid #bdc3c7; padding-top: 5px; }
    </style>
</head>
<body>

    {{-- Footer Script --}}
    <script type="text/php">
        if (isset($pdf)) {
            $text = "GICOPMA Rapport - Généré le {{ $generationDate }} - Page {PAGE_NUM} / {PAGE_COUNT}";
            $font = $fontMetrics->getFont("DejaVu Sans", "normal"); $size = 8; $color = array(0.5, 0.5, 0.5);
            $textWidth = $fontMetrics->getTextWidth($text, $font, $size); $x = ($pdf->get_width() - $textWidth) / 2;
            $y = $pdf->get_height() - ($fontMetrics->getFontHeight($font, $size) + 30);
            $pdf->text($x, $y, $text, $font, $size, $color);
        }
    </script>

    {{-- 1. Title Page --}}
    <div style="text-align: center; margin-top: 40mm; margin-bottom: 30mm; page-break-after: always;">
        {{-- <img src="{{ public_path('img/logo.png') }}" alt="Logo" style="max-width: 150px; margin-bottom: 20px;"> --}}
        <h1 style="font-size: 24pt; color:rgb(255, 220, 48); margin-bottom: 5px;">GICOPMA</h1>
        <p style="font-size: 14pt; color:rgb(93, 93, 93); margin-bottom: 30px;">GESTION INTEGREE DES CONVENTIONS, PROJETS, MARCHES</p>
        <p style="font-size: 10pt; color:rgb(145, 145, 145);">Rapport Généré le: {{ $generationDate }}</p>
    </div>

    {{-- Table of Contents (Links unchanged) --}}
    <div class="toc">
        <h3>Table des Matières</h3>
        <ul>
            <li><a href="#conventions_section">I. Conventions ({{ count($conventions) }})</a></li>
            <li><a href="#projets_section">II. Projets ({{ count($projets) }})</a></li>
            <li><a href="#marches_section">III. Marchés Publics ({{ count($marches) }})</a></li>
        </ul>
    </div>
    <div class="page-break"></div>

    {{-- Helper function to get status badge --}}
    @php
    function getStatusBadge($statusValue, $statusStyles) {
        $style = $statusStyles[strtolower($statusValue ?? '')] ?? $statusStyles['default'];
        $text = $style['text']; $class = $style['badge-class'];
        $textColorStyle = ($class == 'badge-warning' || $class == 'badge-light' || $class == 'badge-info') ? 'color: #000;' : '';
        return "<span class=\"badge {$class}\" style=\"{$textColorStyle}\">{$text}</span>";
    }
    @endphp

    {{-- 2. Conventions Section --}}
    <div class="section">
        {{-- *** MODIFIED: Add id attribute to H2 *** --}}
        <h2 id="conventions_section">I. Conventions <span style="font-size:12px;color:grey">(nombre: {{ count($conventions) }})</span></h2>
        @forelse ($conventions as $conv)
            <div class="item-container">
                <h3>{{ $conv->Code }} - {{ $conv->Intitule ?? 'N/A' }}</h3>
                {{-- Rest of Convention details (using info-table, data-table, etc.) --}}
                 {{-- ... (keep the detailed content using tables from the previous correct version) ... --}}

                 <h4>A. Informations Générales & Statut</h4>
                <table class="info-table">
                    <tr><td><strong>Code:</strong></td><td>{{ $conv->Code ?? '-' }}</td></tr>
                    <tr><td><strong>Intitulé:</strong></td><td>{{ $conv->Intitule ?? '-' }}</td></tr>
                    <tr><td><strong>Référence:</strong></td><td>{{ $conv->Reference ?? '-' }}</td></tr>
                    <tr><td><strong>Année:</strong></td><td>{{ $conv->Annee_Convention ?? '-' }}</td></tr>
                    <tr><td><strong>Catégorie:</strong></td><td>{{ $conv->Categorie ?? '-' }}</td></tr>
                    <tr><td><strong>Class. Prov.:</strong></td><td>{{ $conv->Classification_prov ?? '-' }}</td></tr>
                    <tr><td><strong>Maitre Ouvrage:</strong></td><td>{{ $conv->Maitre_Ouvrage ?? '-' }}</td></tr>
                    <tr><td><strong>Statut:</strong></td><td>{!! getStatusBadge($conv->Statut, $statusStyles) !!}</td></tr>
                    <tr><td><strong>Operation.:</strong></td><td>{{ $conv->Operationalisation ?? '-' }}</td></tr>
                    <tr><td><strong>Groupe:</strong></td><td>{{ $conv->Groupe ?? '-' }}</td></tr>
                    <tr><td><strong>Rang:</strong></td><td>{{ $conv->Rang ?? '-' }}</td></tr>
                </table>

                <h4>B. Détails & Finances</h4>
                 <table class="info-table">
                    <tr><td><strong>Coût Global:</strong></td><td class="currency">{{ number_format($conv->Cout_Global ?? 0, 2, ',', ' ') }} MAD</td></tr>
                    <tr><td><strong>Coût Part CR:</strong></td><td class="currency">{{ number_format($conv->Cout_CR ?? 0, 2, ',', ' ') }} MAD</td></tr>
                    @php $totalVerseConv = $conv->convParts->flatMap->versements->sum('montant_verse'); @endphp
                    <tr><td><strong>Total Versé:</strong></td><td class="currency">{{ number_format($totalVerseConv, 2, ',', ' ') }} MAD</td></tr>
                 </table>
                 <div><strong>Objet:</strong> <p>{{ $conv->Objet ?? '-' }}</p></div>
                 <div><strong>Objectifs:</strong> <p>{{ $conv->Objectifs ?? '-' }}</p></div>

                <h4>C. Associations</h4>
                <table class="info-table">
                    <tr><td><strong>Localisation:</strong></td>
                        <td>
                            @php
                                $locIds = explode(';', $conv->localisation ?? ''); $locNames = [];
                                foreach($locIds as $locId) {
                                    if (trim($locId) && isset($provincesLookup[trim($locId)])) { $locNames[] = $provincesLookup[trim($locId)]; }
                                    elseif (trim($locId)) { $locNames[] = 'ID '.trim($locId); }
                                } echo count($locNames) > 0 ? implode(', ', $locNames) : '-';
                            @endphp
                        </td>
                    </tr>
                    <tr><td><strong>Programme:</strong></td><td>{{ $conv->programme->Description ?? 'N/A' }} ({{ $conv->Id_Programme ?? 'N/A' }})</td></tr>
                    <tr><td><strong>Projet Associé:</strong></td><td>{{ $conv->projet->Nom_Projet ?? 'Aucun' }} {{ $conv->projet ? '('.$conv->projet->Code_Projet.')' : '' }}</td></tr>
                </table>

                @if($conv->convParts && $conv->convParts->count() > 0)
                    <h4>D. Engagements Partenaires</h4>
                    <table class="data-table">
                        <thead><tr><th>Partenaire</th><th class="currency">Montant Convenu</th><th class="currency">Total Versé</th><th class="currency">Reste à Verser</th><th class="center">Signataire</th><th>Date Sig.</th><th>Détails Sig.</th></tr></thead>
                        <tbody>
                            @foreach ($conv->convParts as $cp)
                                @php
                                    $totalVersePartner = $cp->versements->sum('montant_verse');
                                    $montantConvenu = $cp->Montant_Convenu ?? 0;
                                    $resteAVerser = $montantConvenu - $totalVersePartner;
                                @endphp
                                <tr>
                                    <td>{{ $cp->partenaire->Description ?? 'N/A' }}</td>
                                    <td class="currency">{{ number_format($montantConvenu, 2, ',', ' ') }} MAD</td>
                                    <td class="currency">{{ number_format($totalVersePartner, 2, ',', ' ') }} MAD</td>
                                    <td class="currency">{{ number_format($resteAVerser, 2, ',', ' ') }} MAD</td>
                                    <td class="center">{{ $cp->is_signatory ? 'Oui' : 'Non' }}</td>
                                    <td>{{ $cp->date_signature ? \Carbon\Carbon::parse($cp->date_signature)->format('d/m/Y') : '-' }}</td>
                                    <td>{{ $cp->details_signature ?? '-' }}</td>
                                </tr>
                            @endforeach
                        </tbody>
                    </table>
                @else
                    <p class="text-muted fst-italic">Aucun engagement partenaire.</p>
                @endif

                @if($conv->documents && $conv->documents->count() > 0)
                    <h4>E. Fichiers Associés (Convention)</h4>
                     <table class="data-table"><thead><tr><th>Nom Fichier</th><th>Intitulé</th><th>Type</th></tr></thead><tbody>
                        @foreach ($conv->documents as $doc)
                        <tr><td>{{ $doc->file_name ?? '-' }}</td><td>{{ $doc->Intitule ?? '-' }}</td><td>{{ $doc->file_type ?? '-' }}</td></tr>
                        @endforeach
                    </tbody></table>
                @endif

                 @if($conv->avenants && $conv->avenants->count() > 0)
                    <h4>F. Avenants</h4>
                     <table class="data-table"><thead><tr><th>Numéro/Code</th><th>Objet</th><th>Date</th></tr></thead><tbody>
                         @foreach ($conv->avenants as $avenant)
                         <tr><td>{{ $avenant->numero ?? $avenant->id ?? '-' }}</td><td>{{ $avenant->objet ?? '-' }}</td><td>{{ $avenant->date_signature ?? $avenant->date ?? '-' }}</td></tr>
                         @endforeach
                     </tbody></table>
                 @endif


            </div>
            @if(!$loop->last)<hr style="border: none; border-top: 1px dashed #ccc; margin: 20px 0;">@endif
        @empty
            <p class="text-muted fst-italic">Aucune convention trouvée.</p>
        @endforelse
    </div>

    <div class="page-break"></div>

    {{-- 3. Projets Section --}}
    <div class="section">
        {{-- *** MODIFIED: Add id attribute to H2 *** --}}
        <h2 id="projets_section">II. Projets <span style="font-size:12px;color:grey">(nombre: {{ count($projets) }})</span></h2>
        @forelse ($projets as $proj)
            <div class="item-container">
                <h3>{{ $proj->Code_Projet }} - {{ $proj->Nom_Projet ?? 'N/A' }}</h3>
                {{-- Rest of Projet details --}}
                {{-- ... (keep the detailed content using tables from the previous correct version) ... --}}

                 <h4>A. Informations Générales & Associations</h4>
                <table class="info-table">
                    <tr><td><strong>Code Projet:</strong></td><td>{{ $proj->Code_Projet ?? '-' }}</td></tr>
                    <tr><td><strong>Nom Projet:</strong></td><td>{{ $proj->Nom_Projet ?? '-' }}</td></tr>
                    <tr><td><strong>Convention:</strong></td><td>{{ $proj->convention->Intitule ?? 'N/A' }} ({{ $proj->Convention_Code ?? 'N/A' }})</td></tr>
                    <tr><td><strong>Domaine:</strong></td><td>{{ $proj->domaine->Description ?? 'N/A' }}</td></tr>
                    <tr><td><strong>Programme:</strong></td><td>{{ $proj->programme->Description ?? 'N/A' }}</td></tr>
                    <tr><td><strong>Chantier:</strong></td><td>{{ $proj->chantier->Description ?? 'N/A' }}</td></tr>
                </table>

                 <h4>B. Timeline & Statut</h4>
                 <table class="info-table">
                     <tr><td><strong>Date Début:</strong></td><td>{{ $proj->Date_Debut ? \Carbon\Carbon::parse($proj->Date_Debut)->format('d/m/Y') : '-' }}</td></tr>
                     <tr><td><strong>Date Fin:</strong></td><td>{{ $proj->Date_Fin ? \Carbon\Carbon::parse($proj->Date_Fin)->format('d/m/Y') : '-' }}</td></tr>
                     <tr><td><strong>Av. Physique:</strong></td><td>{{ number_format($proj->Etat_Avan_Physi ?? 0, 1) }} %</td></tr>
                     <tr><td><strong>Av. Financier:</strong></td><td>{{ number_format($proj->Etat_Avan_Finan ?? 0, 1) }} %</td></tr>
                 </table>

                <h4>C. Synthèse Financière</h4>
                 @php
                    $totalEngageProjet = $proj->engagementsFinanciers->sum('montant_engage');
                    $totalVerseProjet = $proj->engagementsFinanciers->flatMap->versements->sum('montant_verse');
                    $coutProjetTotal = $proj->Cout_Projet ?? 0;
                    $resteAFinancer = $coutProjetTotal - $totalVerseProjet;
                 @endphp
                 <table class="info-table">
                     <tr><td><strong>Coût Projet Total:</strong></td><td class="currency">{{ number_format($coutProjetTotal, 2, ',', ' ') }} MAD</td></tr>
                     <tr><td><strong>Coût Part CRO:</strong></td><td class="currency">{{ number_format($proj->Cout_CRO ?? 0, 2, ',', ' ') }} MAD</td></tr>
                     <tr><td><strong>Total Engagé (Parts.):</strong></td><td class="currency">{{ number_format($totalEngageProjet, 2, ',', ' ') }} MAD</td></tr>
                     <tr><td><strong>Total Versé (Parts.):</strong></td><td class="currency">{{ number_format($totalVerseProjet, 2, ',', ' ') }} MAD</td></tr>
                     <tr><td><strong>Reste à Financer:</strong></td><td class="currency">{{ number_format($resteAFinancer, 2, ',', ' ') }} MAD</td></tr>
                 </table>

                 @if($proj->engagementsFinanciers && $proj->engagementsFinanciers->count() > 0)
                     <h4>D. Contributions Partenaires</h4>
                     <table class="data-table">
                         <thead><tr><th>Partenaire</th><th class="currency">Montant Engagé</th><th class="currency">Total Versé</th><th class="currency">Reste à Verser</th><th>Date Eng.</th><th class="center">Formalisé?</th><th>Commentaire</th></tr></thead>
                         <tbody>
                            @foreach ($proj->engagementsFinanciers as $engFin)
                                @php
                                    $totalVerseEng = $engFin->versements->sum('montant_verse');
                                    $montantEng = $engFin->montant_engage ?? 0;
                                    $resteAVerserEng = $montantEng - $totalVerseEng;
                                @endphp
                                <tr>
                                    <td>{{ $engFin->partenaire->Description ?? 'N/A' }}</td>
                                    <td class="currency">{{ number_format($montantEng, 2, ',', ' ') }} MAD</td>
                                    <td class="currency">{{ number_format($totalVerseEng, 2, ',', ' ') }} MAD</td>
                                    <td class="currency">{{ number_format($resteAVerserEng, 2, ',', ' ') }} MAD</td>
                                    <td>{{ $engFin->date_engagement ? \Carbon\Carbon::parse($engFin->date_engagement)->format('d/m/Y') : '-' }}</td>
                                    <td class="center">{{ $engFin->est_formalise ? 'Oui' : 'Non' }}</td>
                                    <td>{{ $engFin->commentaire ?? '-' }}</td>
                                </tr>
                             @endforeach
                         </tbody>
                     </table>
                 @else
                     <p class="text-muted fst-italic">Aucune contribution partenaire enregistrée.</p>
                 @endif

                 @php $allVersementsProjet = $proj->engagementsFinanciers->flatMap->versements; @endphp
                 @if($allVersementsProjet->count() > 0)
                    <h4>E. Détail des Versements (Projet)</h4>
                    <table class="data-table">
                         <thead><tr><th>Date</th><th class="currency">Montant</th><th>Partenaire</th><th>Méthode</th><th>Référence</th><th>Commentaire</th></tr></thead>
                         <tbody>
                             @foreach($allVersementsProjet as $vers)
                                 <tr>
                                     <td>{{ $vers->date_versement ? \Carbon\Carbon::parse($vers->date_versement)->format('d/m/Y') : '-' }}</td>
                                     <td class="currency">{{ number_format($vers->montant_verse ?? 0, 2, ',', ' ') }} MAD</td>
                                     <td>{{ $vers->engagementFinancier->partenaire->Description ?? 'N/A' }}</td>
                                     <td>{{ $vers->moyen_paiement ?? '-' }}</td>
                                     <td>{{ $vers->reference_paiement ?? '-' }}</td>
                                     <td>{{ $vers->commentaire ?? '-' }}</td>
                                 </tr>
                             @endforeach
                         </tbody>
                    </table>
                 @endif

                 <h4>F. Observations & Audit</h4>
                 <div><strong>Observations:</strong> <p>{{ $proj->Observations ?? '-' }}</p></div>
                 <table class="info-table">
                    <tr><td><strong>Créé le:</strong></td><td>{{ $proj->created_at ? $proj->created_at->format('d/m/Y H:i') : '-' }}</td></tr>
                    <tr><td><strong>Modifié le:</strong></td><td>{{ $proj->updated_at ? $proj->updated_at->format('d/m/Y H:i') : '-' }}</td></tr>
                 </table>

            </div>
            @if(!$loop->last)<hr style="border: none; border-top: 1px dashed #ccc; margin: 20px 0;">@endif
        @empty
            <p class="text-muted fst-italic">Aucun projet trouvé.</p>
        @endforelse
    </div>

     <div class="page-break"></div>

    {{-- 4. Marchés Section --}}
     <div class="section">
         {{-- *** MODIFIED: Add id attribute to H2 *** --}}
         <h2 id="marches_section">III. Marchés Publics <span style="font-size:12px;color:grey">(nombre: {{ count($marches) }})</span></h2>
         @forelse ($marches as $marche)
             <div class="item-container">
                 <h3>{{ $marche->numero_marche }} - {{ $marche->intitule ?? 'N/A' }}</h3>
                 {{-- Rest of Marché details --}}
                 {{-- ... (keep the detailed content using tables from the previous correct version) ... --}}

                 <h4>A. Informations Générales</h4>
                 <table class="info-table">
                     <tr><td><strong>Numéro:</strong></td><td>{{ $marche->numero_marche ?? '-' }}</td></tr>
                     <tr><td><strong>Intitulé:</strong></td><td>{{ $marche->intitule ?? '-' }}</td></tr>
                     <tr><td><strong>Type:</strong></td><td>{{ $marche->type_marche ?? '-' }}</td></tr>
                     <tr><td><strong>Convention:</strong></td><td>{{ $marche->convention->Intitule ?? '-' }}</td></tr>
                     <tr><td><strong>Statut:</strong></td><td>{!! getStatusBadge($marche->statut, $statusStyles) !!}</td></tr>
                     <tr><td><strong>Procédure:</strong></td><td>{{ $marche->procedure_passation ?? '-' }}</td></tr>
                     <tr><td><strong>Mode:</strong></td><td>{{ $marche->mode_passation ?? '-' }}</td></tr>
                     <tr><td><strong>Attributaire:</strong></td><td>{{ $marche->attributaire ?? '-' }}</td></tr>
                     <tr><td><strong>Source Financement:</strong></td><td>{{ $marche->source_financement ?? '-' }}</td></tr>
                 </table>

                <h4>B. Finances & Timeline</h4>
                 <table class="info-table">
                     <tr><td><strong>Budget Prév.:</strong></td><td class="currency">{{ number_format($marche->budget_previsionnel ?? 0, 2, ',', ' ') }} MAD</td></tr>
                     <tr><td><strong>Montant Attr.:</strong></td><td class="currency">{{ number_format($marche->montant_attribue ?? 0, 2, ',', ' ') }} MAD</td></tr>
                     <tr><td><strong>Date Pub.:</strong></td><td>{{ $marche->date_publication ? \Carbon\Carbon::parse($marche->date_publication)->format('d/m/Y') : '-' }}</td></tr>
                     <tr><td><strong>Date Lim. Offres:</strong></td><td>{{ $marche->date_limite_offres ? \Carbon\Carbon::parse($marche->date_limite_offres)->format('d/m/Y') : '-' }}</td></tr>
                     <tr><td><strong>Date Notif.:</strong></td><td>{{ $marche->date_notification ? \Carbon\Carbon::parse($marche->date_notification)->format('d/m/Y') : '-' }}</td></tr>
                     <tr><td><strong>Date Début Exe.:</strong></td><td>{{ $marche->date_debut_execution ? \Carbon\Carbon::parse($marche->date_debut_execution)->format('d/m/Y') : '-' }}</td></tr>
                     <tr><td><strong>Durée (j):</strong></td><td>{{ $marche->duree_marche ?? '-' }}</td></tr>
                 </table>

                 @if($marche->lots && $marche->lots->count() > 0)
                     <h4>C. Lots Associés</h4>
                     <table class="data-table">
                         <thead><tr><th>N° Lot</th><th>Objet</th><th class="currency">Montant Attribué</th><th>Attributaire</th><th>Fichiers</th></tr></thead>
                         <tbody>
                            @foreach ($marche->lots as $lot)
                                <tr>
                                    <td>{{ $lot->numero_lot ?? '-' }}</td>
                                    <td>{{ $lot->objet ?? '-' }}</td>
                                    <td class="currency">{{ number_format($lot->montant_attribue ?? 0, 2, ',', ' ') }} MAD</td>
                                    <td>{{ $lot->attributaire ?? '-' }}</td>
                                    <td>
                                        @if($lot->fichiersJoints->count() > 0)
                                            {{ $lot->fichiersJoints->pluck('nom_fichier')->implode(', ') }}
                                        @else - @endif
                                    </td>
                                </tr>
                             @endforeach
                         </tbody>
                     </table>
                 @endif

                  @if($marche->fichiersJointsGeneraux && $marche->fichiersJointsGeneraux->count() > 0)
                     <h4>D. Fichiers Généraux (Marché)</h4>
                      <table class="data-table"><thead><tr><th>Nom Fichier</th><th>Type</th></tr></thead><tbody>
                         @foreach ($marche->fichiersJointsGeneraux as $file)
                         <tr><td>{{ $file->nom_fichier ?? '-' }}</td><td>{{ $file->type_fichier ?? '-' }}</td></tr>
                         @endforeach
                     </tbody></table>
                  @endif


             </div>
             @if(!$loop->last)<hr style="border: none; border-top: 1px dashed #ccc; margin: 20px 0;">@endif
         @empty
             <p class="text-muted fst-italic">Aucun marché public trouvé.</p>
         @endforelse
     </div>

</body>
</html>