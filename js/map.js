/**
 * CURSE OF STRAHD MAP LOGIC
 * Adapted from Cyberpunk Red Map Tool
 */

// 1. Image dimensions - Update these to your Barovia map's actual resolution
const imageWidth = 3615; 
const imageHeight = 2408;

const map = L.map("map", {
  crs: L.CRS.Simple,
  minZoom: -2,
  maxZoom: 2
});

const bounds = [[0, 0], [imageHeight, imageWidth]];

// Update file path to your new map image
L.imageOverlay("map/barovia.png", bounds).addTo(map);

map.fitBounds(bounds);

// 2. State & Layers
let gmMode = false;
const GM_PASSCODE = "ravenloft"; // Updated passcode for the theme
const markerLayer = L.layerGroup().addTo(map);
let frozen = false;

// 3. Marker Logic
function loadLocations() {
  markerLayer.clearLayers();

  fetch("data/locations.json")
    .then(response => response.json())
    .then(locations => {
      locations.forEach(location => {
        // If not discovered and not in GM mode, stay hidden
        if (!location.discovered && !gmMode) return;

        // Custom Icon logic could go here (e.g., skulls for combat, house for towns)
        const marker = L.marker([location.y, location.x]);

        // Gothic themed popup content
        const status = !location.discovered ? "<br/><em style='color: #888;'>[UNEXPLORED]</em>" : "";
        const factionInfo = location.faction ? `<strong>Affiliation:</strong> ${location.faction}<br/>` : "";

        marker.bindPopup(`
          <div class="gothic-popup">
            <h2 style="margin: 0 0 5px 0; border-bottom: 1px solid #5e0000;">${location.name}</h2>
            ${factionInfo}
            <p>${location.description}</p>
            ${status}
          </div>
        `);

        markerLayer.addLayer(marker);
      });
    })
    .catch(err => console.error("Error loading Barovia data:", err));
}

// 4. UI Controls
const coordBox = document.getElementById("coord-box");

map.on("mousemove", function (e) {
  if (frozen) return;
  const x = Math.round(e.latlng.lng);
  const y = Math.round(e.latlng.lat);
  coordBox.textContent = `X: ${x} | Y: ${y}`;
});

map.on("click", () => { frozen = !frozen; });

const gmButton = document.getElementById("gm-toggle");
gmButton.addEventListener("click", () => {
  if (!gmMode) {
    const input = prompt("Speak the password to reveal the mists:");
    if (input !== GM_PASSCODE) {
      alert("The mists do not part for you.");
      return;
    }
  }

  gmMode = !gmMode;
  gmButton.textContent = gmMode ? "DM Mode: ACTIVE" : "DM Mode: OFF";
  gmButton.classList.toggle("active");
  loadLocations();
});

// Initial load
loadLocations();