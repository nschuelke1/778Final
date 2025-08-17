// Nathan Schuelke
// 778 Final Project
// Dam Impact and Flood Risk Assessment



// Splash screen logic
document.addEventListener("DOMContentLoaded", () => {
  const splash = document.getElementById("splash-screen");
  const enterBtn = document.getElementById("enter-map-btn");

  if (splash && enterBtn) {
    enterBtn.addEventListener("click", () => {
      splash.style.display = "none";
    });
  }
});




// Esri API Key for elevation service
const esriApiKey = "AAPTxy8BH1VEsoebNVZXo8HurA_2jA8sPPf_DuV7jRLl5PwtnXSU0EiBd11SD4M-Bxw0hCcLfTFwvO8qMU69LnIuTXBc20px1QrO2YvAWh7qW4shtxgRBGkvOKbSUxG1UlsSq_rjYNW_BU84JuypUijxgbvAm3J6aFLqyZGnWiBq7w9CtuCohALUyjkCrONoQ-r1P_V8vvLTifb8V0eWMt4rGV0IiA4QE-WtX_zxA8uL3jaikZCbKD6Gd0xtXh9N9zn6AT1_agURHDlj"; 


//////Initialize the map and Base Layers/////////////////////////////////////
var map = L.map("map").setView([45.0, -89.5], 7); // Centered over Wisconsin

// Add a base map layer (OpenStreetMap)
// Open Street Map
const osmBase = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap Contributors"
});

// Satellite imagery 
const satelliteBase = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
  attribution: "© Esri & contributors"
});

// Set default
osmBase.addTo(map);



//////RADIUS SCALING FOR DAMS////////////////////////////////////////////////
function getRadius(zoom) {
  return Math.max(1.5, zoom * 0.3); // Adjust radius based on zoom level
}

// Adjust dam marker radius based on zoom level
map.on("zoomend", function () {
  if (damsLayer) {
    damsLayer.eachLayer(function (layer) {
      if (layer.setRadius) {
        layer.setRadius(getRadius(map.getZoom()));
      }
    });
  }
});



console.log("Raster plugin available:", typeof L.esri.identifyImage);
console.log("Buffer button:", document.getElementById("bufferToolBtn"));
console.log("Elevation button:", document.getElementById("elevationToolBtn"));


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
let layerControlAdded = false;


// Load a GeoJSON layer from a URL, run a callback when it's ready, and optionally add it to the map
function addGeoJSONLayer(url, options, callback, addToMap = false) {
  const layer = new L.GeoJSON.AJAX(url, options);
  layer.on("data:loaded", () => {
    if (callback) callback(layer);
    checkAllLayersLoaded();
  });
  if (addToMap) layer.addTo(map); 
  return layer;
}

///// Lakes & Large Rivers /////
riversLayer = addGeoJSONLayer("data/Lakes_Large_Rivers.geojson", {
  style: {
    color: "#3498db",
    weight: 2
  },
  onEachFeature: (feature, layer) => {
    const name = feature.properties.OFFICIAL_NAME;
    if (name) {
      layer.bindPopup(`<strong>Name:</strong> ${name}`);
    }
  }
}, null, false);

///// Watersheds /////
watershedsLayer = addGeoJSONLayer("data/Watersheds.geojson", {
  style: {
    color: "#8e44ad",
    weight: 1,
    fillOpacity: 0.3
  },
  onEachFeature: (feature, layer) => {
    const name = feature.properties.WSHED_NAME;
    if (name) {
      layer.bindPopup(`<strong>Watershed:</strong> ${name}`);
    }
  }
}, null, false);

///// Dams /////
damsLayer = addGeoJSONLayer("data/Wisconsin_Dams.geojson", {
  pointToLayer: (feature, latlng) => {
    return L.circleMarker(latlng, {
      radius: getRadius(map.getZoom()),
      color: "#d22e2e",
      fillColor: "#d22e2e",
      fillOpacity: 0.8,
      weight: 1
    });
  }
}, null, true); // Only one added to map on load

///// Public Schools /////
publicSchoolsLayer = addGeoJSONLayer("data/PublicSchools.geojson", {
  pointToLayer: (feature, latlng) => {
    return L.circleMarker(latlng, {
      radius: 2,
      color: "#1e90ff",
      fillColor: "#1e90ff",
      fillOpacity: 0.7
    });
  },
  onEachFeature: (feature, layer) => {
    if (feature.properties.SCHOOL) {
      layer.bindPopup(`<strong>Public School:</strong> ${feature.properties.SCHOOL}`);
    }
  }
}, layer => {
  layer.eachLayer(l => schoolLayerGroup.addLayer(l));
}, false);

///// Private Schools /////
privateSchoolsLayer = addGeoJSONLayer("data/PrivateSchools.geojson", {
  pointToLayer: (feature, latlng) => {
    return L.circleMarker(latlng, {
      radius: 2,
      color: "#1e90ff",
      fillColor: "#1e90ff",
      fillOpacity: 0.7
    });
  },
  onEachFeature: (feature, layer) => {
    if (feature.properties.SCHOOL) {
      layer.bindPopup(`<strong>Private School:</strong> ${feature.properties.SCHOOL}`);
    }
  }
}, layer => {
  layer.eachLayer(l => schoolLayerGroup.addLayer(l));
}, false);


hospitalsLayer = addGeoJSONLayer("data/WisconsinHospitals.geojson", {
  pointToLayer: (feature, latlng) => {
    return L.circleMarker(latlng, {
      radius: 2,
      color: "#eea010ff",
      fillColor: "#eea010ff",
      fillOpacity: 0.8,
      weight: 1
    });
  }
}, null, false);

