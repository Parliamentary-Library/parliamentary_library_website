/*
==============================================================================
Parliamentary Service
==============================================================================
Script:      electorate_profiles.js
Purpose:     Delegates the electorate profile page functionality.
------------------------------------------------------------------------------
Author:      Data Unit
==============================================================================
*/

const { renderCategoryColumnChart, renderDonutChart } = window.ChartTools;
const electorateChartTooltip = window.TooltipTools.createTooltip({ placement: "auto" });
electorateChartTooltip.bind(document.body);


// POPUPS for stats nz descriptions
const { openPopup, createBulletList } = window.PopupText;
const { createElement } = window.UtilityHelpers;

function createSourceParagraph(sourceText, sourceUrl) {
  const sourceContent = sourceUrl
    ? createElement("a", { href: sourceUrl, target: "_blank", rel: "noopener", text: sourceText })
    : sourceText;
  return createElement("p", { class: "source" }, "Source: ", sourceContent);
}


const electorateInfoPopups = {
  gender: {
    title: "Gender",
    body: ["Gender refers to a person’s social and personal identity as male, female, or another gender or genders that may be non-binary.",
        createSourceParagraph("2023 Census, StatsNZ", "https://www.stats.govt.nz/2023-census/#data")
  ]
  },
 ethnicity: {
    title: "Ethnicity",
    body: [
      "Ethnicity is a measure of cultural affiliation. It is not a measure of race, ancestry, nationality, or citizenship. Ethnicity is self perceived and people can belong to more than one ethnic group.",
      "An ethnic group is made up of people who have some or all of the following characteristics:",
      createBulletList([
        "a common proper name",
        "one or more elements of common culture, for example religion, customs, or language",
        "unique community of interests, feelings, and actions",
        "a shared sense of common origins or ancestry, and",
        "a common geographic origin."
      ]),
      createSourceParagraph("2023 Census, StatsNZ", "https://www.stats.govt.nz/2023-census/#data")
    ]
  },
  highestqualification: {
    title: "Highest Qualification",
    body: [
      "Highest qualification is derived for people aged 15 years and over and combines highest secondary school qualification and post-school qualification to obtain a single highest qualification by category of attainment.",
      "A qualification is a formally recognised award for educational or training attainment. Formal recognition means that the qualification is approved by the New Zealand Qualifications Authority or any formally recognised existing approval body in New Zealand or overseas, or their predecessors or any previous approval body.",
      createSourceParagraph("2023 Census, StatsNZ", "https://www.stats.govt.nz/2023-census/#data")
    ]
  },
  householdcomposition: {
    title: "Household Composition",
    body: [
      "Household composition classifies households according to the relationships between usually resident people. The classification is based on how many and what type(s) of family nuclei were present in a household, and whether or not there were related or unrelated people present.",
      "A household is either one person who usually resides alone, or two or more people who usually reside together and share facilities (such as for eating, cooking, or a living area; and bathroom and toilet) in a private dwelling. Included are people who were absent on census night but usually live in a particular dwelling and are members of that household, as long as they were reported as being absent on the dwelling form or the household set-up form.",
      createSourceParagraph("2023 Census, StatsNZ", "https://www.stats.govt.nz/2023-census/#data")
    ]
  },

  individualHomeOwnership: {
    title: "Individual Home Ownership",
    body: [
      "Individual home ownership indicates whether a person aged 15 years and over owns (or partly owns) the dwelling they usually live in or holds it in a family trust.",
      "Individual home ownership provides information on home ownership at the individual level, that is, whether individual people own their home or not. This is different to tenure of household which provides information on home ownership at the household level, that is, whether one or more household members own their home or not.",
      createSourceParagraph("2023 Census, StatsNZ", "https://www.stats.govt.nz/2023-census/#data")
    ]
  },

  workandLabourForceStatus: {
    title: "Work and Labour Force Status",
    body: [
      "Work and labour force status classifies a person aged 15 years and over by their inclusion in or exclusion from the labour force.",
      "For an employed person, it distinguishes between full-time employment (30 hours or more per week) or part-time employment (fewer than 30 hours per week)",
      "A person who was not employed is classified as either ‘unemployed' or ‘not in the labour force'.",
      "Note that the definitions of 'employed', 'unemployed', and 'not in the labour force' are based on those of the International Labour Organization, as set down at the 13th International Conference of Labour Statisticians, 1982.",
      createSourceParagraph("2023 Census, StatsNZ", "https://www.stats.govt.nz/2023-census/#data")

    ]
  },

  occupation: {
    title: "Occupation",
    body: [
      "An occupation is a set of jobs that require the performance of similar or identical sets of tasks by employed people aged 15 years and over in their main job.",
      createSourceParagraph("2023 Census, StatsNZ", "https://www.stats.govt.nz/2023-census/#data")
    ]
  },

  industry: {
    title: "Industry",
    body: [
      "Industry is the type of activity undertaken by the organisation, enterprise, business, or unit of economic activity in which a person works in their main job.",
      createSourceParagraph("2023 Census, StatsNZ", "https://www.stats.govt.nz/2023-census/#data")
    ]
  },

   map: {
    title: "Electorate Map",
    body: ["The map is temporarily shown in a simplified format and is for general reference only. A full background map will be added shortly.",
      createSourceParagraph("2025 General Electorate Boundaries, StatsNZ", "https://datafinder.stats.govt.nz/layer/122741-general-electorates-2025")
    ]
  },

  mapMaori: {
    title: "Electorate Map",
    body: ["The map is temporarily shown in a simplified format and is for general reference only. A full background map will be added shortly.",
      createSourceParagraph("2025 Māori Electorate Boundaries, StatsNZ", "https://datafinder.stats.govt.nz/layer/122742-maori-electorates-2025/")
    ]
  }

};

