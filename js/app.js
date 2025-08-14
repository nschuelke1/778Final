// Nathan Schuelke
// 778 Final Project
// Dam Impact and Flood Risk Assessment



// Esri API Key for elevation service
const esriApiKey = "AAPTxy8BH1VEsoebNVZXo8HurA_2jA8sPPf_DuV7jRLl5PwtnXSU0EiBd11SD4M-Bxw0hCcLfTFwvO8qMU69LnIuTXBc20px1QrO2YvAWh7qW4shtxgRBGkvOKbSUxG1UlsSq_rjYNW_BU84JuypUijxgbvAm3J6aFLqyZGnWiBq7w9CtuCohALUyjkCrONoQ-r1P_V8vvLTifb8V0eWMt4rGV0IiA4QE-WtX_zxA8uL3jaikZCbKD6Gd0xtXh9N9zn6AT1_agURHDlj"; 


//////Initialize the map and Base Layers/////////////////////////////////////
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
let layersLoaded = 0;
let schoolLayerGroup = L.layerGroup();
let hospitalsLayer;
let parcelLayer = L.layerGroup().addTo(map);
let elevationPoints = [];
let elevationMarkers = [];
let parcelGeoJSON;




/////////////////////////////////////////////////////////////////////////////
// Function to load a GeoJSON file and apply styling and popup logic
function loadGeoJSON(url, styleOptions, callback) {

  // Fetch the GeoJSON file from the provided URL
  fetch(url)
    .then((response) => response.json()) // Parse the response as JSON
    .then((data) => {

      // Create a Leaflet GeoJSON layer using the loaded data
      const layer = L.geoJSON(data, {

        // For point features (like dams), convert them to circle markers
        pointToLayer: function (feature, latlng) {
          return L.circleMarker(latlng, {

            // Radius adjusts based on zoom level for visibility
            radius: getRadius(map.getZoom()),

            // Apply custom color and fill settings from styleOptions
            color: styleOptions.color || "#000",
            fillColor: styleOptions.fillColor || styleOptions.color || "#000",
            fillOpacity: styleOptions.fillOpacity || 0.8,
            weight: styleOptions.weight || 1
          });
        },

        // Apply styling to line and polygon features
        style: styleOptions,
        
        // Bind popups only if onEachFeature is provided in styleOptions
        // This prevents automatic popup binding unless explicitly requested (e.g. for watersheds)
        onEachFeature: styleOptions.onEachFeature || null
      });

      // If a callback function was provided, pass the layer back
      if (callback) callback(layer);
    })
    .catch((error) => console.error("Error loading GeoJSON:", error)); // Log any loading errors
}




/////////////////////////////////////////////////////////////////////////////
// Load each layer and check when done
// Load Lakes and Large Rivers  
loadGeoJSON("data/Lakes_Large_Rivers.geojson", { color: "#0077b6", weight: 2 }, function (layer) {
  riversLayer = layer;
  checkAllLayersLoaded();
  console.log("Layers loaded:", layersLoaded);
});

// Load Watersheds
loadGeoJSON("data/Watersheds.geojson", { color: "#34a853", weight: 1, fillOpacity: 0.2 }, function (layer) {
  watershedsLayer = layer;
  checkAllLayersLoaded();
});

// Load Dams
loadGeoJSON("data/Wisconsin_Dams.geojson", { color: "#d22e2e", weight: 1, fillOpacity: 0.8 }, function (layer) {
  damsLayer = layer;
  checkAllLayersLoaded();
});

// Load Public Schools
loadGeoJSON("data/PublicSchools.geojson", {
  color: "#1e90ff", 
  radius: 2,        
  fillOpacity: 0.7,
  onEachFeature: function (feature, layer) {
    feature.properties.school_type = "Public"; 
    layer.bindPopup(`${feature.properties.name} (Public)`); 
  }
}, function (layer) {
  // Add each school marker into the unified school layer group
  layer.eachLayer(l => schoolLayerGroup.addLayer(l));

  checkAllLayersLoaded();
});

//Load Private Schools
loadGeoJSON("data/PrivateSchools.geojson", {
  color: "#1e90ff", 
  radius: 2,
  fillOpacity: 0.7,
  onEachFeature: function (feature, layer) {
    feature.properties.school_type = "Private"; 
    layer.bindPopup(`${feature.properties.name} (Private)`); 
  }
}, function (layer) {
  layer.eachLayer(l => schoolLayerGroup.addLayer(l)); 
  checkAllLayersLoaded();
});

// Load Hospitals
loadGeoJSON("data/WisconsinHospitals.geojson", {
  color: "#ffa500",      
  radius: 2,             
  fillOpacity: 0.7,
  onEachFeature: function (feature, layer) {
    layer.bindPopup(`${feature.properties.name || "Hospital"}`);
  }
}, function (layer) {
  // Add to global hospitalsLayer so it appears in overlay controls
  hospitalsLayer = layer;
  checkAllLayersLoaded();
});




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
      // Remove buffer layer if present
      if (map.hasLayer(bufferLayer)) {
        map.removeLayer(bufferLayer);
      }

      // Clear parcel layer group
      if (map.hasLayer(parcelLayer)) {
        map.removeLayer(parcelLayer);
      }

      bufferLayer = null;
      parcelLayer.clearLayers(); // Since it's a LayerGroup

      // Clear the results table
      const resultsTableBody = document.querySelector("#resultsTable tbody");
      if (resultsTableBody) {
        resultsTableBody.innerHTML = "";
      }

      console.log("Buffer and parcel layers cleared. Table reset.");
    });
  } else {
    console.warn("Clear Results button not found in DOM.");
  }
});




/////////////////////////////////////////////////////////////////////////////
// Display Parcel Summary in Table
function displayParcelSummary(features) {
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
  row.innerHTML = `
    <td><strong>${totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong></td>
    <td><strong>${totalAcres.toFixed(2)}</strong></td>
  `;
  tbody.appendChild(row);
}


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
          displayParcelSummary(featureCollection.features);
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

    // USGS Elevation Point Query Service
    const url = `https://nationalmap.gov/epqs/pqs.php?x=${lng}&y=${lat}&units=Meters&output=json`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      const elevation = data.USGS_Elevation_Point_Query_Service.Elevation_Query.Elevation;
      points.push({ latlng: e.latlng, elevation });

      // Mark the clicked point
      const marker = L.circleMarker(e.latlng, {
        radius: 6,
        color: "#ff0000",
        fillOpacity: 0.6
      }).addTo(map);

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