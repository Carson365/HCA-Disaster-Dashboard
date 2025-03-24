import { stateData, countyData, getCountyNameByFips, getStateNameByFips } from "../main.js";
import { showTooltip, hideTooltip, positionTooltip } from "../tooltip.js"; // Import the global tooltip functions

export async function createDamagePieChart(d3, fipsStateCode, fipsCountyCode = null) {
    // Fetch names for title
    let countyName = "";
    if (fipsCountyCode) {
        countyName = await getCountyNameByFips(d3, fipsStateCode, fipsCountyCode);
    }
    let stateName = await getStateNameByFips(fipsStateCode);

    function filterDisasters(data, stateCode, countyCode = null) {
        return data
            .filter(d => d.FIPSStateCode === stateCode && (!countyCode || d.FIPSCountyCode === countyCode))
            .reduce((acc, item) => {
                if (!acc.has(item.DisasterNumber)) {
                    acc.set(item.DisasterNumber, item.Damages);
                }
                return acc;
            }, new Map());
    }

    const disasterMap = fipsCountyCode
        ? filterDisasters(countyData, fipsStateCode, fipsCountyCode)
        : filterDisasters(stateData, fipsStateCode);

    const damageCategoryCounts = {};

    disasterMap.forEach(damages => {
        damages.forEach(damage => {
            if (damage.DamageCategory !== "N/A") {
                const category = damage.DamageCategory;
                const numProperties = Number(damage.NumberOfProperties);
                if (!isNaN(numProperties) && numProperties > 0) {
                    damageCategoryCounts[category] = (damageCategoryCounts[category] || 0) + numProperties;
                }
            }
        });
    });

    const dataEntries = Object.entries(damageCategoryCounts).map(([category, count]) => ({ category, count }));
    const totalProperties = dataEntries.reduce((sum, d) => sum + d.count, 0);
    const containerId = fipsCountyCode ? "#countyDamagePieChart" : "#stateDamagePieChart";

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
            ? `Damage Categories in ${countyName} County`
            : `Damage Categories in ${stateName}`;

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

        svg.selectAll("path")
            .data(pieData)
            .enter().append("path")
            .attr("d", arc)
            .attr("fill", d => color(d.data.category))
            .attr("stroke", "white")
            .style("stroke-width", "2px")
            .on("mouseover", function (event, d) {
                const percentage = ((d.data.count / totalProperties) * 100).toFixed(2);
                showTooltip(`<strong>${d.data.category}</strong><br>${percentage}% of total properties`, event);
                d3.select(this).style("opacity", 0.7);
            })
            .on("mousemove", function (event) {
                positionTooltip(event);
            })
            .on("mouseout", function () {
                hideTooltip();
                d3.select(this).style("opacity", 1);
            })
            .on("click", function (event, d) {
                showTooltip(
                    `<strong>Damage Category:</strong> ${d.data.category}<br><strong>Total Properties Affected:</strong> ${d.data.count}`,
                    event
                );
            });
    }

    renderChart();
    window.addEventListener("resize", renderChart);
}