document.addEventListener("click", function (clickEvent) {
  const informationElement = clickEvent.target.closest("[data-info]");
  if (!informationElement) { return; }
  const popupKey = informationElement.dataset.info === "map" && currentElectorateMode === "maori" ? "mapMaori" : informationElement.dataset.info;
  const popupContent = electorateInfoPopups[popupKey];
  if (popupContent) { openPopup(popupContent); }
});


// CHART CONFIGURATION
// Chart label sets switch based on the electorates being shown.
const ethnicityLabelsByElectorateMode = {
  general: ["European", "Māori", "Pacific Peoples", "Asian", "MEELA", "Other"],
  maori: ["Te Tai Tokerau/Tāmaki-makaurau", "Hauraki", "Waikato/Te Rohe Pōtae", "Te Arawa/Taupō", "Tauranga Moana/Mātaatua", "Te Tai Rāwhiti", "Te Matau-a-Māui/Wairarapa", "Taranaki", "Whanganui/Rangitīkei", "Manawatū/Horowhenua/Te Whanganui-a-Tara", "Te Waipounamu", "Rēkohu/Wharekauri", "Confederations and Waka, iwi not named", "Iwi named, region not known", "Hapū affiliated to more than one iwi", "Region known, iwi not named", "Don't know", "Not elsewhere included"]
};

const ethnicityChartConfig = {
  key: "ethnicity",
  divId: "ethnicityChart",
  colourName: "--cyan",
  labels: ethnicityLabelsByElectorateMode.general,
  rotateLabels: false
};

