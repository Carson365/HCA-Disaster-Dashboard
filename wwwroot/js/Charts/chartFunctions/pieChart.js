import { stateData, countyData } from "../main.js";
import { showTooltip, positionTooltip, hideTooltip } from "../tooltip.js";

export async function createPieChart(d3, fipsStateCode, fipsCountyCode = null) {

    let countyName = "";
    if(fipsCountyCode){
        countyName = await getCountyNameByFips(d3, fipsStateCode, fipsCountyCode);
    }

    let stateName = await getStateNameByFips(fipsStateCode);

    function filterDisasters(data, stateCode, countyCode = null) {
        return data
            .filter(d => d.FIPSStateCode === stateCode && (!countyCode || d.FIPSCountyCode === countyCode))
            .reduce((acc, item) => {
                if (!acc.has(item.DisasterNumber)) {
                    acc.set(item.DisasterNumber, item.IncidentType); // Count only unique DisasterNumbers
                }
                return acc;
            }, new Map());
    }

    const disasterMap = fipsCountyCode
        ? filterDisasters(countyData, fipsStateCode, fipsCountyCode)
        : filterDisasters(stateData, fipsStateCode);

    const disasterCounts = Array.from(disasterMap.values()).reduce((acc, type) => {
        acc[type] = (acc[type] || 0) + 1;
        return acc;
    }, {});

    const dataEntries = Object.entries(disasterCounts).map(([type, count]) => ({ type, count }));
    const totalDisasters = dataEntries.reduce((sum, d) => sum + d.count, 0);
    const containerId = fipsCountyCode ? "#countyPieChart" : "#statePieChart";

    function renderChart() {
        const container = d3.select(containerId);
        container.selectAll("*").remove();

        const width = container.node().clientWidth * 0.9;
        const height = container.node().clientHeight * 0.9;
        const radius = Math.min(width, height) / 2.5;

        const svg = container.append("svg")
            .attr("width", width)
            .attr("height", height + 50) // Extra space for title
            .append("g")
            .attr("transform", `translate(${width / 2}, ${height / 2 + 40})`);

        // Add dynamic title
        const chartTitle = fipsCountyCode
            ? `County Disaster Types`
            : `State Disaster Types`;

        svg.append("text")
            .attr("x", 0)
            .attr("y", -height / 2 - 0)
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .style("font-weight", "bold")
            .text(chartTitle);

        const pie = d3.pie().value(d => d.count);
        const pieData = pie(dataEntries);

        const arc = d3.arc().innerRadius(0).outerRadius(radius);
        const color = d3.scaleOrdinal(d3.schemeCategory10);

        // Create pie chart slices
        svg.selectAll("path")
            .data(pieData)
            .enter().append("path")
            .attr("d", arc)
            .attr("fill", d => color(d.data.type))
            .attr("stroke", "white")
            .style("stroke-width", "2px")
            .on("mouseover", function (event, d) {
                const percentage = ((d.data.count / totalDisasters) * 100).toFixed(2);
                showTooltip(`<strong>${d.data.type}</strong><br>${percentage}%`, event);
            })
            .on("mousemove", function (event, d) {
                positionTooltip(event);
            })
            .on("mouseout", function () {
                hideTooltip();
            });
    }

    renderChart();
    window.addEventListener("resize", renderChart);
}