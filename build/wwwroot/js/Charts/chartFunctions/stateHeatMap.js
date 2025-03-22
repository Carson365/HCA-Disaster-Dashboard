import { stateData, countyData } from "../main.js";

export async function createStateHeatMap(d3, fipsCode) {
    const container = document.getElementById("stateHeatMap");
    if (!container) return;

    function calculateAverageDisastersPerYear(fipsStateCode) {
        const disasters = stateData.filter(d => d.FIPSStateCode === fipsStateCode);

        if (!disasters.length) {
            console.log(`No disaster data found for state FIPS code: ${fipsStateCode}`);
            return {};
        }

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


            console.log(countyDisasterAverages)

            console.log(maxDisasters)

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
        });
    }

    renderMap();
    window.addEventListener("resize", renderMap);
}
