/*
==============================================================================
Parliamentary Service
==============================================================================
Script:     create_map.js
Purpose:     Functions for mapping electorate data and handling map interactions. 
             On the electorate profiles page.
------------------------------------------------------------------------------
Author:      Data Unit
==============================================================================
*/

// Configuration and constants
var currentElectorateMode = "general"; // initial/ automatic electorate mode is set to general
var selectedElectorateLayer = null; // variable to store the currently selected electorate layer
var electorateLayersByMode = {}; // object to store the electorate layers for each mode (general and Māori)
var electorateFillColour = "#91c99c";
var selectedElectorateFillColour = "#000000";
var unselectedFillOpacity = 1;
var selectedFillOpacity = 0.3;

// specifies which name property is used from the shape file for Maori and General electorates
var electorateModeConfig = {
  general: {
    geoJsonData: electorateData,
    propertyName: "GED2025__1"
  },
  maori: {
    geoJsonData: maoriElectorateData,
    propertyName: "MED2025__1"
  }
};

// sets the zoom and center values for outlier electorates
var manualElectorateZooms = {
  "Wellington Bays": { center: [-41.32, 174.76], zoom: 13 },
  "Te Tai Tonga": { center: [-43.6, 172.5], zoom: 6 }
};


// create the map instance
var zoom_electorate_map = L.map('zoom_electorate_map', { attributionControl: false }).setView([-41.3171455367748, 174.80021919902168], 12);
zoom_electorate_map.zoomControl.setPosition('topleft');


// Get the coordinates from the projected format to lat/lng format for Leaflet
function projectedToLatLng(coords) {
  return L.Projection.SphericalMercator.unproject(L.point(coords[0], coords[1]));
}

// Get the active electorate layer based on the current mode (general or Māori)
function getActiveElectorateLayer() {
  return electorateLayersByMode[currentElectorateMode];
}
 
// Get the property name for the current electorate mode (general or Māori)
function getActivePropertyName() {
  return electorateModeConfig[currentElectorateMode].propertyName;
}
 
// Build the electorate layer based on the selected mode (general or Māori)
// Creates a Leaflet GeoJSON layer with the appropriate styling and click event handling
function buildElectorateLayer(electorateMode) {
  var modeConfig = electorateModeConfig[electorateMode];
 
  return L.geoJSON(modeConfig.geoJsonData, {
    className: 'electorate-boundary',
    coordsToLatLng: projectedToLatLng,
    style: {
      fillColor: electorateFillColour,
      fillOpacity: 1
    },
    onEachFeature: function (feature, layer) {
      if (feature.properties && feature.properties[modeConfig.propertyName]) {
        layer.on("click", function () {
          selectElectorate(feature.properties[modeConfig.propertyName]);
        });
      }
    }
  });
}

// Get a list of all electorate names for the specified mode
function getElectorateNames(electorateMode) {
  var modeConfig = electorateModeConfig[electorateMode];
  var names = [];
 
  electorateLayersByMode[electorateMode].eachLayer(function (layer) {
    if (layer.feature && layer.feature.properties && layer.feature.properties[modeConfig.propertyName]) {
      names.push(layer.feature.properties[modeConfig.propertyName]);
    }
  });
 
  return names.sort();
}
 
// Zooming to the selected electorate
// Wellington Bays and Te Tai Tonga have manual zooms (as they look strange otherwise),
// for other electorates, zoom to the bounds of the selected electorate
function zoomToElectorate(electorateName) {
  if (manualElectorateZooms[electorateName]) {
    var override = manualElectorateZooms[electorateName];
    zoom_electorate_map.setView(override.center, override.zoom);
    return;
  }
 
  var matchedLayer = null; // Find the layer that matches the selected electorate
  var propertyName = getActivePropertyName(); // Get the property name based on the current mode (general or Māori)
 
  // Iterate through each layer in the active electorate layer to find the matching electorate
  getActiveElectorateLayer().eachLayer(function (layer) {
    if (layer.feature && layer.feature.properties && layer.feature.properties[propertyName] === electorateName) {
      matchedLayer = layer;
    }
  });
 
  // If a matching layer is found, zoom to its bounds with some padding
  if (matchedLayer) {
    zoom_electorate_map.fitBounds(matchedLayer.getBounds(), { padding: [20, 20] });
  }
}
 
// Highlight the selected electorate
function highlightDetailElectorate(electorateName) {
  if (selectedElectorateLayer) {
    selectedElectorateLayer.setStyle({ fillColor: electorateFillColour });
  }
 
  var propertyName = getActivePropertyName();
 
  getActiveElectorateLayer().eachLayer(function (layer) {
    if (layer.feature && layer.feature.properties && layer.feature.properties[propertyName] === electorateName) {
      layer.setStyle({ fillColor: selectedElectorateFillColour });
      selectedElectorateLayer = layer;
    }
  });
}

 
// Switch between electorates when the user changes the mode
function switchElectorateMode(electorateMode) {
  if (!electorateLayersByMode[electorateMode] || electorateMode === currentElectorateMode) {
    return;
  }
 
  if (selectedElectorateLayer) {
    selectedElectorateLayer.setStyle({ fillColor: electorateFillColour, fillOpacity: unselectedFillOpacity });
    selectedElectorateLayer = null;
  }
 
  zoom_electorate_map.removeLayer(electorateLayersByMode[currentElectorateMode]);
  currentElectorateMode = electorateMode;
  electorateLayersByMode[currentElectorateMode].addTo(zoom_electorate_map);
}
 
// Styling the map legend so it is clear and visible
var legend = L.control({ position: 'bottomright' });

legend.onAdd = function (map) {
    var legend_div = L.DomUtil.create('div', 'map-info map-legend'); //creates a div for the legend
    legend_div.innerHTML = '<h4>Area Key</h4>'; // Legend title
    var category_names = ['Electorate Boundary', 'Selected Electorate', 'Other Electorates']; // Names of the legend categories
    var color_key = ['#000000', '#000000', '#91c99c'];
 
    // for the categories, create a colored box and label for each category
    for (var i = 0; i < category_names.length; i++) {
        var legend_box = L.DomUtil.create('i', '', legend_div);
        if (i === 0) {
            legend_box.style.background = 'transparent';
            legend_box.style.border = '2px solid ' + color_key[i];
        } else {
            legend_box.style.background = color_key[i];
            legend_box.style.border = 'none';
        }
        // Add the legend item to the legend div
        legend_div.appendChild(document.createTextNode(' ' + category_names[i]));
        legend_div.appendChild(document.createElement('br'));
    }
    return legend_div;
};

// INITIALIZATION
electorateLayersByMode.general = buildElectorateLayer("general"); // Build the general electorate layer
electorateLayersByMode.maori = buildElectorateLayer("maori"); // Build the Māori electorate layer
electorateLayersByMode[currentElectorateMode].addTo(zoom_electorate_map); // Add the initial layer to the map
 
legend.addTo(zoom_electorate_map); // Add the legend to the map
 
// Add a scale bar to the map
L.control.scale({
    position: 'bottomleft',
    metric: true,
    imperial: false,
    maxWidth: 200
}).addTo(zoom_electorate_map);
 
// Ensure the map resizes correctly when the window is loaded
window.addEventListener("load", function () {
  zoom_electorate_map.invalidateSize();
});