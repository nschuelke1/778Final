// Initialize the map
var map = L.map("map").setView([43.0, -89.5], 7); // Centered over Wisconsin

// Add a base map layer (OpenStreetMap)
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap Contributors",
}).addTo(map);

// Function to load GeoJSON
function loadGeoJSON(url, styleOptions) {
  fetch(url)
    .then((response) => response.json())
    .then((data) => {
      L.geoJSON(data, {
        style: styleOptions,
        onEachFeature: function (feature, layer) {
          layer.bindPopup(feature.properties.Name || "No Name");
        },
      }).addTo(map);
    })
    .catch((error) => console.error("Error loading GeoJSON:", error));
}

// Load each dataset with custom styling
loadGeoJSON("data/Lakes_Large_Rivers.geojson", {
  color: "#0077b6",
  weight: 2,
}); // Blue for water

loadGeoJSON("data/Watersheds.geojson", {
  color: "#34a853",
  weight: 1,
  fillOpacity: 0.3,
}); // Green for watersheds

loadGeoJSON("data/Wisconsin_Dams.geojson", {
  color: "#d22e2e",
  weight: 1,
  radius: 5, // Only applies to point features if using pointToLayer
  fillColor: "#d22e2e",
  fillOpacity: 0.8
});