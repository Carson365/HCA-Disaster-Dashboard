import { stateData } from "../main.js";
import { showTooltip, hideTooltip, positionTooltip } from "../tooltip.js";

export async function createStateHeatMap(d3, fipsCode) {
    const container = document.getElementById("stateHeatMap");
    if (!container) return;

    function calculateAverageDisastersPerYear(fipsStateCode) {
        const disasters = stateData.filter(d => d.FIPSStateCode === fipsStateCode);

        const countyDisasterCounts = {};

        disasters.forEach(disaster => {
            const { FIPSCountyCode, Year } = disaster;

            if (!FIPSCountyCode || !Year) return;

            // Create full FIPS code (state + county)
            const fullFipsCode = fipsStateCode + FIPSCountyCode;

            if (!countyDisasterCounts[fullFipsCode]) {
                countyDisasterCounts[fullFipsCode] = { totalYears: new Set(), totalDisasters: 0 };
            }

            countyDisasterCounts[fullFipsCode].totalYears.add(Year);
            countyDisasterCounts[fullFipsCode].totalDisasters += 1;
        });

        const countyAverages = {};
        Object.keys(countyDisasterCounts).forEach(countyFips => {
            const { totalYears, totalDisasters } = countyDisasterCounts[countyFips];
            countyAverages[countyFips] = totalYears.size > 0
                ? parseFloat((totalDisasters / totalYears.size).toFixed(2))
                : 0;
        });

        return countyAverages;
    }

    function renderMap() {
        const width = container.clientWidth * 0.95;
        const height = container.clientHeight * 0.95;

        d3.select("#stateHeatMap svg").remove();

        const svg = d3.select("#stateHeatMap")
            .append("svg")
            .attr("width", width)
            .attr("height", height + 40) // Extra space for title
            .append("g")
            .attr("transform", `translate(0, 50)`); // Push map down for title

        // Add dynamic title for state heat map
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", -20)
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .style("font-weight", "bold")
            .text(`Annual Average of Natural Disasters Across Counties`);

        const geojsonUrl = "https://raw.githubusercontent.com/plotly/datasets/master/geojson-counties-fips.json";

        d3.json(geojsonUrl).then(geoData => {
            const stateCounties = {
                type: "FeatureCollection",
                features: geoData.features.filter(d => d.properties.STATE === fipsCode)
            };

            // Get disaster averages using the new function
            const countyDisasterAverages = calculateAverageDisastersPerYear(fipsCode);

            const validDisasterValues = Object.entries(countyDisasterAverages)
                .filter(([countyFips]) => !countyFips.endsWith("000")) // Exclude counties with "000"
                .map(([_, avg]) => avg);

            const minDisasters = d3.min(validDisasterValues);
            const maxDisasters = d3.max(validDisasterValues);

            const colorScale = d3.scaleSequential(d3.interpolateReds)
                .domain([Math.log(minDisasters + 1), Math.log(maxDisasters + 1)]);

            const projection = d3.geoMercator().rotate([160, 0]).fitSize([width, height - 40], stateCounties);

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
                    // Highlight the county on hover
                    d3.select(this)
                        .attr("stroke", "#ff0") // Change stroke to yellow
                        .attr("stroke-width", 2) // Make the stroke wider
                        .raise(); // Move this element to the top layer

                    const countyFips = d.properties.STATE + d.properties.COUNTY;
                    const avgDisasters = countyDisasterAverages[countyFips];
                    showTooltip(
                        `<strong>${d.properties.NAME} County</strong><br>Avg Disasters/Year: ${avgDisasters || 'No data'}`,
                        event
                    );
                    //d3.select(this).style("opacity", 0.7);
                })
                .on("mousemove", function (event) {
                    positionTooltip(event);
                })
                .on("mouseout", function () {
                    // Reset highlight on mouseout
                    d3.select(this)
                        .attr("stroke", "#000") // Reset stroke to black
                        .attr("stroke-width", 1); // Reset stroke width to default
                    hideTooltip();
                    d3.select(this).style("opacity", 1);
                });
        });
    }

    renderMap();
    window.addEventListener("resize", renderMap);
}