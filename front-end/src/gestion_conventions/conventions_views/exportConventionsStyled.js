// src/gestion_conventions/conventions_views/exportConventionsStyled.js

// DEFINITIVE VERSION: A highly advanced and styled Excel export that integrates ALL data fields
// into the professional, vertically-grouped report structure. It ensures zero data loss,
// intelligent grouping, and maximum readability with auto-sized row heights and rich text.
// Uses ExcelJS.

import axios from 'axios';
import { saveAs } from 'file-saver';

export async function exportConventionsStyled({ baseApiUrl, onError, onProgress }) {
    try {
        if (onProgress) onProgress('Démarrage de l\'export...');
        
        // 1. Fetch Comprehensive Data
        if (onProgress) onProgress('Récupération des données complètes...');
        const response = await axios.get(`${baseApiUrl}/conventions/export/data`, { withCredentials: true });
        const conventions = response.data?.conventions || [];
        
        if (conventions.length === 0) {
            alert('Aucune convention à exporter.');
            if (onProgress) onProgress('');
            return;
        }

        if (onProgress) onProgress('Analyse de la structure des données...');
        // Determine max number of annual engagements for dynamic columns
        let maxAnnualEngagements = 0;
        conventions.forEach(conv => {
            (conv.conv_parts || []).forEach(cp => {
                maxAnnualEngagements = Math.max(maxAnnualEngagements, (cp.engagements_annuels || []).length);
            });
        });
        maxAnnualEngagements = Math.min(maxAnnualEngagements, 5); // Cap at 5

        if (onProgress) onProgress('Initialisation du rapport Excel...');
        const ExcelJS = await import('exceljs');
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Rapport Détaillé des Conventions', {
            views: [{ state: 'frozen', ySplit: 2 }]
        });

        // --- Helper Functions ---
        const getPartnerName = p => p ? `${p.Code || ''} - ${p.Description_Arr || p.description || 'N/A'}`.trim() : '';
        const formatDate = d => d ? new Date(d) : null;
        const formatAmount = a => !isNaN(parseFloat(a)) ? parseFloat(a) : null;
        const richText = (label, value) => value ? [{ font: { bold: true, name: 'Calibri' }, text: `${label}: ` }, { font: { name: 'Calibri' }, text: String(value) }] : [{ font: { bold: true, name: 'Calibri' }, text: `${label}: ` }, { font: { name: 'Calibri' }, text: '-' }];

        // 2. Define and Style Hierarchical Headers
        if (onProgress) onProgress('Construction des en-têtes...');
        worksheet.getRow(1).height = 25;
        worksheet.getRow(2).height = 45;

        let headers = [
            { h1: 'Identification Convention', h2: 'Intitulé, Code & Type', key: 'identification', width: 55 },
            { h1: '', h2: 'Statut & Dates Clés', key: 'statusDates', width: 25 },
            { h1: '', h2: 'Programme & Projet', key: 'programProject', width: 45 },
            { h1: '', h2: 'Portée & Objectifs', key: 'scope', width: 55 },
            { h1: 'Partenaires & Engagements', h2: 'Partenaire & Type', key: 'partnerInfo', width: 45 },
            { h1: '', h2: 'Contribution (MDH)', key: 'partnerAmount', width: 20, format: '#,##0.00' },
        ];

        for (let i = 1; i <= maxAnnualEngagements; i++) {
            headers.push({ h1: '', h2: `Engagement Annuel ${i}`, key: `eng${i}`, width: 22 });
        }

        headers.push(
            { h1: 'Suivi Financier (Versements)', h2: 'Versement (Date, Montant, Moyen)', key: 'paymentInfo', width: 35 },
            { h1: 'Acteurs & Localisation', h2: 'Maîtres d\'Ouvrage (Principal & Délégués)', key: 'maitresOuvrage', width: 40 },
            { h1: '', h2: 'Communes', key: 'communes', width: 30 },
            { h1: 'Gouvernance & Suivi', h2: 'Comités & Cadence', key: 'governance', width: 40 },
            { h1: 'Documents', h2: 'Document', key: 'documentInfo', width: 40 },
            { h1: 'Observations', h2: 'Observations', key: 'observations', width: 55 }
        );

        worksheet.columns = headers.map(h => ({ key: h.key, width: h.width }));
        worksheet.getRow(1).values = headers.map(h => h.h1);
        worksheet.getRow(2).values = headers.map(h => h.h2);

        const partnerEndCol = 6 + maxAnnualEngagements;
        worksheet.mergeCells(1, 1, 1, 4);
        worksheet.mergeCells(1, 5, 1, partnerEndCol);
        worksheet.mergeCells(1, partnerEndCol + 1, 1, partnerEndCol + 1);
        worksheet.mergeCells(1, partnerEndCol + 2, 1, partnerEndCol + 3);
        worksheet.mergeCells(1, partnerEndCol + 4, 1, partnerEndCol + 4);
        worksheet.mergeCells(1, partnerEndCol + 5, 1, partnerEndCol + 5);
        worksheet.mergeCells(1, partnerEndCol + 6, 2, partnerEndCol + 6);

        const styleHeaderCell = (cell, color) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Calibri' };
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            cell.border = { top: { style: 'medium' }, left: { style: 'medium' }, bottom: { style: 'medium' }, right: { style: 'medium' } };
        };
        
        styleHeaderCell(worksheet.getCell(1, 1), 'FF002060'); // Identification
        styleHeaderCell(worksheet.getCell(1, 5), 'FF1E6C0A'); // Partenaires
        styleHeaderCell(worksheet.getCell(1, partnerEndCol + 1), 'FFE65100'); // Suivi Financier
        styleHeaderCell(worksheet.getCell(1, partnerEndCol + 2), 'FF5A2A82'); // Acteurs
        styleHeaderCell(worksheet.getCell(1, partnerEndCol + 4), 'FF7B1FA2'); // Gouvernance
        styleHeaderCell(worksheet.getCell(1, partnerEndCol + 5), 'FFC00000'); // Documents
        styleHeaderCell(worksheet.getCell(1, partnerEndCol + 6), 'FF5A5A5A'); // Observations

        worksheet.getRow(2).eachCell((cell) => {
            if (!cell.isMerged && cell.value) styleHeaderCell(cell, 'FF4472C4');
        });

        // 3. Process and Add Data in Vertical Blocks
        let currentDataRow = 3;
        conventions.forEach((conv, convIndex) => {
            if (onProgress) onProgress(`Traitement de la convention ${convIndex + 1}/${conventions.length}...`);

            const convParts = conv.conv_parts || [];
            const documents = conv.documents || [];
            const allPayments = convParts.flatMap(cp => (cp.versements || []).map(v => ({...v}))).sort((a,b) => new Date(a.date_versement) - new Date(b.date_versement));
            const maitresOuvrage = conv.maitres_ouvrage || [];
            const communes = conv.communes || [];

            const numRowsForConv = Math.max(convParts.length, allPayments.length, documents.length, maitresOuvrage.length, communes.length, 1);
            const startRow = currentDataRow;

            for (let i = 0; i < numRowsForConv; i++) {
                const partner = convParts[i] || {};
                const payment = allPayments[i] || {};
                const doc = documents[i] || {};
                const mo = maitresOuvrage[i] || {};
                const commune = communes[i] || {};
                
                let rowData = {
                    identification: { richText: [
                        { font: { bold: true, size: 12, name: 'Calibri' }, text: `${conv.Intitule || 'N/A'}\n` },
                        ...richText('Code', conv.Code), { text: '\n' },
                        ...richText('Type', `${conv.type || ''} / ${conv.sous_type || ''}`),
                    ]},
                    statusDates: { richText: [
                        ...richText('Statut', conv.Statut), { text: '\n' },
                        ...richText('Année', conv.Annee_Convention), { text: '\n' },
                        ...richText('Date Visa', formatDate(conv.date_visa)?.toLocaleDateString()),
                    ]},
                    programProject: { richText: [
                        ...richText('Programme', conv.programme?.Description), { text: '\n' },
                        ...richText('Projet', conv.projet?.Nom_Projet),
                    ]},
                    scope: { richText: [
                        ...richText('Coût Global', `${formatAmount(conv.Cout_Global)?.toLocaleString() || '-'} MDH`), { text: '\n' },
                        ...richText('Objet', conv.Objet),
                    ]},
                    governance: { richText: [
                        ...richText('Comité Pilotage', (conv.membres_comite_pilotage || []).join(', ')), { text: '\n' },
                        ...richText('Comité Technique', (conv.membres_comite_technique || []).join(', ')), { text: '\n' },
                        ...richText('Cadence', conv.cadence_reunion),
                    ]},
                    observations: conv.observations || '',
                    partnerInfo: partner.partenaire ? { richText: [
                        { font: { bold: true, name: 'Calibri' }, text: `${getPartnerName(partner.partenaire)}\n` },
                        ...richText('Type Eng.', partner.engagement_type?.nom),
                    ]} : '',
                    partnerAmount: formatAmount(partner.Montant_Convenu),
                    paymentInfo: payment.date_versement ? { richText: [
                        ...richText('Date', formatDate(payment.date_versement)?.toLocaleDateString()), { text: '\n' },
                        ...richText('Montant', `${formatAmount(payment.montant_verse)?.toLocaleString() || '-'} MDH`), { text: '\n' },
                        ...richText('Moyen', payment.moyen_paiement),
                    ]} : '',
                    maitresOuvrage: mo.nom ? { richText: [ ...richText(mo.type || 'MO', mo.nom) ] } : '',
                    communes: commune.Description || '',
                    documentInfo: doc.Intitule ? { richText: [
                        { font: { bold: true, name: 'Calibri' }, text: `${doc.Intitule}\n`},
                        ...richText('Fichier', doc.file_name),
                    ]} : '',
                };

                const engagements = partner.engagements_annuels || [];
                for (let j = 0; j < maxAnnualEngagements; j++) {
                    const eng = engagements[j];
                    rowData[`eng${j + 1}`] = eng ? { richText: [
                        ...richText(eng.annee, `${formatAmount(eng.montant_prevu)?.toLocaleString() || '-'} MDH`),
                    ]} : '';
                }

                worksheet.addRow(rowData);
            }

            const endRow = startRow + numRowsForConv - 1;

            const indicesToMerge = [1, 2, 3, 4, // Identification section
                                  partnerEndCol + 4, // Gouvernance
                                  partnerEndCol + 6]; // Observations
            indicesToMerge.forEach(colIndex => {
                 worksheet.mergeCells(startRow, colIndex, endRow, colIndex);
            });

            const bgColor = convIndex % 2 === 0 ? 'FFE7E6E6' : 'FFFFFFFF';
            for (let i = startRow; i <= endRow; i++) {
                const row = worksheet.getRow(i);
                row.height = 45;
                row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
                    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                    cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
                    
                    const headerDef = headers[colNumber - 1];
                    if (headerDef.format) {
                        cell.numFmt = headerDef.format;
                        cell.alignment.horizontal = 'right';
                    }
                });
            }
            worksheet.getRow(endRow).border = { ...worksheet.getRow(endRow).border, bottom: { style: 'medium' } };
            currentDataRow += numRowsForConv;
        });

        if (onProgress) onProgress('Finalisation et génération du fichier...');
        
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        saveAs(blob, `Rapport_Detaillé_Conventions_${timestamp}.xlsx`);

        if (onProgress) onProgress('Export terminé avec succès !');

    } catch (error) {
        console.error("Erreur détaillée lors de l'export Excel:", error);
        const errorMessage = error.response?.data?.message || error.message || 'Une erreur critique est survenue lors de la génération du rapport.';
        if (onError) onError(errorMessage);
        else alert(`Erreur: ${errorMessage}`);
    } finally {
        if (onProgress) onProgress('');
    }
}