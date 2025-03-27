import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import { showTooltip, hideTooltip, positionTooltip, createGlobalTooltip } from "./Charts/tooltip.js"; // Import the universal tooltip functions

export function runTree(employeeJson) {
    createGlobalTooltip();

    let rootData = JSON.parse(employeeJson);

    // Create a hierarchy; assume that d.Downs holds child nodes.
    const root = d3.hierarchy(rootData, d => d.Downs);

    // Define container and tree dimensions
    const container = document.querySelector('.treeContainer');
    const containerWidth = container.offsetWidth;
    const containerHeight = container.offsetHeight;
    const treeSize = Math.min(containerWidth, containerHeight); // Keep it square

    const width = treeSize;
    const height = treeSize;
    const spacing = 25; // Radial spacing between levels

    // Place the root at the center
    root.x = width / 2;
    root.y = height / 2;

    // Assign angular positions
    assignArcs(root, 0, 2 * Math.PI, spacing);

    const nodes = root.descendants();
    const links = root.links();

    const depthColors = ["#777", "#FFF", "#07F", "#0F0", "#FF0", "#FFA500", "#F00", "#FFC0CB", "#800080"];

    // Clear previous tree before rendering a new one
    d3.select(".treeContainer").select("svg").remove();

    // Define the zoom behavior with constrained pan
    const zoom = d3.zoom()
        .scaleExtent([0.75, 2]) // Set min and max zoom levels
        .on("zoom", event => {
            g.attr("transform", event.transform);
        });

    // Create the SVG canvas
    const svg = d3.select(".treeContainer")
        .append("svg")
        .attr("width", containerWidth)
        .attr("height", containerHeight)
        .call(zoom);  // Attach zoom behavior

    // Create a group that will hold all visual elements
    const g = svg.append("g");

    // Define the initial transformation to center the tree
    const initialTransform = d3.zoomIdentity
        .translate((containerWidth - width) / 2, (containerHeight - height) / 2)
        .scale(1);

    // Apply the initial transform using the zoom behavior
    svg.call(zoom.transform, initialTransform);

    // Add links (lines between nodes)
    const link = g.append("g")
        .attr("stroke", "#FFF")
        .style("pointer-events", "auto")
        .selectAll("line")
        .data(links)
        .enter()
        .append("line")
        .attr("stroke-width", 0.3);

    // Add nodes as circles
    const node = g.append("g")
        .selectAll("circle")
        .data(nodes)
        .enter()
        .append("circle")
        .attr("r", 2.5)
        .style("pointer-events", "all")
        .attr("fill", d => depthColors[Math.min(d.depth, depthColors.length - 1)])
        .attr("stroke", "#FFF")
        .attr("stroke-width", 0.3)
        .on("mouseenter", function (event, d) {
            var moreDetails = d.data.HireDate !== ""
                ? `<p style="margin:0.5em;"></p>${d.data.Position}<br>Hired ${d.data.HireDate}`
                : "";

            showTooltip(
                `<b>${d.data.Name}</b><br>(${d.data.ID})${moreDetails}`,
                event
            );
        })
        .on("mousemove", function (event) {
            positionTooltip(event);
        })
        .on("mouseleave", function () {
            hideTooltip();
        });

    // Ensure tree nodes are correctly placed
    d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).id(d => d.data.ID).distance(25).strength(0.8))
        .force("charge", d3.forceManyBody().strength(-8))
        .force("radial", d3.forceRadial(
            d => (d.depth ** 0.5 - (0.05 * d3.max(nodes, d => d.depth))) * 100,
            width / 2,
            height / 2
        ).strength(0.2))
        .force("collide", d3.forceCollide().radius(3).strength(0.1))
        .force("toParent", forceToParent(0.25))
        .force("border", borderForce(width - 50, height - 50, 100))
        .on("tick", ticked);

    // Fix the root at the center
    nodes[0].fx = width / 2;
    nodes[0].fy = height / 2;

    function ticked() {
        link.attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);

        node.attr("cx", d => d.x)
            .attr("cy", d => d.y);
    }

    function assignArcs(node, arcStart, arcEnd, spacing) {
        if (node.children && node.children.length > 0) {
            const weights = node.children.map(child =>
                (child.children && child.children.length > 0) ? child.children.length : 1
            );
            const totalWeight = weights.reduce((a, b) => a + b, 0);

            let currentAngle = arcStart;
            node.children.forEach((child, i) => {
                const fraction = weights[i] / totalWeight;
                const childArcWidth = (arcEnd - arcStart) * fraction;
                const childArcStart = currentAngle;
                const childArcEnd = currentAngle + childArcWidth;
                const childAngle = (childArcStart + childArcEnd) / 2;

                child.x = node.x + spacing * Math.cos(childAngle);
                child.y = node.y + spacing * Math.sin(childAngle);

                assignArcs(child, childArcStart, childArcEnd, spacing);
                currentAngle += childArcWidth;
            });
        }
    }

    function forceToParent(strength = 0.1) {
        let nodes;
        function force(alpha) {
            for (let i = 0, n = nodes.length; i < n; ++i) {
                const node = nodes[i];
                if (node.parent) {
                    const dx = node.parent.x - node.x;
                    const dy = node.parent.y - node.y;
                    node.vx += dx * strength * alpha;
                    node.vy += dy * strength * alpha;
                }
            }
        }
        force.initialize = function (_nodes) {
            nodes = _nodes;
        };
        return force;
    }

    function borderForce(width, height, padding = 10) {
        return function (alpha) {
            nodes.forEach(node => {
                const r = 5;
                if (node.x - r < padding) node.vx += (padding - (node.x - r)) * alpha;
                if (node.x + r > width - padding) node.vx -= ((node.x + r) - (width - padding)) * alpha;
                if (node.y - r < padding) node.vy += (padding - (node.y - r)) * alpha;
                if (node.y + r > height - padding) node.vy -= ((node.y + r) - (height - padding)) * alpha;
            });
        };
    }
}