// Shared chart setup for each profile panel.
const electorateChartConfigs = [
  ethnicityChartConfig,
  {
    key: "age",
    divId: "ageChart",
    type: "donut",
    colours: ["--cyan", "--blue", "--yellow", "--coral"],
    labels: ["0-14", "15-29", "30-64", "65+"]
  },
  {
    key: "gender",
    divId: "genderChart",
    type: "donut",
    colours: ["--blue", "--yellow", "--coral"],
    labels: ["Male", "Female", "Another gender"]
  },
  {
    key: "qualification",
    divId: "qualificationChart",
    colourName: "--blue",
    rotateLabels: true,
    labels: ["No Qualification", "Level 1 Certificate", "Level 2 Certificate", "Level 3 Certificate", "Level 4 Certificate", "Level 5 Diploma", "Level 6 Diploma", "Bachelor degree", "Post-graduate", "Overseas secondary school qualification", "Not elsewhere included"]
  },
  {
    key: "householdComposition",
    divId: "householdCompositionChart",
    colourName: "--cyan",
    rotateLabels: false,
    labels: ["One-family household (with or without other people)", "Two-family household (with or without other people)", "Three or more family household (with or without other people)", "Other multi-person household", "One-person household", "Household composition unidentifiable"]
  },
  {
    key: "individualHomeOwnership",
    divId: "individualHomeOwnershipChart",
    colourName: "--blue",
    rotateLabels: false,
    labels: ["Hold in a family trust", "Own or partly own", "Do not own and do not hold in a family trust", "Not elsewhere included"]
  },
  {
    key: "workforceStatus",
    divId: "workforceStatusChart",
    colourName: "--cyan",
    rotateLabels: false,
    labels: ["Full-time", "Part-time", "Unemployed", "Not in labour force"]
  },
  {
    key: "occupation",
    divId: "occupationChart",
    colourName: "--blue",
    rotateLabels: true,
    labels: ["Managers", "Professionals", "Technicians and Trades Workers", "Community and Personal Service Workers", "Clerical and Administrative Workers", "Sales Workers", "Machinery Operators and Drivers", "Labourers"]
  },
  {
    key: "industry",
    divId: "industryChart",
    colourName: "--coral",
    rotateLabels: true,
    labels: ["Agriculture, Forestry and Fishing", "Mining", "Manufacturing", "Electricity, Gas, Water and Waste Services", "Construction", "Wholesale Trade", "Retail Trade", "Accommodation and Food Services", "Transport, Postal and Warehousing", "Information Media and Telecommunications", "Financial and Insurance Services", "Rental, Hiring and Real Estate Services", "Professional, Scientific and Technical Services", "Administrative and Support Services", "Public Administration and Safety", "Education and Training", "Health Care and Social Assistance", "Arts and Recreation Services", "Other Services"]
  }
];

// CHART DRAWING
function createPlaceholderData(labelCount) {
  return Array.from({ length: labelCount }, function () {
    return 0;
  });
}

// Draws one chart from its config and a list of percentage values.
// create functions to show the table and chart view and download as csv
function renderElectorateChart(chartConfig, chartValues) {
  const chartHostElement = document.getElementById(chartConfig.divId);
  const electorateName = document.getElementById("detail-map-electorate-name").textContent.trim();
  const filenameName = electorateName.charAt(0).toLocaleUpperCase("en-NZ") + electorateName.slice(1);
  
  const rows = chartConfig.labels.map((label, labelIndex) => ({
    label,
    value: chartValues[labelIndex] ?? 0,
    valueText: (chartValues[labelIndex] ?? 0) + "%",
    colour: "var(" + (chartConfig.type === "donut"
      ? chartConfig.colours[labelIndex] : chartConfig.colourName) + ")"
  }));

  if (chartConfig.type === "donut") {
    renderDonutChart(chartHostElement, rows, {
      ariaLabel: chartConfig.labels.join(", ") + " breakdown. Use the legend for the figures."
    });
  } else {
    renderCategoryColumnChart(chartHostElement, rows, {
      maximumValue: Math.min(Math.max.apply(null, chartValues.concat(0)) + 10, 100),
      formatValue: value => value + "%",
      rotateLabels: chartConfig.rotateLabels,
      ariaLabel: chartConfig.key + " percentages. Use the tooltips for the figures."
    });
  }

  window.TableTools.renderChartTableTools({
    id: chartConfig.divId,
    filename: `${filenameName}_${chartConfig.key}_2023.csv`,
    rows,
    columns: [
      { label: "Category", value: row => row.label },
      { label: "Percentage", isNumeric: true, value: row => row.valueText, csv: row => row.value }
    ]
  });
}

// Switch the ethnicity chart labels when the user changes between general and Māori electorates.
function setEthnicityChartMode(electorateMode) {
  const isMaoriMode = electorateMode === "maori";
  ethnicityChartConfig.key = isMaoriMode ? "iwiAffiliation" : "ethnicity";
  ethnicityChartConfig.labels = isMaoriMode ? ethnicityLabelsByElectorateMode.maori : ethnicityLabelsByElectorateMode.general;
  ethnicityChartConfig.rotateLabels = isMaoriMode;
  renderElectorateChart(ethnicityChartConfig, createPlaceholderData(ethnicityChartConfig.labels.length));
}

