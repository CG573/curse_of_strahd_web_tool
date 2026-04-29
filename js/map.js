/**
 * CURSE OF STRAHD MAP LOGIC - MASTER VERSION
 */

// 1. Supabase Initialization
const SUPABASE_URL = 'https://czxdpdutrtrdgfbifupy.supabase.co';
const SUPABASE_KEY = 'sb_publishable_0r73bZnEHjNS4MQ7sZlCxg_Fx8QFaU8';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 2. Map Setup
const imageWidth = 7500;
const imageHeight = 4813;
const map = L.map("map", { crs: L.CRS.Simple, minZoom: -2, maxZoom: 2 });
const bounds = [[0, 0], [imageHeight, imageWidth]];
L.imageOverlay("map/barovia.png", bounds).addTo(map);
map.fitBounds(bounds);

// 3. State
let gmMode = false;
let markersVisible = true;
const GM_PASSCODE = "ravenloft";
const markerLayer = L.layerGroup().addTo(map);
let frozen = false;

// 4. Load Locations
async function loadLocations() {
  // We clear the layer, but we don't remove it from the map
  markerLayer.clearLayers();
  
  const { data: locations, error } = await _supabase.from('locations').select('*');
  if (error) return console.error("Error loading locations:", error);

  locations.forEach(loc => {
    // Only show discovered locations to players; show all to DM
    if (!loc.discovered && !gmMode) return;

    const activeColor = loc.color || '#3388ff';
    const activeIcon = loc.icon || 'fa-location-dot';

    let iconHtml = '';
    if (!loc.discovered && gmMode) {
      iconHtml = '<i class="fa-solid fa-eye-slash dm-marker-hidden"></i>';
    } else {
      iconHtml = `<i class="fa-solid ${activeIcon} player-marker" style="color: ${activeColor};"></i>`;
    }

    const marker = L.marker([loc.y, loc.x], {
      icon: L.divIcon({
        html: iconHtml,
        className: 'custom-div-icon',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      })
    });

    marker.locationId = loc.id;
    marker.currentColor = activeColor;
    marker.currentIcon = activeIcon;

    let content = `
      <div class="gothic-popup">
          <h2 style="margin:0;">${loc.name}</h2>
          <p style="font-style: italic; margin: 5px 0;">${loc.description}</p>
          
          <div class="color-picker" style="margin-top:10px; display:flex; gap:5px; align-items:center;">
              <span style="font-size:10px; color:#d1b894;">INK:</span>
              ${['#3388ff', '#8a0000', '#2e7d32', '#f9a825', '#d1b894'].map(c =>
                `<div onclick="updateColor(${loc.id}, '${c}')" 
                      style="width:16px; height:16px; background:${c}; cursor:pointer; border:1px solid #000; ${loc.color === c ? 'outline: 2px solid #d1b894;' : ''}">
                 </div>`).join('')}
          </div>
    `;

    if (gmMode) {
      content += `
          <div class="gothic-popup-admin" style="margin-top:10px; padding-top:10px; border-top:1px dashed #5e0000;">
              <div style="margin-bottom:10px;">
                  <span style="font-size:10px; color:#d1b894; display:block; margin-bottom:4px;">ICON CLASS (FontAwesome):</span>
                  <input type="text" 
                         value="${activeIcon}" 
                         onchange="updateIcon(${loc.id}, this.value)"
                         style="width:100%; background:#111; color:#8a0000; border:1px solid #5e0000; font-family:monospace; font-size:11px; padding:4px;">
              </div>
              <label>
                  <input type="checkbox" ${loc.discovered ? 'checked' : ''} onchange="toggleLocation(${loc.id}, this.checked)">
                  ${!loc.discovered ? 'PART THE MISTS' : 'VISIBLE TO PLAYERS'}
              </label>
          </div>
      `;
    }
    content += `</div>`;
    marker.bindPopup(content);
    markerLayer.addLayer(marker);
  });
}

// 5. Database Update Functions
async function toggleLocation(id, isChecked) {
  window.isUpdatingLocally = true;
  const { error } = await _supabase.from('locations').update({ discovered: isChecked }).eq('id', id);
  if (error) { 
    alert("The mists resist your will."); 
    window.isUpdatingLocally = false; 
    return; 
  }

  // Update marker visuals without closing popup
  markerLayer.eachLayer(m => {
    if (m.locationId === id) {
      const iconHtml = isChecked
        ? `<i class="fa-solid ${m.currentIcon} player-marker" style="color: ${m.currentColor};"></i>`
        : '<i class="fa-solid fa-eye-slash dm-marker-hidden"></i>';

      m.setIcon(L.divIcon({ html: iconHtml, className: 'custom-div-icon', iconSize: [24, 24], iconAnchor: [12, 12] }));

      const popup = m.getPopup();
      if (popup) {
        let content = popup.getContent();
        content = isChecked
          ? content.replace('PART THE MISTS', 'VISIBLE TO PLAYERS').replace('type="checkbox"', 'type="checkbox" checked')
          : content.replace('VISIBLE TO PLAYERS', 'PART THE MISTS').replace('type="checkbox" checked', 'type="checkbox"');
        m.setPopupContent(content);
      }
    }
  });
}

async function updateColor(id, newColor) {
  window.isUpdatingLocally = true;
  await _supabase.from('locations').update({ color: newColor }).eq('id', id);
  loadLocations(); 
}

async function updateIcon(id, newIcon) {
  window.isUpdatingLocally = true;
  await _supabase.from('locations').update({ icon: newIcon }).eq('id', id);
  loadLocations(); 
}

// 6. UI & Interactions
const coordBox = document.getElementById("coord-box");
map.on("mousemove", (e) => {
  if (!frozen) coordBox.textContent = `X: ${Math.round(e.latlng.lng)} | Y: ${Math.round(e.latlng.lat)}`;
});
map.on("click", () => frozen = !frozen);

// DM Toggle
document.getElementById("gm-toggle").addEventListener("click", () => {
  if (!gmMode && prompt("Password:") !== GM_PASSCODE) return alert("The mists do not recognize you.");
  gmMode = !gmMode;
  const btn = document.getElementById("gm-toggle");
  btn.textContent = gmMode ? "DM Mode: ACTIVE" : "DM Mode: OFF";
  btn.classList.toggle("active");
  loadLocations();
});

// Hide/Show Markers Toggle
document.getElementById("hide-toggle").addEventListener("click", () => {
  markersVisible = !markersVisible;
  const btn = document.getElementById("hide-toggle");
  
  if (markersVisible) {
    map.addLayer(markerLayer);
    btn.textContent = "Hide Markers";
    btn.classList.remove("active");
  } else {
    map.removeLayer(markerLayer);
    btn.textContent = "Show Markers";
    btn.classList.add("active");
  }
});

// 7. Realtime Listener
_supabase.channel('db-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'locations' }, () => {
  if (!window.isUpdatingLocally) loadLocations();
  window.isUpdatingLocally = false;
}).subscribe();

// Initial Run
loadLocations();