///// LiDAR DEM /////
const demLayer = L.esri.imageMapLayer({
  url: "https://dnrmaps.wi.gov/arcgis_image/rest/services/DW_Elevation/EN_DEM_from_LiDAR_Feet/ImageServer",
  opacity: 0.9,
  attribution: "WI DNR LiDAR DEM"
});

demLayer.on("load", () => {
  console.log("DEM layer loaded");
  checkAllLayersLoaded();
});


/////////////////////////////////////////////////////////////////////////////
// Track when all layers are loaded, then add layer control to the map
function checkAllLayersLoaded() {
  layersLoaded++;
  console.log(`Layers loaded: ${layersLoaded}`);

  // Once all expected layers are loaded, add the layer toggle UI
  if (layersLoaded >= 6 && !layerControlAdded) {
    layerControlAdded = true; 

    const overlayMaps = {
      "Lakes & Rivers": riversLayer,
      "Watersheds": watershedsLayer,
      "Dams": damsLayer,
      "Schools": schoolLayerGroup,
      "Hospitals": hospitalsLayer,
      "Parcels (Buffer Results)": parcelLayer,
      "Elevation (LiDAR DEM)": demLayer
    };

    const baseMaps = {
      "OpenStreetMap": osmBase,
      "Satellite": satelliteBase
    };

    L.control.layers(baseMaps, overlayMaps, { collapsed: false }).addTo(map);
    console.log("Layer control added.");
  }
}


// Check if user's click is close enough to a dam marker
function isCloseEnough(clickLatLng, layerLatLng, thresholdMeters = 20) {
  return clickLatLng.distanceTo(layerLatLng) <= thresholdMeters;
}




/////////////////////////////////////////////////////////////////////////////
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

  // Loop through each parcel feature and accumulate market value and acreage
  features.forEach((feature) => {
    const props = feature.properties;
    const value = parseFloat(props.ESTFMKVALUE);
    const acres = parseFloat(props.GISACRES);

    // Only add values if they are valid numbers
    if (!isNaN(value)) totalValue += value;
    if (!isNaN(acres)) totalAcres += acres;
  });

  // Select the table body element where results will be displayed
  const tbody = document.querySelector("#resultsTable tbody");
  tbody.innerHTML = ""; // Clear all rows

  // Create an array of summary rows to be added to the table
  const rows = [
    { label: "Total Market Value ($)", value: totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 }) },
    { label: "Total Acres", value: totalAcres.toFixed(2) },
    { label: "Schools in Buffer", value: schoolsInBuffer },
    { label: "Hospitals in Buffer", value: hospitalsInBuffer }
  ];

  // Create and insert each row into the table
  rows.forEach(({ label, value }) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><strong>${label}</strong></td>
      <td>${value}</td>
    `;
    tbody.appendChild(row);
  });
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

        // Count hospitals and schools inside buffer
        let hospitalsInBuffer = 0;
        let schoolsInBuffer = 0;

        // Count hospitals inside the buffer zone
        hospitalsLayer.eachLayer((layer) => {
          const point = layer.toGeoJSON(); // Convert Leaflet layer to GeoJSON point
          if (turf.booleanPointInPolygon(point, buffer)) {
            hospitalsInBuffer++; // Increment counter
          }
        });

        // Count schools inside the buffer zone
        schoolLayerGroup.eachLayer((layer) => {
          const point = layer.toGeoJSON(); // Convert Leaflet layer to GeoJSON point
          if (turf.booleanPointInPolygon(point, buffer)) {
            schoolsInBuffer++; // Increment counter
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

          // Create and add parcel polygons to the map with styling and popups
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
// Listen for "Elevation Tool" button click
document.getElementById("elevationToolBtn").addEventListener("click", () => {
  elevationPoints = [];

  alert("Click two points on the map to compare elevation.");

  // Define click handler for elevation sampling
  const clickHandler = async function (e) {
    const { lat, lng } = e.latlng;

    // Open-Elevation API
    const url = `https://api.open-elevation.com/api/v1/lookup?locations=${lat},${lng}`;

    try {
      // Fetch elevation data from API
      const response = await fetch(url);
      const result = await response.json();

      const elevation = result.results[0].elevation;
      elevationPoints.push({ latlng: e.latlng, elevation });

      // Mark the clicked point
      const marker = L.circleMarker(e.latlng, {
        radius: 6,
        color: "#ff0000",
        fillOpacity: 0.6
      }).addTo(map);

      elevationMarkers.push(marker);

      // Show elevation in popup
      marker.bindPopup(`Elevation: ${elevation.toFixed(2)} m`).openPopup();

      // If two points are selected, compare
      if (elevationPoints.length === 2) {
        const diff = elevationPoints[1].elevation - elevationPoints[0].elevation;
        const distance = elevationPoints[0].latlng.distanceTo(elevationPoints[1].latlng) / 1000;
        const slope = (diff / (distance * 1000)) * 100; // percent

       // Display elevation comparison in a popup at second point
       L.popup()
        .setLatLng(elevationPoints[1].latlng)
        .setContent(`
          <strong>Elevation Comparison</strong><br>
          Point 1: ${elevationPoints[0].elevation.toFixed(2)} m<br>
          Point 2: ${elevationPoints[1].elevation.toFixed(2)} m<br>
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

  // Start listening for map clicks to collect elevation points
  map.on("click", clickHandler);
});




