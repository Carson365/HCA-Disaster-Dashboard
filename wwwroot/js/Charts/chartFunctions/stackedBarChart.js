import { getAverageDisastersPerMonth } from "../script.js"
import { getAverageCountyDisastersPerMonth } from "../script.js"
import { getStateAbbreviationByFips } from '../script.js';
import { getCountyNameByFips } from '../script.js'


export function createStackedBarChart(d3, fipsStateCode, fipsCountyCode) {
    function renderChart() {
        const container = document.getElementById("stackedBarChart");
        if (!container) return;
        
        d3.select("#stackedBarChart").selectAll("*").remove();
        
        const width = container.clientWidth * 0.9;
        const height = container.clientHeight * 0.9;
        
        const margin = { top: 50, right: 20, bottom: 50, left: 50 };
        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;
        
        const svg = d3.select("#stackedBarChart")
            .append("svg")
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("viewBox", `0 0 ${width} ${height}`)
            .attr("preserveAspectRatio", "xMidYMid meet");
        
        const stateData = Object.entries(getAverageDisastersPerMonth(fipsStateCode))
            .map(([month, average]) => ({ month, average: +average, type: 'State' }));
        
        const countyData = Object.entries(getAverageCountyDisastersPerMonth(fipsStateCode, fipsCountyCode))
            .map(([month, average]) => ({ month, average: +average, type: 'County' }));
        
        const data = [...stateData, ...countyData].sort((a, b) => +a.month - +b.month);
        
        const xScale = d3.scaleBand()
            .domain([...new Set(data.map(d => d.month))])
            .range([margin.left, innerWidth])
            .padding(0.2);
        
        const yScale = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.average)])
            .nice()
            .range([innerHeight, margin.top]);
        
        const colorScale = d3.scaleOrdinal()
            .domain(['State', 'County'])
            .range(['purple', '#00BFFF']);
        
        const tooltip = d3.select("#stackedBarChart")
            .append("div")
            .style("position", "absolute")
            .style("background", "lightgray")
            .style("padding", "5px")
            .style("border-radius", "5px")
            .style("display", "none");
        
        svg.selectAll("rect")
            .data(data)
            .enter().append("rect")
            .attr("x", d => xScale(d.month) + (d.type === 'County' ? xScale.bandwidth() / 2 : 0))
            .attr("y", innerHeight)
            .attr("width", xScale.bandwidth() / 2)
            .attr("height", 0)
            .attr("fill", d => colorScale(d.type))
            .on("mouseover", async function (event, d) {
                const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                const name = d.type === 'State' ? getStateAbbreviationByFips(fipsStateCode) : await getCountyNameByFips(fipsStateCode, fipsCountyCode);
                tooltip.style("display", "block")
                    .html(`<strong>Month:</strong> ${monthNames[+d.month - 1]}<br><strong>Avg Disasters:</strong> ${d.average}<br><strong>${d.type}:</strong> ${name}`)
                    .style("left", `${event.pageX + 10}px`)
                    .style("top", `${event.pageY - 20}px`);
                d3.select(this).attr("fill", "#0056b3");
            })
            .on("mouseout", function () {
                tooltip.style("display", "none");
                d3.select(this).attr("fill", d => colorScale(d.type));
            })
            .transition().duration(1000)
            .attr("y", d => yScale(d.average))
            .attr("height", d => innerHeight - yScale(d.average));
        
        svg.append("g")
            .attr("transform", `translate(0,${innerHeight})`)
            .call(d3.axisBottom(xScale).tickFormat(d => ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][+d - 1]))
            .selectAll("text").style("font-size", "12px");
        
        svg.append("g")
            .attr("transform", `translate(${margin.left},0)`)
            .call(d3.axisLeft(yScale).ticks(10));
        
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", margin.top / 2)
            .attr("text-anchor", "middle")
            .style("font-size", "18px")
            .style("font-weight", "bold")
            .text(`Avg Natural Disasters By Month in ${getStateAbbreviationByFips(fipsStateCode)}`);
    }
    
    renderChart();
    window.addEventListener("resize", renderChart);
}