// Update each profile chart from the selected electorate data.
function updateElectorateCharts(profile) {
  electorateChartConfigs.forEach(function (chartConfig) {
    renderElectorateChart(chartConfig, profile[chartConfig.key] || createPlaceholderData(chartConfig.labels.length));
  });
}

// Build the initial placeholder charts so the page loads without empty divs.
electorateChartConfigs.forEach(function (chartConfig) {
  renderElectorateChart(chartConfig, createPlaceholderData(chartConfig.labels.length));
});

// CONSTANTS / STATE
// Census records for the electorate currently selected, keyed by electorate
// name. Populated by loadCensusDataForMode() whenever the mode changes.
let censusRecordsByElectorate = {};

// CSV source file for each electorate mode.
const censusSourceByElectorateMode = {
  general: "data/general_electorate_census_2023.csv",
  maori: "data/maori_electorate_census_2023.csv"
};

// DOM elements for each electorate mode's search/select combobox.
const electorateUiElementsByMode = {
  general: {
    container: document.getElementById("electorate-search-general"),
    combobox: document.getElementById("electorate-combobox-general"),
    select: document.getElementById("electorate-select-general"),
    searchInput: document.getElementById("electorate-search-input-general"),
    optionsList: document.getElementById("electorate-options-list-general"),
    searchClearButton: document.getElementById("electorate-search-clear-general")
  },
  maori: {
    container: document.getElementById("electorate-search-maori"),
    combobox: document.getElementById("electorate-combobox-maori"),
    select: document.getElementById("electorate-select-maori"),
    searchInput: document.getElementById("electorate-search-input-maori"),
    optionsList: document.getElementById("electorate-options-list-maori"),
    searchClearButton: document.getElementById("electorate-search-clear-maori")
  }
};

// CENSUS DATA LOADING
// Loads the CSV file for the given electorate mode, parses it, and populates
// censusRecordsByElectorate with the resulting stats for each electorate.
function loadCensusDataForMode(electorateMode) {
  return loadCensusData(censusSourceByElectorateMode[electorateMode])
    .then(function (censusData) {
      censusRecordsByElectorate = censusData;
    })
    .catch(function (error) {
      console.error("Unable to load census data.", error);
    });
}

// STAT TABS (Demographic / Work / Housing panels)
function activateTab(targetTabName) {
  const allTabButtons = document.querySelectorAll(".information-nav .nav-tab");
  const allTabPanels = document.querySelectorAll(".stat-panel");

  allTabButtons.forEach(function (tabButton) {
    tabButton.classList.toggle("is-active", tabButton.dataset.tabTarget === targetTabName);
  });

  allTabPanels.forEach(function (tabPanel) {
    tabPanel.classList.toggle("is-hidden", tabPanel.id !== "tab-" + targetTabName);
  });
}

// Wires up the tab buttons to switch between the panels.
document.querySelectorAll(".information-nav .nav-tab").forEach(function (tabButton) {
  tabButton.addEventListener("click", function () {
    if (tabButton.dataset.tabTarget) {
      activateTab(tabButton.dataset.tabTarget);
    }
  });
});

// DASHBOARD DISPLAY (filling in stats for the selected electorate)
// Sets the text content of all elements with a data-stat attribute matching the key.
function setValueText(key, value) {
  document.querySelectorAll('[data-stat="' + key + '"]').forEach(function (element) {
    element.textContent = value;
  });
}

// "Ethnicity" is labelled "Iwi Affiliation" when viewing Māori electorates.
function updateEthnicitySectionLabel(electorateMode) {
  var label = document.getElementById("ethnicity-section-label");
  if (label) {
    label.textContent = electorateMode === "maori" ? "Iwi Affiliation" : "Ethnicity";
  }
}

