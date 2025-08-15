// Nathan Schuelke
// 778 Final Project
// Dam Impact and Flood Risk Assessment



// Esri API Key for elevation service
const esriApiKey = "AAPTxy8BH1VEsoebNVZXo8HurA_2jA8sPPf_DuV7jRLl5PwtnXSU0EiBd11SD4M-Bxw0hCcLfTFwvO8qMU69LnIuTXBc20px1QrO2YvAWh7qW4shtxgRBGkvOKbSUxG1UlsSq_rjYNW_BU84JuypUijxgbvAm3J6aFLqyZGnWiBq7w9CtuCohALUyjkCrONoQ-r1P_V8vvLTifb8V0eWMt4rGV0IiA4QE-WtX_zxA8uL3jaikZCbKD6Gd0xtXh9N9zn6AT1_agURHDlj"; 


//////Initialize the map and Base Layers/////////////////////////////////////
var map = L.map("map").setView([48.0, -89.5], 7); // Centered over Wisconsin

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



//////RADIUS SCALING FOR DAMS////////////////////////////////////////////////
function getRadius(zoom) {
  return Math.max(1.5, zoom * 0.3); // Adjust radius based on zoom level
}



console.log("Raster plugin available:", typeof L.esri.identifyImage);

/////////////////////////////////////////////////////////////////////////////
// Declare layer variables
let riversLayer;
let watershedsLayer;
let damsLayer;
let bufferLayer = null;
let schoolLayerGroup = L.layerGroup();
let hospitalsLayer;
let parcelLayer = L.layerGroup().addTo(map);
let elevationPoints = [];
let elevationMarkers = [];
let parcelGeoJSON;
let layersLoaded = 0;

/////////////////////////////////////////////////////////////////////////////
// Popup generator for all layers (multi-source name support)
function makePopup(properties) {
  const name =
    properties.SCHOOL ||
    properties.FACILITY_NAME ||
    properties.WSHED_NAME ||
    properties.OFFICIAL_NAME;

  if (name) {
    return `<strong>${name}</strong>`;
  }

  return `<em>No name available</em>`;
}

/////////////////////////////////////////////////////////////////////////////
// Function to load a GeoJSON file and apply styling and popup logic
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
          layer.bindPopup(makePopup(feature.properties));
        }
      });

      if (callback) callback(layer);
    })
    .catch((error) => console.error("Error loading GeoJSON:", error));
}

/////////////////////////////////////////////////////////////////////////////
// Load each layer and check when done

// Lakes & Large Rivers
loadGeoJSON("data/Lakes_Large_Rivers.geojson", { color: "#0077b6", weight: 2 }, function (layer) {
  riversLayer = layer;
  checkAllLayersLoaded();
});

// Watersheds
loadGeoJSON("data/Watersheds.geojson", {
  color: "#34a853",
  weight: 1,
  fillOpacity: 0.2
}, function (layer) {
  watershedsLayer = layer;
  checkAllLayersLoaded();
});

// Dams
loadGeoJSON("data/Wisconsin_Dams.geojson", {
  color: "#d22e2e",
  weight: 1,
  fillOpacity: 0.8,
  onEachFeature: function () {
    // No popup for dams
  }
}, function (layer) {
  damsLayer = layer;
  checkAllLayersLoaded();
});

// Public Schools
loadGeoJSON("data/PublicSchools.geojson", {
  color: "#1e90ff",
  radius: 2,
  fillOpacity: 0.7,
  onEachFeature: function (feature, layer) {
    feature.properties.school_type = "Public";
    layer.bindPopup(makePopup(feature.properties));
  }
}, function (layer) {
  layer.eachLayer(l => schoolLayerGroup.addLayer(l));
  checkAllLayersLoaded();
});

// Private Schools
loadGeoJSON("data/PrivateSchools.geojson", {
  color: "#1e90ff",
  radius: 2,
  fillOpacity: 0.7,
  onEachFeature: function (feature, layer) {
    feature.properties.school_type = "Private";
    layer.bindPopup(makePopup(feature.properties));
  }
}, function (layer) {
  layer.eachLayer(l => schoolLayerGroup.addLayer(l));
  checkAllLayersLoaded();
});

// Hospitals
loadGeoJSON("data/WisconsinHospitals.geojson", {
  color: "#ffa500",
  radius: 2,
  fillOpacity: 0.7
}, function (layer) {
  hospitalsLayer = layer;
  checkAllLayersLoaded();
});

