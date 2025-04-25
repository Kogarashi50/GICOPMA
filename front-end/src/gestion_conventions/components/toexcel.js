
// src/components/toexcel.js (or your correct path)

import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

/**
 * Exports an array of objects to an Excel file (.xlsx).
 * Assumes the keys of the first object in the data array are the desired column headers.
 *
 * @param {Array<Object>} data The array of row objects to export.
 * @param {string} [filename='export'] The desired filename (without the .xlsx extension).
 */
export default function toExcel(data = [], filename = 'export') {
  // 1. Check if data is valid
  if (!Array.isArray(data) || data.length === 0) {
    console.warn('Excel Export: No data provided or data is not an array.');
    // Optionally alert the user
    alert('Aucune donnée à exporter.');
    return; // Stop execution if no data
  }

  try {
    // 2. Convert the array of objects directly into a worksheet.
    //    `json_to_sheet` uses the keys of the first object as headers by default.
    const worksheet = XLSX.utils.json_to_sheet(data);

    // 3. Optional: Add basic auto-width (adjust column widths)
    //    This calculates width based on header length or a minimum of 10 characters.
    //    More sophisticated auto-fitting requires iterating through all data.
    const columnWidths = Object.keys(data[0] || {}).map(key => ({
        wch: Math.max(key?.length || 10, 10) // Header length or min 10
    }));
    worksheet['!cols'] = columnWidths;


    // 4. Create a new workbook
    const workbook = XLSX.utils.book_new();

    // 5. Append the worksheet to the workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1'); // Use a standard sheet name

    // 6. Generate the Excel file buffer
    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx', // Specify the file type
      type: 'array',    // Output type as ArrayBuffer
    });

    // 7. Create a Blob object from the buffer
    const excelBlob = new Blob([excelBuffer], {
      // Use the standard MIME type for modern Excel files
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8',
    });

    // 8. Trigger the download using file-saver
    saveAs(excelBlob, `${filename}.xlsx`);

  } catch (error) {
    // 9. Handle potential errors during the process
    console.error('Excel Export Error:', error);
    alert(`Une erreur s'est produite lors de la création du fichier Excel: ${error.message}`);
  }
}
