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
let parcelLayer = L.layerGroup().addTo(map);
let elevationPoints = [];
let elevationMarkers = [];




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
    layer.bindPopup(`${name}`);
  }
}, function (layer) {
  // Add to global hospitalsLayer so it appears in overlay controls
  hospitalsLayer = layer;
  checkAllLayersLoaded();
});

// Load Wisconsin DEM Layer REST
const demLayer = L.esri.imageMapLayer({
  url: "https://dnrmaps.wi.gov/arcgis_image/rest/services/DW_Elevation/EN_DEM_from_LiDAR_Feet/ImageServer",
  opacity: 0.9,
  attribution: "WI DNR LiDAR DEM"
});




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

// This function asks Wisconsin's elevation service for the elevation (in feet) at a specific location
function queryElevation(location, callback) {
  // The web address of the elevation service
  const elevationServiceURL = "https://dnrmaps.wi.gov/arcgis_image/rest/services/DW_Elevation/EN_DEM_from_LiDAR_Feet/ImageServer/identify";

  // Show the coordinates we're checking
  console.log("Checking elevation at:", location.lat, location.lng);

  // Build the settings for our request
  const settings = new URLSearchParams({
    f: "json", // Ask for the response in JSON format
    geometry: `${location.lng},${location.lat}`, // ArcGIS expects longitude first, then latitude
    geometryType: "esriGeometryPoint", // We're sending a single point
    returnPixelValues: "true" // Ask for the elevation value at that point
  });

  // Send the request to the elevation service
  fetch(elevationServiceURL + "?" + settings.toString())
    .then(response => {
      console.log("Got a response from the elevation service");
      return response.json(); // Convert the response into usable data
    })
    .then(data => {
      console.log("Elevation data received:", data); // Show the full response

      // Check if we got a valid elevation value
      if (data.pixelValues && data.pixelValues.length > 0 && data.pixelValues[0].value !== "NoData") {
        const elevation = parseFloat(data.pixelValues[0].value); // Convert to a number
        console.log("Elevation value found:", elevation);
        callback(null, elevation); // Send it back with no error
      } else {
        console.warn("No elevation value found at this location");
        callback("No elevation value found at this location");
      }
    })
    .catch(error => {
      console.error("Problem getting elevation:", error); // Show any errors
      callback(error); // Send the error back
    });
}

// This function starts the elevation tool when the button is clicked
function startElevationTool() {
  // Clear any previous clicks and markers
  elevationClicks = [];
  elevationMarkers.forEach(function(marker) {
    map.removeLayer(marker); // Remove old markers from the map
  });
  elevationMarkers = [];

  // Tell the user what to do
  alert("Click two points on the map to compare elevation.");

  // Start listening for map clicks
  map.on("click", handleElevationClickSimple);
}

// This function handles each map click during elevation tool use
function handleElevationClickSimple(e) {
  const clickedLocation = e.latlng; // Get the location that was clicked

  // Add a blue marker at the clicked point
  const marker = L.circleMarker(clickedLocation, {
    radius: 6,
    color: "blue",
    fillColor: "blue",
    fillOpacity: 0.6
  }).addTo(map);

  // Save the marker and location
  elevationMarkers.push(marker);
  elevationClicks.push(clickedLocation);

  console.log("Point clicked:", clickedLocation);

  // If two points have been clicked, compare their elevations
  if (elevationClicks.length === 2) {
    console.log("Two points selected. Starting elevation comparison...");

    // Stop listening for more clicks
    map.off("click", handleElevationClickSimple);

    // Get elevation for the first point
    queryElevation(elevationClicks[0], function(error1, elevation1) {
      if (error1) {
        alert("Error getting elevation for first point: " + error1);
        console.error("First elevation error:", error1);
        return;
      }

      // Get elevation for the second point
      queryElevation(elevationClicks[1], function(error2, elevation2) {
        if (error2) {
          alert("Error getting elevation for second point: " + error2);
          console.error("Second elevation error:", error2);
          return;
        }

        // Calculate the elevation change
        const elevationChange = elevation2 - elevation1;
        console.log("Elevation comparison complete");
        console.log("Point 1:", elevation1, "ft");
        console.log("Point 2:", elevation2, "ft");
        console.log("Change:", elevationChange, "ft");

        // Show the results to the user
        alert("Elevation Comparison (ft):\n" +
              "Point 1: " + elevation1.toFixed(2) + "\n" +
              "Point 2: " + elevation2.toFixed(2) + "\n" +
              "Change: " + elevationChange.toFixed(2) + " ft");
      });
    });
  }
}

// This connects the elevation tool to the button in your HTML
document.getElementById("elevationToolBtn").addEventListener("click", startElevationTool);