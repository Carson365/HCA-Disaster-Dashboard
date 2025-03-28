import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

let femaData = [];
let femaGroup = null;

const femaDataUrl =
    "https://services5.arcgis.com/0HvWfm6i99NZFHqu/arcgis/rest/services/Feeding_America_Food_Banks_17Mar2020_View1/FeatureServer/0/query?outFields=*&where=1%3D1&f=geojson";

export function loadFemaData(mapInstance, svg) {
    d3.json(femaDataUrl)
        .then((data) => {
            femaData = data.features.map((feature) => ({
                Latitude: feature.geometry.coordinates[1],
                Longitude: feature.geometry.coordinates[0],
                Name: feature.properties.Food_Bank_Name, // Corrected field name
                Address: feature.properties.Address,
                City: feature.properties.City,
                State: feature.properties.State,
                Zip: feature.properties.Zip_Code,
                Status: feature.properties.Status, // Used for coloring
            }));
            displayFemaPoints(mapInstance, svg);
        })
        .catch((error) => console.error("Error loading FEMA data:", error));
}

export function displayFemaPoints(mapInstance, svg) {
    if (!mapInstance || !svg) return;

    const topLeft = mapInstance.latLngToLayerPoint(mapInstance.getBounds().getNorthWest());

    // If a group exists but belongs to an old SVG, remove it.
    if (femaGroup && femaGroup.node().ownerSVGElement !== svg.node()) {
        femaGroup.remove();
        femaGroup = null;
    }

    // Create a new group if needed.
    if (!femaGroup) {
        femaGroup = svg.insert("g", ":first-child")
            .attr("class", "fema-layer")
            .style("pointer-events", "auto")
            .style("display", "none");
    }

    let circles = femaGroup.selectAll("circle.fema").data(femaData, (d) => d.Name);

    circles.exit().remove();

    circles.enter()
        .append("circle")
        .attr("class", "fema")
        .attr("r", 5)
        .attr("fill", (d) => getFemaColor(d.Status))
        .style("pointer-events", "auto")
        .merge(circles)
        .attr("cx", (d) => {
            let pt = mapInstance.latLngToLayerPoint([d.Latitude, d.Longitude]);
            return pt.x - topLeft.x;
        })
        .attr("cy", (d) => {
            let pt = mapInstance.latLngToLayerPoint([d.Latitude, d.Longitude]);
            return pt.y - topLeft.y;
        })
        .on("mouseover", (e,d) => showPopup(e, d, mapInstance))
        .on("click", (e, d) => showPopup(e, d, mapInstance))
        .on("mouseout", () => { mapInstance.closePopup(); });
}

function showPopup(event, d, mapInstance) {
    event.stopPropagation();
    L.popup({ closeButton: false })
        .setLatLng([d.Latitude, d.Longitude])
        .setContent(`
            <b>${d.Name}</b><br>
            ${d.Address}<br>
            ${d.City}, ${d.State} ${d.Zip}<br>
            <br>
            <b>Status:</b> <i>${d.Status}</i>
        `)
        .openOn(mapInstance);
}

// Function to assign colors based on status
function getFemaColor(status) {
    switch (status) {
        case "Stable": return "green";
        case "Unstable": return "red";
        case "Stabilizing": return "orange";
        case "At Risk": return "yellow";
        default: return "gray"; // Fallback color for unknown statuses
    }
}

export function updateFemaPositions(mapInstance) {
    if (!femaGroup) return;
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

export function hideFemaPoints() {
    if (femaGroup) {
        femaGroup.style("display", "none");
    }
}

export function showFemaPoints(mapInstance) {
    if (femaGroup) {
        femaGroup.style("display", "block");
        updateFemaPositions(mapInstance);
    }
}
