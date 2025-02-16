import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

// Uncomment and adjust this function if you need to capitalize property names.
// function capitalizeFirstLetter(data) {
//   for (let key in data) {
//     if (data.hasOwnProperty(key)) {
//       data[key.charAt(0).toUpperCase() + key.substring(1)] = data[key];
//       delete data[key];
//     }
//   }
//   return data;
// }

var storedInstance = null;
export function setDotNetHelper(instance) {
    storedInstance = instance;
}

function sendToDotNet(message) {
    if (storedInstance) {
        storedInstance.invokeMethodAsync("InvokeIt", message);
    }
}

class Hex {
    constructor(color, place, anchorX, anchorY) {
        this.place = place;
        this.defaultColor = color;
        this.currentColor = color;
        this.anchorX = anchorX;
        this.anchorY = anchorY;
        this.x = anchorX;
        this.y = anchorY;
        this.selected = false;
        this.hidden = false;
        this.size = (place.Size ** 0.25) * 2;
    }

    select() {
        this.selected = true;
        this.currentColor = "white";
        sendToDotNet(this.place);
    }

    deselect() {
        this.selected = false;
        this.currentColor = this.hidden ? "black" : this.defaultColor;
        sendToDotNet(null);
    }

    hide() {
        this.hidden = true;
        if (!this.selected) this.currentColor = "black";
    }

    show() {
        this.hidden = false;
        if (!this.selected) this.currentColor = this.defaultColor;
    }

    updateAnchor() {
        const pt = mapInstance.latLngToLayerPoint([
            this.place.Latitude,
            this.place.Longitude,
        ]);
        this.anchorX = pt.x;
        this.anchorY = pt.y;
    }
}

var mapInstance = null;

// Global reference for the county layer.
let countyLayerGlobal = null;

// Style function for counties. It counts how many hexes fall inside and returns a style.
function getCountyStyle(feature) {
    let count = countHexesInCounty(feature);
    return {
        color: getCountyColor(count), // Border color
        weight: 0.5, // Border thickness
        opacity: 0.5,
        fillColor: getCountyColor(count), // Color based on count
        fillOpacity: count > 0 ? 0.3 : 0,
    };
}

// Helper: Count hexes that fall within a given county feature.
function countHexesInCounty(feature) {
    let count = 0;
    hexes.forEach((hex) => {
        // Ensure proper coordinate order: [longitude, latitude]
        const lat = parseFloat(hex.place.Latitude);
        const lon = parseFloat(hex.place.Longitude);
        if (d3.geoContains(feature, [lon, lat])) {
            count++;
        }
    });
    return count;
}

// Helper: Choose a color based on the number of hexes.
function getCountyColor(count) {
    return count > 5
        ? "#800026"
        : count > 4
            ? "#BD0026"
            : count > 3
                ? "#E31A1C"
                : count > 2
                    ? "#FC4E2A"
                    : count > 1
                        ? "#FD8D3C"
                        : count > 0
                            ? "#FEB24C"
                            : "#FFFFFF";
}

export function runMapThings() {
    if (mapInstance !== null) {
        mapInstance.remove();
        mapInstance = null;
    }

    // Clear nodes so we don't have duplicate elements when re-adding them
    hexes.length = 0;

    mapInstance = L.map("map", {
        zoomControl: false,
        smoothWheelZoom: true,
        smoothSensitivity: 0.1,
        zoomSnap: 0.1,
    }).setView([37.8, -96], 4);

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
            '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(mapInstance);

    // Load and add county boundaries, using our style function.
    d3.json(
        "https://gist.githubusercontent.com/sdwfrost/d1c73f91dd9d175998ed166eb216994a/raw/"
    ).then(function (data) {
        let countyLayer = L.geoJson(data, {
            style: getCountyStyle,
        });
        countyLayer.addTo(mapInstance);
        countyLayerGlobal = countyLayer;
    });

    // Reinitialize event listeners
    mapInstance.on("click", function () {
        hexes.forEach((hex) => hex.deselect());
        updateD3Elements();
    });

    setupD3Listeners();
    setupSVG();

    // Update positions on map movement (pan/zoom)
    mapInstance.on("move", () => {
        if (!lastZoom || mapInstance.getZoom() !== lastZoom) updateAnchors(true);
        else updateAnchors(false);
        lastZoom = mapInstance.getZoom();
        updateFemaPositions();
        repositionSVG();
    });

    // Optionally, load the FEMA data immediately.
    loadFemaData();
}

/* -------------------- D3 Force Simulation Setup -------------------- */

const hexes = [];

let lastZoom = null;

// D3 selections for hexagons and tether lines.
const simulation = d3
    .forceSimulation(hexes)
    .force("x", d3.forceX((d) => d.anchorX).strength(0.01))
    .force("y", d3.forceY((d) => d.anchorY).strength(0.01))
    .force("collide", d3.forceCollide((d) => d.size + 1))
    .on("tick", ticked);

