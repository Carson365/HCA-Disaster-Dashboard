import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

function capitalizeFirstLetter(data) {
	for (let key in data) {
		if (data.hasOwnProperty(key)) {
			data[key.charAt(0).toUpperCase() + key.substring(1)] = data[key];
			delete data[key];
		}
	}
	return data;
}

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
		this.size = getRandomInt(5, 25);
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
		const pt = mapInstance.latLngToLayerPoint([this.place.Latitude, this.place.Longitude]);
		this.anchorX = pt.x;
		this.anchorY = pt.y;
	}
}


var mapInstance = null;

export function runMapThings() {
	if (mapInstance !== null) {
		mapInstance.remove(); // Destroy previous instance before reinitializing
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
		attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
	}).addTo(mapInstance);

	// Reinitialize event listeners
	mapInstance.on("click", function () { hexes.forEach(hex => hex.deselect()); updateD3Elements(); });

	setupD3Listeners();
	setupSVG(); // Reattach the SVG correctly
}


/* -------------------- D3 Force Simulation Setup -------------------- */

const hexes = [];

let lastZoom = null;

// D3 selections for hexagons and tether lines.

const simulation = d3.forceSimulation(hexes)
	.force("x", d3.forceX(d => d.anchorX).strength(0.01))
	.force("y", d3.forceY(d => d.anchorY).strength(0.01))
	.force("collide", d3.forceCollide(d => d.size + 1))
	.on("tick", ticked);

function ticked() {
	tetherSelection.attr("x1", d => d.anchorX)
		.attr("y1", d => d.anchorY)
		.attr("x2", d => d.x)
		.attr("y2", d => d.y);

	iconSelection.attr("points", d => generateHexagon(d.x, d.y, d.size)).raise();
}

function getRandomInt(min, max) {
	const minCeiled = Math.ceil(min);
	const maxFloored = Math.floor(max);
	return Math.floor(Math.random() * (maxFloored - minCeiled) + minCeiled); // The maximum is exclusive and the minimum is inclusive
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

	const hexEnter = iconSelection.enter()
		.append("polygon")
		.attr("class", "hexagon")
		.attr("points", d => generateHexagon(d.x, d.y, 6));

	iconSelection = hexEnter.merge(iconSelection);

	iconSelection
		.style("fill", d => d.currentColor)
		.on("mouseover", function (event, d) {
			L.popup({ closeButton: false })
				.setLatLng(mapInstance.layerPointToLatLng([d.x, d.y - d.size * Math.sqrt(2) / 2])) // Offset the popup to the top of the hex
				.setContent(`
                    <b>Facility Name:</b> ${d.place.FacName}
                    <br><b>Time Zone:</b> ${d.place.TimeZone.toUpperCase()}
                    <br><b>Location:</b> ${d.place.FacCity}, ${d.place.FacState}
                    <br><b>Division Name:</b> ${d.place.DivName}
                    <br><b>MediTech Network:</b> ${d.place.NetworkMeditech}
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
            hexes.forEach(hex => { if (hex !== d) hex.deselect(); });
			if (d.selected) d.deselect();
			else d.select();
			updateD3Elements();
		})
		.on("click", function (event, d) {
			event.stopPropagation();
			mapInstance.closePopup();
		});

	// Bind nodes to tether lines.
	tetherSelection = g.selectAll("line.tether").data(hexes);
	tetherSelection.enter()
		.append("line")
		.attr("class", "tether")
		.style("stroke", "black")
		.style("stroke-width", 0.5);
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
	hexes.forEach(hex => hex.updateAnchor());

	simulation.nodes(hexes);
	if (zooming) simulation.alpha(10).restart();
}

// Reposition the SVG overlay.
function repositionSVG() {
	const topLeft = mapInstance.latLngToLayerPoint(mapInstance.getBounds().getNorthWest());
	const bottomRight = mapInstance.latLngToLayerPoint(mapInstance.getBounds().getSouthEast());

	svg.attr("width", bottomRight.x - topLeft.x)
		.attr("height", bottomRight.y - topLeft.y)
		.style("left", topLeft.x + "px")
		.style("top", topLeft.y + "px");

	g.attr("transform", `translate(${-topLeft.x},${-topLeft.y})`);
}

var svg = null;
var g = null; // Group container for D3 elements

var iconSelection = null;
var tetherSelection = null;

export function runCommon(color, place) {
	capitalizeFirstLetter(place);

	// Ensure mapInstance is initialized before proceeding
	if (!mapInstance) {
		console.error("Error: mapInstance is not initialized.");
		return;
	}

	const pt = mapInstance.latLngToLayerPoint([place.Latitude, place.Longitude]);

	hexes.push(new Hex(color, place, pt.x, pt.y));

	// Ensure simulation is aware of the updated nodes list
	simulation.nodes(hexes);

	// Restart the simulation so it settles
	simulation.alpha(1).restart();  // **Forces the simulation to run again**

	updateD3Elements();
}

function setupSVG() {
	const overlayPane = mapInstance.getPanes()?.overlayPane;
	if (!overlayPane) {
		console.error("Error: overlayPane is null.");
		return;
	}

	// Remove the existing SVG, if any
	d3.select(overlayPane).select("svg").remove();

	// Recreate the SVG and group container
	svg = d3.select(overlayPane).append("svg");
	g = svg.append("g").attr("class", "leaflet-zoom-hide");

	// Clear D3 selections so they properly bind to the new SVG
	iconSelection = null;
	tetherSelection = null;

	repositionSVG();
}




export function filterLocations(places) {
	places.forEach(capitalizeFirstLetter);
	hexes.forEach(hex => {
		const isMatch = places.some(place => hex.place.FacName === place.FacName);
		if (isMatch) hex.show();
		else hex.hide();
	});

	updateD3Elements();
}