const demLayer = L.esri.imageMapLayer({
  url: "https://dnrmaps.wi.gov/arcgis_image/rest/services/DW_Elevation/EN_DEM_from_LiDAR_Feet/ImageServer",
  opacity: 0.9,
  attribution: "WI DNR LiDAR DEM"
});
demLayer.on("load", () => {
  checkAllLayersLoaded();
});
checkAllLayersLoaded();

/////////////////////////////////////////////////////////////////////////////
// Function to check if all layers are loaded
function checkAllLayersLoaded() {
  layersLoaded++;
  if (layersLoaded === 7) {
    const overlayMaps = {
      "Lakes & Rivers": riversLayer,
      "Watersheds": watershedsLayer,
      "Dams": damsLayer,
      "Schools": schoolLayerGroup,
      "Hospitals": hospitalsLayer,
      "Parcels (Buffer Results)": parcelLayer,
      "Elevation (LiDAR DEM)": demLayer,
      
    };

    const baseMaps = {
  "OpenStreetMap": osmBase,
  "Satellite": satelliteBase
};

L.control.layers(baseMaps, overlayMaps, { collapsed: false }).addTo(map);
  }
}




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

function isCloseEnough(clickLatLng, layerLatLng, thresholdMeters = 20) {
  return clickLatLng.distanceTo(layerLatLng) <= thresholdMeters;
}






// Clear Results Button Logic
document.addEventListener("DOMContentLoaded", () => {
  const clearBtn = document.getElementById("clearResultsBtn");

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      // Clear buffer layer
      if (bufferLayer && map.hasLayer(bufferLayer)) {
        map.removeLayer(bufferLayer);
      }
      bufferLayer = null;

      // Clear parcel layer group
      if (parcelLayer && map.hasLayer(parcelLayer)) {
        map.removeLayer(parcelLayer);
      }
      parcelLayer.clearLayers();

      // Clear elevation markers
      elevationMarkers.forEach(marker => map.removeLayer(marker));
      elevationMarkers = [];

      // Reset elevation points
      points = [];

      // Close any open popups
      map.closePopup();

      // Clear results table
      const resultsTableBody = document.querySelector("#resultsTable tbody");
      if (resultsTableBody) {
        resultsTableBody.innerHTML = "";
      }

      console.log("All results cleared: buffer, parcels, elevation, and table.");
    });
  } else {
    console.warn("Clear Results button not found in DOM.");
  }
});



