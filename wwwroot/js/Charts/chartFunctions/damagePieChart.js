import { stateData, countyData } from "../main.js";
import { showTooltip, hideTooltip, positionTooltip } from "../tooltip.js"; // Import the global tooltip functions

export async function createDamagePieChart(d3, fipsStateCode, fipsCountyCode = null) {

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
            ? `County Damage Categories`
            : `State Damage Categories`;

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
                // Show tooltip with damage category, percentage and number of properties
                const percentage = ((d.data.count / totalProperties) * 100).toFixed(2);
                showTooltip(
                    `<strong>Damage Category:</strong> ${d.data.category}<br><strong>Percentage:</strong> ${percentage}%<br><strong>Properties Affected:</strong> ${d.data.count}`,
                    event
                );
                d3.select(this).style("opacity", 0.7); // Highlight on hover
            })
            .on("mousemove", function (event) {
                positionTooltip(event);
            })
            .on("mouseout", function () {
                hideTooltip(); // Hide tooltip on mouseout
                d3.select(this).style("opacity", 1); // Reset opacity
            });

        // Add labels for sections that have more than 10% of the total
        svg.selectAll("text.label")
            .data(pieData)
            .enter().append("text")
            .attr("class", "label")
            .attr("transform", function(d) {
                const centroid = arc.centroid(d);
                return `translate(${centroid[0]}, ${centroid[1]})`;
            })
            .attr("text-anchor", "middle")
            .attr("dy", ".35em")
            .style("font-size", "14px") // Font size increased for better readability
            .style("font-weight", "bold") // Making the font weight bold
            .style("fill", "white") // Set the text color to white
            .style("stroke", "none") // No stroke around text
            .style("stroke-width", "0px")
            .style("pointer-events", "none") // Allow mouse events to pass through
            .html(function(d) {
                // Only show text if the slice represents more than 10% of the total
                return ((d.data.count / totalProperties) * 100) >= 10 ? wrapText(d.data.category, 10) : ""; // Only show if greater than 10%
            });

        // Function to wrap text by words and add <br> if necessary
        function wrapText(text, maxLength) {
            const words = text.split(" ");
            let currentLine = "";
            let result = [];

            words.forEach(word => {
                // Check if adding the word exceeds maxLength
                if ((currentLine + word).length > maxLength) {
                    result.push(currentLine); // Push current line to result
                    currentLine = word; // Start a new line with the word
                } else {
                    currentLine = currentLine ? currentLine + " " + word : word; // Append word to the current line
                }
            });
            if (currentLine) result.push(currentLine); // Add any remaining line

            // Join the lines with <br> to create line breaks in HTML
            return result.join("<br>");
        }
    }

    renderChart();
    window.addEventListener("resize", renderChart);
}