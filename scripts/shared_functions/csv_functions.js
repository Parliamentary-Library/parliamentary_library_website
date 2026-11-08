/*
==============================================================================
Parliamentary Service
==============================================================================
Script:      csv_functions.js
Purpose:     Provides functions for handling CSV data.
------------------------------------------------------------------------------
Author:      Data Unit
==============================================================================
*/

'use strict';
window.CsvTools = (() => {
  function parseCsvText(csvText) {
    const parsedRows = [];
    let currentRow = [];
    let currentField = '';
    let insideQuotes = false;

    const finishField = () => {
      currentRow.push(currentField.trim());
      currentField = '';
    };
    const finishRow = () => {
      finishField();
      parsedRows.push(currentRow);
      currentRow = [];
    };

    for (let characterIndex = 0; characterIndex < csvText.length; characterIndex++) {
      const character = csvText[characterIndex];
      if (insideQuotes) {
        if (character !== '"') currentField += character;
        else if (csvText[characterIndex + 1] === '"') {
          currentField += '"';
          characterIndex++;
        } else insideQuotes = false;
      } else if (character === '"') insideQuotes = true;
      else if (character === ',') finishField();
      else if (character === '\n' || character === '\r') {
        if (character === '\r' && csvText[characterIndex + 1] === '\n') characterIndex++;
        finishRow();
      } else currentField += character;
    }
    if (currentField.length > 0 || currentRow.length > 0) finishRow();

    return parsedRows.filter(row => row.length > 1 || row[0] !== '');
  }

  function escapeCsvField(fieldValue) {
    const fieldText = fieldValue == null ? '' : String(fieldValue);
    return /[",\n\r]/.test(fieldText) ? '"' + fieldText.replace(/"/g, '""') + '"' : fieldText;
  }

  function buildCsvText(columns, rows) {
    const headerLine = columns.map(column => escapeCsvField(column.label));
    const dataLines = rows.map(row => columns.map(column => escapeCsvField(column.csv(row))).join(','));
    return [headerLine.join(','), ...dataLines].join('\r\n');
  }

  function downloadTextFile(filename, fileText, mimeType = 'text/csv;charset=utf-8') {
    const downloadUrl = URL.createObjectURL(new Blob([fileText], { type: mimeType }));
    const downloadLink = Object.assign(document.createElement('a'), { href: downloadUrl, download: filename });
    document.body.append(downloadLink);
    downloadLink.click();
    downloadLink.remove();
    setTimeout(() => URL.revokeObjectURL(downloadUrl), 2000);
  }

  // download CSV, BUT KEEP the macrons e.g. Ōtāhuhu will download as Ōtāhuhu and not Otahuhu8
  const downloadCsv = (filename, columns, rows) => downloadTextFile(filename, "\uFEFF" + buildCsvText(columns, rows));


  async function loadCsvText(csvPath, embeddedCsvTextByPath = {}) {
    if (embeddedCsvTextByPath[csvPath]) return embeddedCsvTextByPath[csvPath];
    const response = await fetch(csvPath);
    if (!response.ok) throw new Error('Could not load ' + csvPath + ' (' + response.status + ')');
    return response.text();
  }

  const loadCsvRows = async (csvPath, embeddedCsvTextByPath) =>
    parseCsvText(await loadCsvText(csvPath, embeddedCsvTextByPath));

  return { parseCsvText, buildCsvText, downloadTextFile, downloadCsv, loadCsvText, loadCsvRows };
})();