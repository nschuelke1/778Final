// Nathan Schuelke
// 778 Final Project
// Dam Impact and Flood Risk Assessment




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




/////////////////////////////////////////////////////////////////////////////
// Declare layer variables
let riversLayer;
let watershedsLayer;
let damsLayer;
let bufferLayer = null;
let layersLoaded = 0;
let schoolLayerGroup = L.layerGroup();
let hospitalsLayer;
let parcelLayer;




/////////////////////////////////////////////////////////////////////////////
// --- Function to load a GeoJSON file and apply styling and popup logic
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
  color: "#1e90ff", // Blue color for public schools
  radius: 6,        // Marker size
  fillOpacity: 0.7,
  onEachFeature: function (feature, layer) {
    feature.properties.school_type = "Public"; // Tag for later use
    layer.bindPopup(`${feature.properties.name} (Public)`); // Clickable popup
  }
}, function (layer) {
  // Add each school marker into the unified school layer group
  layer.eachLayer(l => schoolLayerGroup.addLayer(l));

  // Optional: trigger layer control setup if you're tracking load progress
  checkAllLayersLoaded();
});

//Load Private Schools
loadGeoJSON("data/PrivateSchools.geojson", {
  color: "#ff7f50", // Coral color for private schools
  radius: 6,
  fillOpacity: 0.7,
  onEachFeature: function (feature, layer) {
    feature.properties.school_type = "Private"; // Tag for later use
    layer.bindPopup(`${feature.properties.name} (Private)`); // Clickable popup
  }
}, function (layer) {
  layer.eachLayer(l => schoolLayerGroup.addLayer(l)); // Add to same group
  checkAllLayersLoaded();
});

// Load Hospitals
loadGeoJSON("data/WisconsinHospitals.geojson", {
  color: "#ffa500",      
  radius: 8,             
  fillOpacity: 0.7,
  onEachFeature: function (feature, layer) {
    layer.bindPopup(`${name}`);
  }
}, function (layer) {
  // Add to global hospitalsLayer so it appears in overlay controls
  hospitalsLayer = layer;
  hospitalsLayer.addTo(map);
  checkAllLayersLoaded();
});

// Load Wisconsin DEM Layer REST
const demLayer = L.esri.imageMapLayer({
  url: "https://dnrmaps.wi.gov/arcgis_image/rest/services/DW_Elevation/EN_DEM_from_LiDAR_Feet/ImageServer",
  opacity: 0.9,
  attribution: "WI DNR LiDAR DEM"
});


// Load Wisconsin Parcels REST
parcelLayer = L.esri.featureLayer({
  url: "https://services3.arcgis.com/n6uYoouQZW75n5WI/arcgis/rest/services/Wisconsin_Statewide_Parcels/FeatureServer/0",
  style: function () {
    return {
      color: "#888",
      weight: 0.5,
      fillOpacity: 0.1
    };
  },
  onEachFeature: function (feature, layer) {
    const address = feature.properties.SITEADDRESS || "No address listed";
    layer.bindPopup(`🏠 Parcel Address: ${address}`);
  }
});

// Optional: Add to map now or wait for toggle
// parcelLayer.addTo(map);

function checkAllLayersLoaded() {
  layersLoaded++;
  if (layersLoaded === 6) {
    const overlayMaps = {
      "Lakes & Rivers": riversLayer,
      "Watersheds": watershedsLayer,
      "Dams": damsLayer,
      "Elevation (LiDAR DEM)": demLayer,
      "Schools": schoolLayerGroup,
      "Hospitals": hospitalsLayer,
      "Parcels": parcelLayer
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




//////BUFFER//////////////////////////////////////////////////////////////////
// Listen for when the user clicks the "Buffer Dam" button
document.getElementById("bufferToolBtn").addEventListener("click", () => {

  // Once the user clicks on the map, run this function once
  map.once("click", (e) => {
    let clickedFeature = null; // We'll store the clicked dam here

    // Loop through each dam feature in the layer
    damsLayer.eachLayer((layer) => {
      // Check if the clicked map location matches a dam location
      // (This uses exact coordinates; you can later improve with proximity detection)
      if (isCloseEnough(e.latlng, layer.getLatLng())) {
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

        // Remove any previous buffer before adding the new one
        if (bufferLayer) {
          map.removeLayer(bufferLayer);
        }

        // Add the new buffer and store it in bufferLayer for future cleanup
        bufferLayer = L.geoJSON(buffer, {
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