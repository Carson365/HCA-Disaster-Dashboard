import { getAverageDisastersPerYearByCounty } from "../script.js"

export async function createStateHeatMap(d3, fipsCode) {
    const container = document.getElementById("stateHeatMap");
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const svg = d3.select("#stateHeatMap")
        .append("svg")
        .attr("width", "95%")
        .attr("height", "95%")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("preserveAspectRatio", "xMinYMin meet");

    svg.selectAll("*").remove();
    d3.select("#tooltip").remove();

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

    const geojsonUrl = "https://raw.githubusercontent.com/plotly/datasets/master/geojson-counties-fips.json";

    try {
        const geoData = await d3.json(geojsonUrl);
        const stateCounties = {
            type: "FeatureCollection",
            features: geoData.features.filter(d => d.properties.STATE === fipsCode)
        };

        if (stateCounties.features.length === 0) {
            console.error("No counties found for FIPS code:", fipsCode);
            return;
        }

        const countyDisasterAverages = getAverageDisastersPerYearByCounty(fipsCode);
        const minDisasters = d3.min(Object.values(countyDisasterAverages));
        const maxDisasters = d3.max(Object.values(countyDisasterAverages));

        const colorScale = d3.scaleSequential(d3.interpolateReds)
            .domain([Math.log(minDisasters + 1), Math.log(maxDisasters + 1)]);

        const projection = d3.geoMercator().fitSize([width, height], stateCounties);
        const path = d3.geoPath().projection(projection);

        svg.selectAll("path")
            .data(stateCounties.features)
            .enter().append("path")
            .attr("d", path)
            .attr("fill", d => {
                const countyFips = d.properties.STATE + d.properties.COUNTY;
                const avgDisasters = countyDisasterAverages[countyFips];
                return avgDisasters ? colorScale(Math.log(avgDisasters + 1)) : "#cccccc";
            })
            .attr("stroke", "#000")
            .attr("stroke-width", 1)
            .on("mouseover", function (event, d) {
                const countyFips = d.properties.STATE + d.properties.COUNTY;
                const avgDisasters = countyDisasterAverages[countyFips];
                tooltip.style("display", "block")
                    .html(`<strong>${d.properties.NAME} County</strong><br>Avg Disasters/Year: ${avgDisasters || 'No data'}`)
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
    } catch (error) {
        console.error("Error loading GeoJSON:", error);
    }
}