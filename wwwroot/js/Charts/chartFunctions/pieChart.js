import { stateData, countyData } from "../main.js";
import { showTooltip, positionTooltip, hideTooltip } from "../tooltip.js";

export async function createPieChart(d3, fipsStateCode, fipsCountyCode = null) {

<<<<<<< Updated upstream
=======
    let countyName = "";
    if(fipsCountyCode){
        countyName = await getCountyNameByFips(d3, fipsStateCode, fipsCountyCode);
    }

    let stateName = await getStateNameByFips(fipsStateCode);

>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
                d3.select(this).style("opacity", 0.7);
=======
                
                // Highlight hovered section
                d3.select(this)
                    .style("opacity", 0.7) // Reduce opacity for highlighting
                    .style("stroke-width", "3px"); // Increase border width
>>>>>>> Stashed changes
            })
            .on("mousemove", function (event, d) {
                positionTooltip(event);
            })
            .on("mouseout", function () {
                hideTooltip();
<<<<<<< Updated upstream
                d3.select(this).style("opacity", 1);
=======
                // Reset the highlighting
                d3.select(this)
                    .style("opacity", 1)
                    .style("stroke-width", "2px");
>>>>>>> Stashed changes
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
            .html(function(d) {
                // Only show text if the slice represents more than 10% of the total
                return ((d.data.count / totalDisasters) * 100) >= 15 ? wrapText(d.data.type, 10) : ""; // Only show if greater than 10%
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
            return result.join("\n");
        }
    }

    renderChart();
    window.addEventListener("resize", renderChart);
}