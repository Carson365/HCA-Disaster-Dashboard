import { stateData, countyData } from "../main.js"; // Assuming you have stateData and countyData available

export async function createDamagePieChart(d3, fipsStateCode, fipsCountyCode = null) {
    // Function to filter disasters by state and county code, ensuring no double-counting
    function filterDisasters(data, stateCode, countyCode = null) {
        return data
            .filter(d => d.FIPSStateCode === stateCode && (!countyCode || d.FIPSCountyCode === countyCode))
            .reduce((acc, item) => {
                // Ensure no duplicate DisasterNumbers are counted
                if (!acc.has(item.DisasterNumber)) {
                    acc.set(item.DisasterNumber, item.Damages); // Store the damages (damage categories) to avoid duplicates
                }
                return acc;
            }, new Map());
    }

    // Select the data based on whether we're dealing with a state or county
    const disasterMap = fipsCountyCode
        ? filterDisasters(countyData, fipsStateCode, fipsCountyCode)  // Filter for county-level data
        : filterDisasters(stateData, fipsStateCode);  // Filter for state-level data

    // Aggregate the counts of damage categories
    const damageCategoryCounts = {};

    // Iterate through all disasters and aggregate damage categories
    disasterMap.forEach(damages => {
        damages.forEach(damage => {
            if (damage.DamageCategory !== "N/A") { // Ignore "N/A" categories
                const category = damage.DamageCategory;
                const numProperties = Number(damage.NumberOfProperties);
                if (!isNaN(numProperties) && numProperties > 0) {
                    damageCategoryCounts[category] = (damageCategoryCounts[category] || 0) + numProperties;
                }
            }
        });
    });

    // Convert the damageCategoryCounts into an array of objects
    const dataEntries = Object.entries(damageCategoryCounts).map(([category, count]) => ({ category, count }));

    // Get the total number of properties affected
    const totalProperties = dataEntries.reduce((sum, d) => sum + d.count, 0);

    // Select the container for the chart
    const containerId = fipsCountyCode ? "#countyDamagePieChart" : "#stateDamagePieChart";

    // Function to render the pie chart
    function renderChart() {
        const container = d3.select(containerId);
        container.selectAll("*").remove();  // Clear previous chart content

        const width = container.node().clientWidth * 0.9;  // Adjust width to fit container
        const height = container.node().clientHeight * 0.9;  // Adjust height to fit container
        const radius = Math.min(width, height) / 2.5;  // Set the radius of the pie chart

        // Create SVG container
        const svg = container.append("svg")
            .attr("width", width)
            .attr("height", height)
            .append("g")
            .attr("transform", `translate(${width / 2}, ${height / 2})`);  // Center the pie chart

        // Set up pie chart layout
        const pie = d3.pie().value(d => d.count);
        const pieData = pie(dataEntries);

        // Define arc generator for the pie chart slices
        const arc = d3.arc().innerRadius(0).outerRadius(radius);

        // Set up color scale for the pie chart slices
        const color = d3.scaleOrdinal(d3.schemeCategory10);

        // Add tooltip div for displaying hover information
        const tooltip = d3.select("body").append("div")
            .attr("id", "tooltip")
            .style("position", "absolute")
            .style("background", "#fff")
            .style("padding", "5px 10px")
            .style("border", "1px solid #ddd")
            .style("border-radius", "5px")
            .style("box-shadow", "0px 0px 5px rgba(0,0,0,0.3)")
            .style("pointer-events", "none")
            .style("opacity", 0);

        // Add pie chart slices (paths)
        svg.selectAll("path")
            .data(pieData)
            .enter().append("path")
            .attr("d", arc)  // Apply arc path
            .attr("fill", d => color(d.data.category))  // Set slice color
            .attr("stroke", "white")
            .style("stroke-width", "2px")
            .on("mouseover", function (event, d) {
                const percentage = ((d.data.count / totalProperties) * 100).toFixed(2);
                tooltip.style("opacity", 1)
                    .html(`<strong>${d.data.category}</strong><br>${percentage}% of total properties`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY + 10) + "px");

                d3.select(this).style("opacity", 0.7);  // Highlight the slice on hover
            })
            .on("mousemove", function (event) {
                tooltip.style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY + 10) + "px");
            })
            .on("mouseout", function () {
                tooltip.style("opacity", 0);
                d3.select(this).style("opacity", 1);
            })
            .on("click", function (event, d) {
                // Display the clicked damage category info
                tooltip.style("opacity", 1)
                    .html(`<strong>Damage Category:</strong> ${d.data.category}<br><strong>Total Properties Affected:</strong> ${d.data.count}`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY + 10) + "px");
            });
    }

    renderChart();

    // Resize the chart when the window size changes
    window.addEventListener("resize", renderChart);
}