// Updates the dashboard with the relevant stats and classes for the electorate.
function updateDashboard(electorateName) {
  const profile = censusRecordsByElectorate[electorateName]; //get the stats for the selected electorate
  if (!profile) { return; } // if there are no stats available for this electorate
  const detailHeading = document.getElementById("detail-map-electorate-name"); // gets the heading panel
  const demographicPanelElectorateName = document.getElementById("panel-electorate-name-demographic");
  const housingPanelElectorateName = document.getElementById("panel-electorate-name-housing");
  const workPanelElectorateName = document.getElementById("panel-electorate-name-work");

  if (detailHeading) { detailHeading.textContent = electorateName; } // update heading panel with the electorate name
  if (demographicPanelElectorateName) { demographicPanelElectorateName.textContent = electorateName; } // update the demographic panel for the electorate
  if (housingPanelElectorateName) { housingPanelElectorateName.textContent = electorateName; } // update the housing panel for the electorate
  if (workPanelElectorateName) { workPanelElectorateName.textContent = electorateName; } // update the work panel for the electorate

  // update the dashboard statistics cards with the relevant values
  setValueText("totalPopulation", profile.totalPopulation);
  setValueText("medianAge", profile.medianAge);
  setValueText("schoolOrHigher", profile.schoolOrHigher);
  setValueText("degreeOrHigher", profile.degreeOrHigher);
  setValueText("meanRent", profile.meanRent || "—");
  setValueText("medianRent", profile.medianRent || "—");
  setValueText("meanIncome", profile.meanIncome || "—");
  setValueText("medianIncome", profile.medianIncome || "—");

  updateElectorateCharts(profile); // update the charts with the relevant electoratevalues
}



// ELECTORATE SELECTION
// retieve the UI elements for the active electorate
function getActiveElectorateUiElements() {
  return electorateUiElementsByMode[currentElectorateMode];
}

// Updates the UI components to reflect the selected electorate: including headings, dashboard and map.
function selectElectorate(electorateName) {
  const activeUiElements = getActiveElectorateUiElements();

  // Update the <select> value to match the selected electorate, if it doesn't already.
  if (activeUiElements.select && activeUiElements.select.value !== electorateName) {
    activeUiElements.select.value = electorateName;
  }

  updateDashboard(electorateName); // update the electorate dashboard
  zoomToElectorate(electorateName); // zoom to the selected electorate on the map
  highlightDetailElectorate(electorateName); // highlight the selected electorate on the map
  syncElectorateSearchInput(electorateName); // update the search input to match the selected electorate
}

// Updates the search input to match the selected electorate, if it doesn't already.
// makes sure the search clear button is visible if the search input has a value.
function syncElectorateSearchInput(electorateName) {
  const activeUiElements = getActiveElectorateUiElements();
  if (activeUiElements.searchInput) {
    activeUiElements.searchInput.value = electorateName;
    toggleElectorateSearchClearButton(activeUiElements);
  }
}

// ELECTORATE SEARCH / COMBOBOX
// Shows or hides the search clear button based on whether the search input has a value.
function toggleElectorateSearchClearButton(uiElements) {
  if (uiElements.searchClearButton) {
    uiElements.searchClearButton.classList.toggle("is-visible", uiElements.searchInput.value.length > 0);
  }
}

// Builds the dropdown list items from the (hidden) <select>'s <option>s.
function buildElectorateOptionsList(uiElements) {
  if (!uiElements.select || !uiElements.optionsList) {
    return;
  }
  Array.from(uiElements.select.options).forEach(function (option) {
    var listItem = document.createElement("li");
    listItem.textContent = option.textContent;
    listItem.dataset.value = option.value;
    listItem.setAttribute("role", "option");
    listItem.addEventListener("click", function () {
      selectElectorate(option.value);
      closeElectorateOptionsList(uiElements);
    });
    uiElements.optionsList.appendChild(listItem);
  });
}

// Filters the dropdown list items based on the search term, hiding those that don't match.
function filterElectorateOptionsList(uiElements, searchTerm) {
  var normalisedSearchTerm = searchTerm.trim().toLowerCase();
  Array.from(uiElements.optionsList.children).forEach(function (listItem) {
    var matches = listItem.textContent.toLowerCase().includes(normalisedSearchTerm);
    listItem.classList.toggle("is-hidden", !matches);
  });
}

// Opens the dropdown list of electorate options.
function openElectorateOptionsList(uiElements) {
  uiElements.optionsList.classList.add("is-open");
  uiElements.searchInput.setAttribute("aria-expanded", "true");
}

