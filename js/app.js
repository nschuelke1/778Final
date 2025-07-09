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