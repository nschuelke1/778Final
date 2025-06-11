// MAIN.JS – Handles UI & Interactions

// Ensure the script runs only after the page loads
document.addEventListener("DOMContentLoaded", function () {



// Load ArcGIS Modules using require()
    require([
        "esri/config",
        "esri/Map",
        "esri/views/MapView",
        "esri/widgets/Search",
        "esri/layers/FeatureLayer"
    ], function(esriConfig, Map, MapView, Search, FeatureLayer) {

        // ArcGIS Online API Key
        esriConfig.apiKey = "YOUR_API_KEY_HERE"; // 🔥 Replace with your actual key

        // Initialize the Map
        var map = new Map({
            basemap: "topo-vector" // Esri basemap
        });

        // Create a Map View
        var view = new MapView({
            container: "map",
            map: map,
            center: [-89.5, 43.0], // Wisconsin coordinates
            zoom: 7
        });

        // Add a Search Widget for location-based queries
        var searchWidget = new Search({ view: view });
        view.ui.add(searchWidget, "top-right");

        console.log("Esri map initialized and API connected!");

    });

});