//import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import { Hex } from "./Hex.js";
import * as countyUtils from "./countyUtils.js";
import * as d3Utils from "./d3Utils.js";
import * as femaUtils from "./femaUtils.js";

let storedInstance = null;
export function setDotNetHelper(instance) {
    storedInstance = instance;
}

export function sendToDotNet(fip, place) {
/*    console.log("FIP Code:", fip);*/
    if (storedInstance) {
        storedInstance.invokeMethodAsync("InvokeIt", place);
    }
}

export function dotNetCountyClick(fip) {
    if (storedInstance) {
        storedInstance.invokeMethodAsync("County", fip);
    }
}

export let mapInstance = null;
let countyPane;
let hexPane;

const hexes = [];
let lastZoom = null;
let simulation = null;
let svg, group;
let d3Selections = { iconSelection: null, tetherSelection: null };

export function runMapThings() {
    if (mapInstance !== null) {
        mapInstance.remove();
        mapInstance = null;
    }
    // Clear hexes array.
    hexes.length = 0;

    // Create the Leaflet map instance.
    mapInstance = L.map("map", {
        zoomControl: false,
        smoothWheelZoom: true,
        smoothSensitivity: 0.1,
        zoomSnap: 0.1,
    }).setView([37.8, -96], 4);

    //mapInstance.createPane("countyPane");
    //mapInstance.getPane("countyPane").style.zIndex = 400;
    //countyPane = mapInstance.getPane("countyPane");

    mapInstance.createPane("hexPane");
    mapInstance.getPane("hexPane").style.zIndex = 650;
    hexPane = mapInstance.getPane("hexPane");

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
            '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(mapInstance);

    // Set up the SVG overlay for D3 elements.
    const overlay = d3Utils.setupSVG(hexPane, mapInstance);
    svg = overlay.svg;
    group = overlay.group;

    // Fetch and render county data.
    countyUtils.fetchCountyData(mapInstance, group, hexes);

    // Create the D3 force simulation.
    simulation = d3Utils.createSimulation(hexes, () => {
        d3Utils.ticked(hexes, group, mapInstance, d3Selections);
    });

    // Setup D3 listeners.
    d3Utils.setupD3Listeners(
        mapInstance,
        hexes,
        simulation,
        () => {
            d3Utils.repositionSVG(mapInstance, svg, group);
            updateAnchors();
        },
        () => updateAnchors()
    );

    // Deselect hexes and update elements on map click.
    mapInstance.on("click", function () {
        hexes.forEach((hex) => hex.deselect());
        d3Selections = d3Utils.updateD3Elements(hexes, group, mapInstance, simulation);
    });

    // Initialize D3 elements.
    d3Selections = d3Utils.updateD3Elements(hexes, group, mapInstance, simulation);

    // Update simulation anchors and FEMA positions on map move.
    mapInstance.on("move", () => {
        if (!lastZoom || mapInstance.getZoom() !== lastZoom) {
            updateAnchors(true);
        } else {
            updateAnchors(false);
        }
        lastZoom = mapInstance.getZoom();
        femaUtils.updateFemaPositions(mapInstance);
        d3Utils.repositionSVG(mapInstance, svg, group);
    });

    // Optionally, load FEMA data immediately.
    femaUtils.loadFemaData(mapInstance, svg);

    // Manually update positions on initial load.
    d3Utils.repositionSVG(mapInstance, svg, group);
    updateAnchors();
    femaUtils.updateFemaPositions(mapInstance);
}

function updateAnchors(zooming = false) {
    hexes.forEach((hex) => hex.updateAnchor());
    simulation.nodes(hexes);
    if (zooming) simulation.alpha(10).restart();
}

export function runCommon(color, placesJson) {
    let places = JSON.parse(placesJson);
    if (!mapInstance) {
        console.error("Error: mapInstance is not initialized.");
        return;
    }
    places.forEach((place) => {
        const pt = mapInstance.latLngToLayerPoint([place.Latitude, place.Longitude]);
        hexes.push(new Hex(color, place, pt.x, pt.y));
    });
    simulation.nodes(hexes);
    d3Selections = d3Utils.updateD3Elements(hexes, group, mapInstance, simulation);
    simulation.alpha(1).restart();
    countyUtils.updateCountyStyles(countyPane, hexes);
}

export function filterLocations(places) {
    hexes.forEach((hex) => {
        if (places.some((place) => hex.place.ID === place.ID)) hex.show();
        else hex.hide();
    });
    d3Selections = d3Utils.updateD3Elements(hexes, group, mapInstance, simulation);
}

export function hideFemaPoints() {
    femaUtils.hideFemaPoints();
}

export function showFemaPoints() {
    femaUtils.showFemaPoints(mapInstance);
}