function ticked() {
    if (!tetherSelection || !iconSelection) return;
    tetherSelection
        .attr("x1", (d) => d.anchorX)
        .attr("y1", (d) => d.anchorY)
        .attr("x2", (d) => d.x)
        .attr("y2", (d) => d.y);

    iconSelection.attr("points", (d) => generateHexagon(d.x, d.y, d.size)).raise();
}

function getRandomInt(min, max) {
    const minCeiled = Math.ceil(min);
    const maxFloored = Math.floor(max);
    return Math.floor(Math.random() * (maxFloored - minCeiled) + minCeiled);
}

// Utility: generate hexagon points centered at (x,y)
function generateHexagon(x, y, size) {
    const angle = Math.PI / 3;
    return Array.from({ length: 6 }, (_, i) => {
        const px = x + size * Math.cos(angle * i);
        const py = y + size * Math.sin(angle * i);
        return `${px},${py}`;
    }).join(" ");
}

// Called whenever nodes update so that D3 elements are bound.
function updateD3Elements() {
    iconSelection = g.selectAll("polygon.hexagon").data(hexes);

    const hexEnter = iconSelection
        .enter()
        .append("polygon")
        .attr("class", "hexagon")
        .attr("points", (d) => generateHexagon(d.x, d.y, 6));

    iconSelection = hexEnter.merge(iconSelection);

    iconSelection
        .style("fill", (d) => d.currentColor)
        .on("mouseover", function (event, d) {
            L.popup({ closeButton: false })
                .setLatLng(
                    mapInstance.layerPointToLatLng([
                        d.x,
                        d.y - (d.size * Math.sqrt(2)) / 2,
                    ])
                )
                .setContent(`
          <b>Facility Name:</b> ${d.place.Name}
          <br><b>Location:</b> ${d.place.City}, ${d.place.State}
        `)
                .openOn(mapInstance);
            d3.select(this).style("cursor", "pointer");
        })
        .on("mouseout", function () {
            mapInstance.closePopup();
        })
        .on("pointerdown", function (event, d) {
            event.stopPropagation();
            mapInstance.closePopup();
            hexes.forEach((hex) => {
                if (hex !== d) hex.deselect();
            });
            d.selected ? d.deselect() : d.select();
            updateD3Elements();
        })
        .on("click", function (event, d) {
            event.stopPropagation();
            mapInstance.closePopup();
        });

    // Bind nodes to tether lines.
    tetherSelection = g.selectAll("line.tether").data(hexes);
    tetherSelection = tetherSelection
        .enter()
        .append("line")
        .attr("class", "tether")
        .style("stroke", "black")
        .style("stroke-width", 0.5)
        .merge(tetherSelection);
}

// Ensure the map updates correctly after zooming or panning
function setupD3Listeners() {
    mapInstance.on("move", () => {
        if (!lastZoom || mapInstance.getZoom() !== lastZoom) updateAnchors(true);
        else updateAnchors(false);
        lastZoom = mapInstance.getZoom();
        repositionSVG();
    });
}

// Update each node’s anchor point using its stored geographic coordinate.
function updateAnchors(zooming) {
    hexes.forEach((hex) => hex.updateAnchor());

    simulation.nodes(hexes);
    if (zooming) simulation.alpha(10).restart();
}

// Reposition the SVG overlay.
function repositionSVG() {
    const topLeft = mapInstance.latLngToLayerPoint(
        mapInstance.getBounds().getNorthWest()
    );
    const bottomRight = mapInstance.latLngToLayerPoint(
        mapInstance.getBounds().getSouthEast()
    );

    svg
        .attr("width", bottomRight.x - topLeft.x)
        .attr("height", bottomRight.y - topLeft.y)
        .style("left", topLeft.x + "px")
        .style("top", topLeft.y + "px");

    g.attr("transform", `translate(${-topLeft.x},${-topLeft.y})`);
}

var svg = null;
var g = null; // Group container for D3 elements

var iconSelection = null;
var tetherSelection = null;

// Modified runCommon function to add multiple points.
export function runCommon(color, placesJson) {
    // Parse the JSON into an array of location objects.
    let places = JSON.parse(placesJson);

    if (!mapInstance) {
        console.error("Error: mapInstance is not initialized.");
        return;
    }

    // For each location, convert its lat/lon to a layer point and add a Hex.
    places.forEach((place) => {
        const pt = mapInstance.latLngToLayerPoint([
            place.Latitude,
            place.Longitude,
        ]);
        hexes.push(new Hex(color, place, pt.x, pt.y));
    });

    // Update the simulation and D3 elements.
    simulation.nodes(hexes);
    updateD3Elements();

    // Restart the simulation so it can settle.
    simulation.alpha(1).restart();

    // Update county colors based on the new hex counts.
    updateCountyStyles();
}

function updateCountyStyles() {
    if (countyLayerGlobal) {
        countyLayerGlobal.setStyle(getCountyStyle);
    }
}

