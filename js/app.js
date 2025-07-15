// Nathan Schuelke
// 778 Final Project
// Dam Impact and Flood Risk Assessment




// Initialize the map
var map = L.map("map").setView([43.0, -89.5], 7); // Centered over Wisconsin

// Add a base map layer (OpenStreetMap)
// Define base maps
const osmBase = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap Contributors"
});

const satelliteBase = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
  attribution: "© Esri & contributors"
});

// Set default
osmBase.addTo(map);


/////////////////////////////////////////////////////////////////////////////
// Add a WMS layer for DEM (Digital Elevation Model) from Wisconsin DNR
const demLayer = L.esri.imageMapLayer({
  url: "https://dnrmaps.wi.gov/arcgis_image/rest/services/DW_Elevation/EN_DEM_from_LiDAR_Feet/ImageServer",
  opacity: 0.9,
  attribution: "WI DNR LiDAR DEM"
});


/////////////////////////////////////////////////////////////////////////////
function getRadius(zoom) {
  return Math.max(1.5, zoom * 0.3); // Adjust radius based on zoom level
}

/////////////////////////////////////////////////////////////////////////////
// Declare layer variables
let riversLayer, watershedsLayer, damsLayer;

// Load GeoJSON function
function loadGeoJSON(url, styleOptions, callback) {
  fetch(url)
    .then((response) => response.json())
    .then((data) => {
      const layer = L.geoJSON(data, {
        pointToLayer: function (feature, latlng) {
            return L.circleMarker(latlng, {
                radius: getRadius(map.getZoom()),
                color: styleOptions.color || "#000",
                fillColor: styleOptions.fillColor || styleOptions.color || "#000",
                fillOpacity: styleOptions.fillOpacity || 0.8,
                weight: styleOptions.weight || 1
            });
            },
        style: styleOptions,
        onEachFeature: function (feature, layer) {
          layer.bindPopup(feature.properties.Name || "No Name");
        }
      });

      if (callback) callback(layer);
    })
    .catch((error) => console.error("Error loading GeoJSON:", error));
}

/////////////////////////////////////////////////////////////////////////////
// Track when all layers are loaded
let layersLoaded = 0;

function checkAllLayersLoaded() {
  layersLoaded++;
  if (layersLoaded === 3) {
    const overlayMaps = {
      "Lakes & Rivers": riversLayer,
      "Watersheds": watershedsLayer,
      "Dams": damsLayer,
      "Elevation (LiDAR DEM)": demLayer
    };

    const baseMaps = {
  "OpenStreetMap": osmBase,
  "Satellite": satelliteBase
};

L.control.layers(baseMaps, overlayMaps, { collapsed: false }).addTo(map);
  }
}


/////////////////////////////////////////////////////////////////////////////
// Load each layer and check when done
loadGeoJSON("data/Lakes_Large_Rivers.geojson", { color: "#0077b6", weight: 2 }, function (layer) {
  riversLayer = layer;
  checkAllLayersLoaded();
});

loadGeoJSON("data/Watersheds.geojson", { color: "#34a853", weight: 1, fillOpacity: 0.2 }, function (layer) {
  watershedsLayer = layer;
  checkAllLayersLoaded();
});

loadGeoJSON("data/Wisconsin_Dams.geojson", { color: "#d22e2e", weight: 1, fillOpacity: 0.8 }, function (layer) {
  damsLayer = layer;
  checkAllLayersLoaded();
});


/////////////////////////////////////////////////////////////////////////////
map.on("zoomend", function () {
  if (damsLayer) {
    damsLayer.eachLayer(function (layer) {
      if (layer.setRadius) {
        layer.setRadius(getRadius(map.getZoom()));
      }
    });
  }
});


document.getElementById("bufferToolBtn").addEventListener("click", () => {
  map.once("click", (e) => {
    let clickedFeature = null;

    damsLayer.eachLayer((layer) => {
      if (layer.getLatLng().equals(e.latlng)) {
        clickedFeature = layer;
      }
    });

    if (clickedFeature) {
      const selectedDistance = parseFloat(document.getElementById("bufferDistance").value);

      if (!isNaN(selectedDistance) && selectedDistance > 0 && selectedDistance <= 20) {
        const clickedDamGeoJSON = clickedFeature.toGeoJSON();

        const buffer = turf.buffer(clickedDamGeoJSON, selectedDistance, { units: "kilometers" });

        L.geoJSON(buffer, {
          style: { color: "#ffa500", weight: 2, fillOpacity: 0.4 }
        }).addTo(map);
      } else {
        alert("Please enter a buffer distance between 1 and 20 km.");
      }
    } else {
      alert("Please click directly on a dam.");
    }
  });
});


/////////////////////////////////////////////////////////////////////////////
// Listen for when the user clicks the "Buffer Dam" button
document.getElementById("bufferToolBtn").addEventListener("click", () => {

  // Once the user clicks on the map, run this function once
  map.once("click", (e) => {
    let clickedFeature = null; // We'll store the clicked dam here

    // Loop through each dam feature in the layer
    damsLayer.eachLayer((layer) => {
      // Check if the clicked map location matches a dam location
      // (This uses exact coordinates; you can later improve with proximity detection)
      if (layer.getLatLng().equals(e.latlng)) {
        clickedFeature = layer;
      }
    });

    // If a dam was clicked...
    if (clickedFeature) {
      // Read the buffer distance the user entered in the input box (e.g., 5 or 10 km)
      const selectedDistance = parseFloat(document.getElementById("bufferDistance").value);

      // Validate the input: make sure it's a number between 1 and 20 km
      if (!isNaN(selectedDistance) && selectedDistance > 0 && selectedDistance <= 20) {
        // Convert the clicked dam to a GeoJSON object (needed for Turf.js)
        const damGeoJSON = clickedFeature.toGeoJSON();

        // Generate a buffer polygon around the dam using Turf.js
        const buffer = turf.buffer(damGeoJSON, selectedDistance, { units: "kilometers" });

        // Add the buffer polygon to the map and style it orange with some transparency
        L.geoJSON(buffer, {
          style: { color: "#ffa500", weight: 2, fillOpacity: 0.4 }
        }).addTo(map);
      } else {
        // Warn the user if they entered an invalid distance
        alert("Please enter a buffer distance between 1 and 20 km.");
      }

    } else {
      // If no dam was clicked (e.g., clicked empty space), show a message
      alert("Please click directly on a dam.");
    }
  });
});