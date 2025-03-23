export async function createWeatherAlertMap(d3, fipsCode) {
    const container = document.getElementById("stateHeatMap");
    const fipsStateCode = fipsCode.slice(0, 2); // Get the state FIPS code
    
    if (!container) return;

    console.log(`FIPS code for state: ${fipsStateCode}`);

    async function renderWeatherMap() {
        const width = container.clientWidth * 0.95;
        const height = container.clientHeight * 0.95;

        d3.select("#stateHeatMap svg").remove();
        d3.select("#tooltip").remove();

        const svg = d3.select("#stateHeatMap")
            .append("svg")
            .attr("width", width)
            .attr("height", height)
            .attr("viewBox", `0 0 ${width} ${height}`)
            .attr("preserveAspectRatio", "xMinYMin meet");

        const tooltip = d3.select("body").append("div")
            .attr("id", "tooltip")
            .style("position", "absolute")
            .style("background", "white")
            .style("border", "1px solid black")
            .style("padding", "5px")
            .style("font-size", "14px")
            .style("border-radius", "4px")
            .style("pointer-events", "none")
            .style("display", "none");

        // ✅ Updated URL - CORS-Safe State Boundaries GeoJSON
        const stateGeoJsonUrl = "https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json";
        const nwsUrl = "https://api.weather.gov/alerts/active?status=actual&message_type=alert";

        // Load state boundaries and weather alerts
        const [stateData, alertData] = await Promise.all([
            d3.json(stateGeoJsonUrl),
            d3.json(nwsUrl)
        ]);

        // Log state data for inspection
        console.log("State Data:", stateData);

        // Find the state boundary by matching FIPS code with state 'id' property
        const stateBoundary = stateData.features.find(d => d.id === fipsStateCode);

        if (!stateBoundary) {
            console.error(`No boundary found for state FIPS code: ${fipsStateCode}`);
            return;
        }

        const projection = d3.geoMercator().fitSize([width, height], stateBoundary);
        const path = d3.geoPath().projection(projection);

        // Render state boundary (base map)
        svg.selectAll(".state-boundary")
            .data([stateBoundary])
            .enter().append("path")
            .attr("class", "state-boundary")
            .attr("d", path)
            .attr("fill", "#e0e0e0")
            .attr("stroke", "#aaa")
            .attr("stroke-width", 0.5);

        // After rendering the state boundary, render the storm polygons automatically
        loadAndRenderStormPolygons(svg, path, projection, stateBoundary, alertData, tooltip);
    }

    async function loadAndRenderStormPolygons(svg, path, projection, stateBoundary, alertData, tooltip) {
        console.log("Loading and rendering storm polygons...");

        // Filter alerts that have an affected zone inside the state
        const relevantAlerts = alertData.features.filter(alert => {
            if (alert.properties.affectedZones && alert.properties.affectedZones.length > 0) {
                // Filter the alerts by state FIPS code (client-side)
                for (const zone of alert.properties.affectedZones) {
                    if (zone.startsWith(fipsStateCode)) {
                        return true;
                    }
                }
            }
            return false;
        });

        // Log the relevant alerts for the selected state
        console.log("Relevant Alerts:", relevantAlerts);

        // Loop through all relevant alerts
        for (const alert of relevantAlerts) {
            for (const zone of alert.properties.affectedZones) {
                const zoneUrl = `https://api.weather.gov/zones/${zone}`;

                try {
                    // Fetch the affected zone polygon data asynchronously
                    const zoneData = await d3.json(zoneUrl);

                    // Check if the zone data exists and has a polygon geometry
                    if (zoneData && zoneData.geometry && zoneData.geometry.type === "Polygon") {
                        const coordinates = zoneData.geometry.coordinates[0];

                        // Project the coordinates to fit on the map using the provided projection
                        const projectedCoordinates = coordinates.map(coord => projection(coord));

                        // Check if the storm polygon is within the state boundary
                        if (d3.geoContains(stateBoundary, coordinates)) {
                            // Render the storm polygon on the map (Blue color)
                            svg.append("path")
                                .data([zoneData])
                                .attr("class", "storm-polygon")
                                .attr("d", path({ type: "Polygon", coordinates: [projectedCoordinates] })) // Use projected coordinates
                                .attr("fill", "rgba(0, 0, 255, 0.5)") // Blue color for storm polygons
                                .attr("stroke", "#000")
                                .attr("stroke-width", 1)
                                .on("mouseover", function (event, d) {
                                    tooltip.style("display", "block")
                                        .html(`<strong>Storm Event</strong><br>${alert.properties.event}`)
                                        .style("left", `${event.pageX + 10}px`)
                                        .style("top", `${event.pageY - 10}px`);
                                })
                                .on("mousemove", function (event) {
                                    tooltip.style("left", `${event.pageX + 10}px`)
                                        .style("top", `${event.pageY - 10}px`);
                                })
                                .on("mouseout", function () {
                                    tooltip.style("display", "none");
                                });
                        }
                    }
                } catch (err) {
                    console.error("Error fetching zone data:", err);
                }
            }
        }
    }

    renderWeatherMap();
    window.addEventListener("resize", renderWeatherMap);
}