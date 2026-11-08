/*
==============================================================================
Parliamentary Service
==============================================================================
Script:      load_census_data.js
Purpose:     Functions for processing census data for electorate profiles.
------------------------------------------------------------------------------
Author:      Data Unit
==============================================================================
*/

// Parse CSV data.
// Ensures that commas within quotes are not treated as field separators
// Returns an array of rows, where each row is an array of fields
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  // Iterate through each character in the CSV text
  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    // If inside a quoted field,handle quotes and commas by 
    // adding them to the field or toggling the inQuotes state
    // Else, if not in quotes, handle commas and newlines by
    // adding the field to the row or starting a new row
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field.trim());        
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") {
        i++;
      }
      row.push(field.trim());        
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  // Handle the last field and row if the CSV does not end with a newline
  if (field.length > 0 || row.length > 0) {
    row.push(field.trim());          
    rows.push(row);
  }

  // Filter out any empty rows that may have been created due to extra newlines in the CSV
  // Ensures that only rows with actual data are returned
  return rows.filter(function (parsedRow) {
    return parsedRow.length > 1 || parsedRow[0] !== "";
  });
}

// Build column groups based on the category row
function buildColumnGroups(categoryRow) {
  const groups = [];
  let currentCategory = null;
  let start = -1;

  // Iterate through the category row to identify groups of columns that belong to the same category
  // When a new category is encountered, the previous group is finalized and added to the groups array
  // Allows for dynamic grouping of columns based on the category names in the CSV
  for (let i = 1; i < categoryRow.length; i++) {
    const category = categoryRow[i];
    if (category !== currentCategory) {
      if (currentCategory !== null) {
        groups.push({ category: currentCategory, start: start, end: i - 1 });
      }
      currentCategory = category;
      start = i;
    }
  }

  // Finalize the last group if there is one
  if (currentCategory !== null) {
    groups.push({ category: currentCategory, start: start, end: categoryRow.length - 1 });
  }
  return groups;
}

// Extract values for a specific group from a data row
function extractGroupValues(dataRow, group) {
  if (!group) {
    return [];
  }
  const values = [];

  // Iterate through the specified range of columns for the group and convert the values to numbers
  // Handles cases where the value may be missing or not a number by defaulting to 0
  for (let i = group.start; i <= group.end; i++) {
    const rawValue = dataRow[i].replace(/,/g, "");
    values.push(Number(rawValue) || 0);
  }
  return values;
}

// Helper function to convert raw values to percentages
function toGroupPercentages(values) {
  const total = values.reduce(function (sum, value) { return sum + value; }, 0); // total sum of the group values
  
  // if the total is 0, return an array of 0s to avoid division by zero
  if (total === 0) {
    return values.map(function () { return 0; });
  }
  // ELSE: calculate the percentage for each value in the group 
  // Round to one decimal place
  return values.map(function (value) {
    return Math.round((value / total) * 1000) / 10;
  });
}

// Build electorate statistics from the parsed CSV rows
function buildElectorateStats(rows) {
  const categoryRow = rows[0];
  const groups = buildColumnGroups(categoryRow);
  const groupByCategory = {};
  const stats = {};

  // Create a mapping of category names to their corresponding group objects
  groups.forEach(function (group) {
    groupByCategory[group.category] = group;
  });

  // Iterate through the census file (starting from row 2) 
  for (let r = 2; r < rows.length; r++) {
    const dataRow = rows[r];
    if (!dataRow[0]) {
      continue;
    }

    // extract the relevant values from each category and assign them to a constant for the stats object
    const electorateName = dataRow[0];
    const ageCounts = extractGroupValues(dataRow, groupByCategory.AGE);
    const totalPopulation = ageCounts.reduce(function (sum, value) { return sum + value; }, 0);
    const agePct = toGroupPercentages(ageCounts);
    const qualificationCounts = extractGroupValues(dataRow, groupByCategory.HIGHEST_QUALIFICATION);
    const qualificationTotal = qualificationCounts.reduce(function (sum, value) { return sum + value; }, 0);
    const schoolOrHigher = qualificationTotal > 0
      ? Math.round(((qualificationTotal - qualificationCounts[0]) / qualificationTotal) * 1000) / 10
      : null; //add mutltiple rows together before calculating the percentage.
    const degreeOrHigher = qualificationTotal > 0
      ? Math.round((qualificationCounts.slice(4, 9).reduce((a, b) => a + b, 0) / qualificationTotal) * 1000) / 10
      : null; //add mutltiple rows together before calculating the percentage.
    const incomeValues = extractGroupValues(dataRow, groupByCategory.INCOME);
    const rentValues = extractGroupValues(dataRow, groupByCategory.RENT);

    // stats object for each electorate, with the relevant values extracted from the census file
    // if no value exists use "—" to indicate missing data
    stats[electorateName] = {
      totalPopulation: totalPopulation.toLocaleString(),
      medianAge: "—",
      degreeOrHigher: degreeOrHigher !== null ? degreeOrHigher + "%" : "—",
      schoolOrHigher: schoolOrHigher !== null ? schoolOrHigher + "%" : "—",
      meanRent: rentValues[0] ? "$" + rentValues[0].toLocaleString() : "—",
      medianRent: rentValues[1] ? "$" + rentValues[1].toLocaleString() : "—",
      meanRentNZ: "—",
      meanIncome: incomeValues[0] ? "$" + incomeValues[0].toLocaleString() : "—",
      medianIncome: incomeValues[1] ? "$" + incomeValues[1].toLocaleString() : "—",
      meanIncomeNZ: "—",
      age: toGroupPercentages(extractGroupValues(dataRow, groupByCategory.AGE)),
      ethnicity: toGroupPercentages(extractGroupValues(dataRow, groupByCategory.ETHNICITY)),
      iwiAffiliation: toGroupPercentages(extractGroupValues(dataRow, groupByCategory.IWI_AFFILIATION)),
      gender: toGroupPercentages(extractGroupValues(dataRow, groupByCategory.GENDER)),
      qualification: toGroupPercentages(qualificationCounts),
      householdComposition: toGroupPercentages(extractGroupValues(dataRow, groupByCategory.HH_COMPOSTION)),
      individualHomeOwnership: toGroupPercentages(extractGroupValues(dataRow, groupByCategory.HOME_OWNERSHIP)),
      workforceStatus: toGroupPercentages(extractGroupValues(dataRow, groupByCategory.LABOUR_FORCE_STATUS)),
      occupation: toGroupPercentages(extractGroupValues(dataRow, groupByCategory.OCCUPATION)),
      industry: toGroupPercentages(extractGroupValues(dataRow, groupByCategory.INDUSTRY))
    };
  }
  return stats;
}

// INITIALISATION
// Load census data from a CSV file and build electorate statistics
function loadCensusData(csvPath) {
  const embeddedCsvText = window.CENSUS_CSV_TEXT && window.CENSUS_CSV_TEXT[csvPath];
  const csvTextPromise = embeddedCsvText
    ? Promise.resolve(embeddedCsvText)
    : fetch(csvPath).then(function (response) {
        if (!response.ok) {
          throw new Error("Could not load " + csvPath + " (" + response.status + ")");
        }
        return response.text();
      });

  return csvTextPromise.then(function (text) {
    return buildElectorateStats(parseCsv(text));
  });
}