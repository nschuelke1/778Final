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
        esriConfig.apiKey = "AAPTxy8BH1VEsoebNVZXo8HurA_2jA8sPPf_DuV7jRLl5PwtnXSU0EiBd11SD4M-Bxw0SL6XWQxKmE1p3BlBtJG9VJ-nY77ywrxirQx3WGMNy6ErMjdE3Nj8n2_6fpjVyz77akfVF7g3G-b238insDrWtOVvtfYbyTKoFa7pO48S05clji-hthN9rMEaqmA4FE-6A5sUrnTvvt95VOFSnyV9eNgP75OZbv1em2a4O2YPBfVGuHO763jHFZ50R9R_88hbAT1_ZrUwUfy9"; 

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