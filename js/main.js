// MAIN.JS – Handles UI & Interactions

// Ensure the script runs only after the page loads
document.addEventListener("DOMContentLoaded", function () {

    // Initialize the Map using Leaflet.js
    var map = L.map("map").setView([43.0, -89.5], 7); // Centered over Wisconsin

    // Add a Base Map Layer (OpenStreetMap or Esri)
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap Contributors",
    }).addTo(map);

    // Add ArcGIS Online API Key (for AGOL integration)
    const AGOL_API_KEY = "AAPTxy8BH1VEsoebNVZXo8HurA_2jA8sPPf_DuV7jRLl5PwtnXSU0EiBd11SD4M-Bxw0ijY9Rnbq1CTi5xlxNyFji8DGRu0KKLCDqwHVksc_cd45A11yCLF6IS0qeLbPPoLAz_Lb-HlU59LPiRtjGTm8JRkfTU1zLRk6lnCjPZw0qLurNObS9cuNtbfmuGah_zEHj40iGyODgqADtCiqHiuUVKOV6bBXkVGF9GQp2qF_X_KoecZRYMv2u3hz_XOz0WmGAT1_ZrUwUfy9"; 

    // Connect to ArcGIS Services (Example)
    var esriLayer = L.esri.dynamicMapLayer({
        url: "https://services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer",
        token: AGOL_API_KEY, // Use the API key for authentication
    }).addTo(map);

    console.log("Map initialized and AGOL API connected");

});