/////////////////////////////////////////////////////////////////////////////
// Display Parcel Summary in Table
function displayParcelSummary(features, schoolsInBuffer = 0, hospitalsInBuffer = 0) {
  let totalValue = 0;
  let totalAcres = 0;

  features.forEach((feature) => {
    const props = feature.properties;

    const value = parseFloat(props.ESTFMKVALUE);
    const acres = parseFloat(props.GISACRES);

    if (!isNaN(value)) totalValue += value;
    if (!isNaN(acres)) totalAcres += acres;
  });

  const tbody = document.querySelector("#resultsTable tbody");
  tbody.innerHTML = ""; // Clear all rows

  const row = document.createElement("tr");
  tbody.innerHTML = ""; // Clear all rows

  const valueRow = document.createElement("tr");
  valueRow.innerHTML = `
    <td><strong>Total Market Value</strong></td>
    <td>${totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
  `;
  tbody.appendChild(valueRow);

  const acresRow = document.createElement("tr");
  acresRow.innerHTML = `
    <td><strong>Total Acres</strong></td>
    <td>${totalAcres.toFixed(2)}</td>
  `;
  tbody.appendChild(acresRow);

  const schoolsRow = document.createElement("tr");
  schoolsRow.innerHTML = `
    <td><strong>Schools in Buffer</strong></td>
    <td>${schoolsInBuffer}</td>
  `;
  tbody.appendChild(schoolsRow);

  const hospitalsRow = document.createElement("tr");
  hospitalsRow.innerHTML = `
    <td><strong>Hospitals in Buffer</strong></td>
    <td>${hospitalsInBuffer}</td>
  `;
  tbody.appendChild(hospitalsRow);


//////BUFFER TOOL WITH PARCEL QUERY///////////////////////////

// Global layer for cleanup
window.bufferLayer = null;


// Listen for "Buffer Dam" button click
document.getElementById("bufferToolBtn").addEventListener("click", () => {
  map.once("click", (e) => {
    let clickedFeature = null;

    // Check if user clicked near a dam
    damsLayer.eachLayer((layer) => {
      if (isCloseEnough(e.latlng, layer.getLatLng())) {
        clickedFeature = layer;
      }
    });

    if (clickedFeature) {
      const distance = parseFloat(document.getElementById("bufferDistance").value);

      if (!isNaN(distance) && distance > 0 && distance <= 20) {
        const damGeoJSON = clickedFeature.toGeoJSON();

        // Create buffer polygon using Turf.js
        const buffer = turf.buffer(damGeoJSON, distance, { units: "kilometers" });

        // Remove previous buffer and parcels
        if (bufferLayer) map.removeLayer(bufferLayer);
        if (parcelLayer) map.removeLayer(parcelLayer);

        // Add buffer to map
        bufferLayer = L.geoJSON(buffer, {
          style: { color: "#ffa500", weight: 2, fillOpacity: 0.4 }
        }).addTo(map);

        // Count hospitals and schools inside buffer
        let hospitalsInBuffer = 0;
        let schoolsInBuffer = 0;

        hospitalsLayer.eachLayer((layer) => {
          const point = layer.toGeoJSON();
          if (turf.booleanPointInPolygon(point, buffer)) {
            hospitalsInBuffer++;
          }
        });

        schoolLayerGroup.eachLayer((layer) => {
          const point = layer.toGeoJSON();
          if (turf.booleanPointInPolygon(point, buffer)) {
            schoolsInBuffer++;
          }
        });

        // Query parcels that intersect the buffer
        L.esri.query({
          url: "https://services3.arcgis.com/n6uYoouQZW75n5WI/arcgis/rest/services/Wisconsin_Statewide_Parcels/FeatureServer/0"
        })
        .intersects(buffer)
        .run((err, featureCollection) => {
          if (err) {
            console.error("Parcel query error:", err);
            return;
          }

          parcelLayer = L.geoJSON(featureCollection, {
            style: { color: "#008000", weight: 1, fillOpacity: 0.2 },
            onEachFeature: function (feature, layer) {
              const props = feature.properties;
              layer.bindPopup(`Parcel ID: ${props.PARCELID || "N/A"}`);
            }
          }).addTo(map);

          console.log("Parcels found:", featureCollection.features.length);

          // Log GISACRES values for debugging
          featureCollection.features.forEach((feature) => {
            const props = feature.properties;
            console.log("GISACRES raw value:", props.GISACRES);
          });

          // Display summary table
          displayParcelSummary(featureCollection.features, schoolsInBuffer, hospitalsInBuffer);
        });

      } else {
        alert("Enter a buffer distance between 1 and 20 km.");
      }

    } else {
      alert("Click directly on a dam.");
    }
  });
});





////// ELEVATION TOOL //////////////////////////////////////////////////
document.getElementById("elevationToolBtn").addEventListener("click", () => {
  let points = [];

  alert("Click two points on the map to compare elevation.");

  const clickHandler = async function (e) {
    const { lat, lng } = e.latlng;

    // ✅ Use Open-Elevation API (no proxy needed)
    const url = `https://api.open-elevation.com/api/v1/lookup?locations=${lat},${lng}`;

    try {
      const response = await fetch(url);
      const result = await response.json();

      const elevation = result.results[0].elevation;
      points.push({ latlng: e.latlng, elevation });

      // Mark the clicked point
      const marker = L.circleMarker(e.latlng, {
        radius: 6,
        color: "#ff0000",
        fillOpacity: 0.6
      }).addTo(map);

      elevationMarkers.push(marker);

      marker.bindPopup(`Elevation: ${elevation.toFixed(2)} m`).openPopup();

      // If two points are selected, compare
      if (points.length === 2) {
        const diff = points[1].elevation - points[0].elevation;
        const distance = points[0].latlng.distanceTo(points[1].latlng) / 1000; // km
        const slope = (diff / (distance * 1000)) * 100; // percent

        L.popup()
          .setLatLng(points[1].latlng)
          .setContent(`
            <strong>Elevation Comparison</strong><br>
            Point 1: ${points[0].elevation.toFixed(2)} m<br>
            Point 2: ${points[1].elevation.toFixed(2)} m<br>
            Difference: ${diff.toFixed(2)} m<br>
            Distance: ${distance.toFixed(2)} km<br>
            Slope: ${slope.toFixed(2)}%
          `)
          .openOn(map);

        map.off("click", clickHandler); // Stop listening
      }
    } catch (error) {
      console.error("Elevation query error:", error);
      alert("Error getting elevation.");
    }
  };

  map.on("click", clickHandler);
});
}