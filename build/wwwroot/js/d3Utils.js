import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import { generateHexagon } from "./Hex.js";
import { countyLayer } from "./countyUtils.js"; // Import countyLayer reference


export function setupSVG(hexPane, mapInstance) {
    // Remove any existing SVG overlay.
    d3.select(hexPane).select("svg").remove();

    const svg = d3.select(hexPane)
        .append("svg")
        .style("position", "absolute")
        .style("z-index", "650")
        .style("pointer-events", "none");  // Allow events to fall through

    const group = svg.append("g").attr("class", "leaflet-zoom-hide");
    return { svg, group };
}

export function repositionSVG(mapInstance, svg, group) {
    const topLeft = mapInstance.latLngToLayerPoint(
        mapInstance.getBounds().getNorthWest()
    );
    const bottomRight = mapInstance.latLngToLayerPoint(
        mapInstance.getBounds().getSouthEast()
    );

    svg
        .attr("width", bottomRight.x - topLeft.x)
        .attr("height", bottomRight.y - topLeft.y)
        .style("left", `${topLeft.x}px`)
        .style("top", `${topLeft.y}px`);

    group.attr("transform", `translate(${-topLeft.x},${-topLeft.y})`);
}

export function createSimulation(hexes, tickCallback) {
    return d3.forceSimulation(hexes)
        .force("x", d3.forceX((d) => d.anchorX).strength(0.01))
        .force("y", d3.forceY((d) => d.anchorY).strength(0.01))
        .force("collide", d3.forceCollide((d) => d.size + 1))
        .on("tick", tickCallback);
}

export function updateD3Elements(hexes, group, mapInstance, simulation) {
    // Bind hexagon data to polygon elements.
    let iconSelection = group.selectAll("polygon.hexagon").data(hexes);

    const hexEnter = iconSelection.enter()
        .append("polygon")
        .attr("class", "hexagon")
        .attr("points", (d) => generateHexagon(d.x, d.y, d.size || 6))
        .style("cursor", "pointer")
        .style("pointer-events", "auto") // Now hexes themselves can capture events
        .style("stroke", (d) => d.defaultColor)
        .style("stroke-width", "1.5px");

    iconSelection = hexEnter.merge(iconSelection);

    iconSelection
        .style("fill", (d) => d.currentColor)
        .style("stroke", (d) => d.defaultColor)
        .style("stroke-width", "1.5px")
        .on("mouseover", function (event, d) {


            if (countyLayer) {
                countyLayer.resetStyle();
            }


            // Display popup on hover.
            L.popup({ closeButton: false })
                .setLatLng(
                    mapInstance.layerPointToLatLng([
                        d.x,
                        d.y - ((d.size || 6) * Math.sqrt(2)) / 2,
                    ])
                )
                .setContent(`
          <b>Facility Name:</b> ${d.place.Name}
          <br><b>Location:</b> ${d.place.City}, ${d.place.State}
        `)
                .openOn(mapInstance);
            d3.select(this)

            
        })
        .on("mouseout", function (event, d) {
            this.style.pointerEvents = "none";
            const underlying = document.elementFromPoint(event.clientX, event.clientY);
            this.style.pointerEvents = "auto";
            if (
                underlying &&
                underlying !== this &&
                underlying.classList.contains("leaflet-interactive")
            ) {
                underlying.dispatchEvent(new MouseEvent("mouseout", event));
            }
            mapInstance.closePopup();
        })
        .on("pointerdown", function (event, d) {
            event.stopPropagation();
            mapInstance.closePopup();
            hexes.forEach((hex) => {
                if (hex !== d) hex.deselect();
            });
            d.selected ? d.deselect() : d.select();
            updateD3Elements(hexes, group, mapInstance, simulation);
        })
        .on("click", function (event, d) {
            event.stopPropagation();
            mapInstance.closePopup();
        });

    // Bind tether lines between hexagons.
    let tetherSelection = group.selectAll("line.tether").data(hexes);
    tetherSelection = tetherSelection
        .enter()
        .append("line")
        .attr("class", "tether")
        .style("stroke", "black")
        .style("stroke-width", 0.5)
        .merge(tetherSelection);

    return { iconSelection, tetherSelection };
}

export function ticked(hexes, group, mapInstance, selections) {
    if (!selections || !selections.tetherSelection || !selections.iconSelection) return;
    selections.tetherSelection
        .attr("x1", (d) => d.anchorX)
        .attr("y1", (d) => d.anchorY)
        .attr("x2", (d) => d.x)
        .attr("y2", (d) => d.y);
    selections.iconSelection
        .attr("points", (d) => generateHexagon(d.x, d.y, d.size || 6))
        .raise();
}

export function setupD3Listeners(mapInstance, hexes, simulation, repositionSVGCallback, updateAnchorsCallback) {
    mapInstance.on("move", () => {
        updateAnchorsCallback();
        repositionSVGCallback();
    });
}