function setupSVG() {
    const overlayPane = mapInstance.getPanes()?.overlayPane;
    if (!overlayPane) {
        console.error("Error: overlayPane is null.");
        return;
    }

    // Remove the existing SVG, if any
    d3.select(overlayPane).select("svg").remove();

    // Recreate the SVG with absolute positioning and a high z-index
    svg = d3
        .select(overlayPane)
        .append("svg")
        .style("position", "absolute")
        .style("z-index", "500"); // Ensures it's above county layers

    // Create the group container for D3 elements
    g = svg.append("g").attr("class", "leaflet-zoom-hide");

    // Clear D3 selections so they properly bind to the new SVG
    iconSelection = g.selectAll("polygon.hexagon");
    tetherSelection = g.selectAll("line.tether");

    repositionSVG();
}

export function filterLocations(places) {
    /*places.forEach(capitalizeFirstLetter);*/
    hexes.forEach((hex) => {
        if (places.some((place) => hex.place.ID === place.ID)) hex.show();
        else hex.hide();
    });

    updateD3Elements();
}

/* -------------------- FEMA Resource Integration -------------------- */

// Global variables for the FEMA layer.
let femaData = []; // Will hold the FEMA points data.
let femaGroup = null; // D3 selection for the group of FEMA circles.
let femaVisible = false;

// Replace with the actual FEMA GeoJSON endpoint.
// (The URL below is a placeholder; adjust it to your data source.)
const femaDataUrl =
    "https://services5.arcgis.com/0HvWfm6i99NZFHqu/arcgis/rest/services/Feeding_America_Food_Banks_17Mar2020_View1/FeatureServer/0/query?outFields=*&where=1%3D1&f=geojson";

function loadFemaData() {
    d3.json(femaDataUrl)
        .then((data) => {
            // Convert each GeoJSON feature into a point object.
            // Adjust property names as needed.
            femaData = data.features.map((feature) => ({
                // GeoJSON coordinates are [longitude, latitude]
                Latitude: feature.geometry.coordinates[1],
                Longitude: feature.geometry.coordinates[0],
                Name: feature.properties.FacilityName || feature.properties.NAME,
                City: feature.properties.City || feature.properties.CITY,
                State: feature.properties.State || feature.properties.STATE,
                ID: feature.properties.ID,
            }));
            // Create (or update) the FEMA layer on the map.
            displayFemaPoints();
        })
        .catch((error) => console.error("Error loading FEMA data:", error));
}

function displayFemaPoints() {
    // Ensure the map and the SVG overlay are available.
    if (!mapInstance || !svg) return;

    // Calculate the top-left offset like in repositionSVG.
    const topLeft = mapInstance.latLngToLayerPoint(mapInstance.getBounds().getNorthWest());

    // Create the FEMA group if it doesn't exist.
    if (!femaGroup) {
        femaGroup = svg.insert("g", ":first-child").attr("class", "fema-layer");
    }

    // Bind the FEMA data to circle elements.
    let circles = femaGroup.selectAll("circle.fema").data(femaData, (d) => d.ID);

    // Remove any circles that are no longer needed.
    circles.exit().remove();

    // Append new circles and update existing ones.
    circles
        .enter()
        .append("circle")
        .attr("class", "fema")
        .attr("r", 5)           // Fixed radius for each FEMA point.
        .attr("fill", "red")    // Set the fill color.
        .merge(circles)
        .attr("cx", (d) => {
            let pt = mapInstance.latLngToLayerPoint([d.Latitude, d.Longitude]);
            return pt.x - topLeft.x;
        })
        .attr("cy", (d) => {
            let pt = mapInstance.latLngToLayerPoint([d.Latitude, d.Longitude]);
            return pt.y - topLeft.y;
        });

    femaVisible = true;
}

function updateFemaPositions() {
    if (!femaGroup) return;
    // Recalculate the top-left offset.
    const topLeft = mapInstance.latLngToLayerPoint(mapInstance.getBounds().getNorthWest());
    femaGroup.selectAll("circle.fema")
        .attr("cx", (d) => {
            let pt = mapInstance.latLngToLayerPoint([d.Latitude, d.Longitude]);
            return pt.x - topLeft.x;
        })
        .attr("cy", (d) => {
            let pt = mapInstance.latLngToLayerPoint([d.Latitude, d.Longitude]);
            return pt.y - topLeft.y;
        });
}


function hideFemaPoints() {
    if (femaGroup) {
        femaGroup.style("display", "none");
        femaVisible = false;
    }
}

function showFemaPoints() {
    if (femaGroup) {
        femaGroup.style("display", "block");
        femaVisible = true;
        updateFemaPositions(); // Ensure positions are updated.
    }
}

function toggleFemaVisibility() {
    if (femaVisible) {
        hideFemaPoints();
    } else {
        showFemaPoints();
    }
}

//function updateFemaPositions() {
//    if (!femaGroup) return;
//    femaGroup
//        .selectAll("circle.fema")
//        .attr("cx", (d) => {
//            let pt = mapInstance.latLngToLayerPoint([d.Latitude, d.Longitude]);
//            return pt.x;
//        })
//        .attr("cy", (d) => {
//            let pt = mapInstance.latLngToLayerPoint([d.Latitude, d.Longitude]);
//            return pt.y;
//        });
//}

export function toggleFemaLayer() {
    toggleFemaVisibility();
}
