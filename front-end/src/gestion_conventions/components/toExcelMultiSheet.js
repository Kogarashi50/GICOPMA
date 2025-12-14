// Enhanced Excel export utility supporting multiple sheets
// src/components/toExcelMultiSheet.js

import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

/**
 * Exports multiple data arrays to an Excel file with multiple sheets.
 * 
 * @param {Array<{name: string, data: Array<Object>}>} sheets Array of sheet objects with name and data
 * @param {string} filename The desired filename (without the .xlsx extension).
 */
export default function toExcelMultiSheet(sheets = [], filename = 'export') {
  // 1. Check if data is valid
  if (!Array.isArray(sheets) || sheets.length === 0) {
    console.warn('Excel Export: No sheets provided or sheets is not an array.');
    alert('Aucune donnée à exporter.');
    return;
  }

  try {
    // 2. Create a new workbook
    const workbook = XLSX.utils.book_new();

    // 3. Process each sheet
    sheets.forEach((sheet, index) => {
      const { name, data } = sheet;

      // Validate sheet data
      if (!Array.isArray(data) || data.length === 0) {
        console.warn(`Sheet "${name}" has no data, skipping...`);
        // Create an empty sheet with headers if data structure is available
        if (sheet.headers && Array.isArray(sheet.headers)) {
          const emptyData = [{}];
          sheet.headers.forEach(header => {
            emptyData[0][header] = '';
          });
          const worksheet = XLSX.utils.json_to_sheet(emptyData);
          // Set column widths
          if (sheet.columnWidths) {
            worksheet['!cols'] = sheet.columnWidths;
          }
          XLSX.utils.book_append_sheet(workbook, worksheet, name || `Sheet${index + 1}`);
        }
        return;
      }

      // 4. Convert data to worksheet
      const worksheet = XLSX.utils.json_to_sheet(data);

      // 5. Set column widths (auto-calculate or use provided widths)
      if (sheet.columnWidths && Array.isArray(sheet.columnWidths)) {
        worksheet['!cols'] = sheet.columnWidths;
      } else {
        // Auto-calculate column widths
        const columnWidths = Object.keys(data[0] || {}).map(key => {
          // Find the longest value in this column
          const maxLength = Math.max(
            key?.length || 10, // Header length
            ...data.map(row => {
              const value = row[key];
              return value ? String(value).length : 0;
            })
          );
          return { wch: Math.min(Math.max(maxLength + 2, 10), 50) }; // Min 10, max 50
        });
        worksheet['!cols'] = columnWidths;
      }

      // 6. Append sheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, name || `Sheet${index + 1}`);
    });

    // 7. Generate the Excel file buffer
    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array',
    });

    // 8. Create a Blob object from the buffer
    const excelBlob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8',
    });

    // 9. Trigger the download
    saveAs(excelBlob, `${filename}.xlsx`);

    console.log(`Excel file "${filename}.xlsx" exported successfully with ${sheets.length} sheet(s).`);

  } catch (error) {
    console.error('Excel Export Error:', error);
    alert(`Une erreur s'est produite lors de la création du fichier Excel: ${error.message}`);
  }
}

