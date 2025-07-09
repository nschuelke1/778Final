// Initialize the map
var map = L.map("map").setView([43.0, -89.5], 7); // Centered over Wisconsin

// Add a base map layer (OpenStreetMap)
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap Contributors",
}).addTo(map);

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
            radius: 5,
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

// Track when all layers are loaded
let layersLoaded = 0;

function checkAllLayersLoaded() {
  layersLoaded++;
  if (layersLoaded === 3) {
    const overlayMaps = {
      "Lakes & Rivers": riversLayer,
      "Watersheds": watershedsLayer,
      "Dams": damsLayer
    };
    L.control.layers(null, overlayMaps, { collapsed: false }).addTo(map);
  }
}

// Load each layer and check when done
loadGeoJSON("data/Lakes_Large_Rivers.geojson", { color: "#0077b6", weight: 2 }, function (layer) {
  riversLayer = layer;
  checkAllLayersLoaded();
});

loadGeoJSON("data/Watersheds.geojson", { color: "#34a853", weight: 1, fillOpacity: 0.3 }, function (layer) {
  watershedsLayer = layer;
  checkAllLayersLoaded();
});

loadGeoJSON("data/Wisconsin_Dams.geojson", { color: "#d22e2e", weight: 1, fillOpacity: 0.8 }, function (layer) {
  damsLayer = layer;
  checkAllLayersLoaded();
});