// Closes the dropdown list of electorate options.
function closeElectorateOptionsList(uiElements) {
  uiElements.optionsList.classList.remove("is-open");
  uiElements.searchInput.setAttribute("aria-expanded", "false");
}

// Wires up one mode's combobox: the underlying <select>, the search input,
// and the dropdown list of options it filters.
function setUpElectorateCombobox(uiElements) {
  if (uiElements.select) {
    uiElements.select.addEventListener("change", function () {
      selectElectorate(uiElements.select.value);
    });
  }
  // If the search input and options list exist, set up the filtering and opening/closing behavior.
  if (uiElements.searchInput && uiElements.optionsList) {
    buildElectorateOptionsList(uiElements);

    uiElements.searchInput.addEventListener("focus", function () {
      filterElectorateOptionsList(uiElements, uiElements.searchInput.value);
      openElectorateOptionsList(uiElements);
    }); // when search input is focused, filter the options list and open it

    uiElements.searchInput.addEventListener("input", function () {
      filterElectorateOptionsList(uiElements, uiElements.searchInput.value);
      openElectorateOptionsList(uiElements);
      toggleElectorateSearchClearButton(uiElements);
    }); // when the search input value changes, filter the options list, open it, and toggle the clear button

    document.addEventListener("click", function (event) {
      if (uiElements.combobox && !event.target.closest("#" + uiElements.combobox.id)) {
        closeElectorateOptionsList(uiElements);
      }
    });// when clicking outside the combobox, close the options list
  }

  // If the search clear button exists, set up its click behavior to clear the search input and reset the options list.
  if (uiElements.searchClearButton) {
    uiElements.searchClearButton.addEventListener("click", function () {
      uiElements.searchInput.value = "";
      filterElectorateOptionsList(uiElements, "");
      toggleElectorateSearchClearButton(uiElements);
      uiElements.searchInput.focus();
      openElectorateOptionsList(uiElements);
    });
  }
}
Object.values(electorateUiElementsByMode).forEach(setUpElectorateCombobox);

// ELECTORATE MODE SWITCHING (General vs Māori electorates)
// Shows or hides the relevant UI elements for the selected electorate mode.
function showElectorateUiForMode(electorateMode) {
  Object.keys(electorateUiElementsByMode).forEach(function (mode) {
    var uiElements = electorateUiElementsByMode[mode];
    if (uiElements.container) {
      uiElements.container.classList.toggle("is-hidden", mode !== electorateMode);
    }
  });
}
// Switches the current electorate mode and updates the UI accordingly.
document.querySelectorAll(".page-button[data-electorate-mode]").forEach(function (pageButton) {
  pageButton.addEventListener("click", function () {
    var electorateMode = pageButton.getAttribute("data-electorate-mode");
    if (electorateMode === currentElectorateMode) {
      return;
    }
    // Update the current mode and toggle the active class on the buttons.
    document.querySelectorAll(".page-button[data-electorate-mode]").forEach(function (otherButton) {
      otherButton.classList.toggle("is-active", otherButton === pageButton);
    });

    switchElectorateMode(electorateMode); // switch the electore mode
    showElectorateUiForMode(electorateMode); // update the UI for the selected mode
    setEthnicityChartMode(electorateMode); // swap the ethnicity and iwi affiliation chart data
    updateEthnicitySectionLabel(electorateMode); // update the label for the ethnicity/iwi affiliation section

    // Load the census data for the new mode, and default to the first electorate in the list
    loadCensusDataForMode(electorateMode).then(function () {
      var activeUiElements = getActiveElectorateUiElements();
      var firstElectorateName = activeUiElements.select && activeUiElements.select.options.length > 0
        ? activeUiElements.select.options[0].value
        : null;
      if (firstElectorateName) {
        selectElectorate(firstElectorateName);
      }
    });
  });
});


// INITIAL PAGE LOAD
showElectorateUiForMode(currentElectorateMode); //load the UI

//load the census data
loadCensusDataForMode(currentElectorateMode).then(function () {
  var activeUiElements = getActiveElectorateUiElements();
  if (activeUiElements.select && activeUiElements.select.value && censusRecordsByElectorate[activeUiElements.select.value]) {
    selectElectorate(activeUiElements.select.value);
  }
});