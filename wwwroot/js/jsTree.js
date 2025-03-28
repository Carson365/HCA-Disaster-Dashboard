﻿import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import { showTooltip, hideTooltip, positionTooltip, createGlobalTooltip } from "./Charts/tooltip.js"; // Import the universal tooltip functions

let storedInstance = null;
export function setDNCallback(dotNetHelper) {
    storedInstance = dotNetHelper;
}

function sendToDotNet(empID) {
    if (storedInstance) {
        storedInstance.invokeMethodAsync('SelectEmployee', empID);
    }
}

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
    //const depthColors = ["#777", "#FFF", "#F00", "#FFA500", "#FF0", "#0F0", "#07F", "#800080", "#FFC0CB"]

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
        .call(zoom)  // Attach zoom behavior
        .on("click", function () {
            sendToDotNet(""); // Send blank ID if clicked anywhere else
        });

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
        })
        .on("click", function (event, d) {
            event.stopPropagation(); // Prevent triggering the SVG click event
            sendToDotNet(d.data.ID); // Send only the employee ID
        });

    const simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).id(d => d.data.ID).distance(40).strength(0.4))
        .force("charge", d3.forceManyBody().strength(-8))
        .force("collide", d3.forceCollide().radius(3.01).strength(0.45))
        .force("toParent", forceToParent(0.1))
        .force("border", borderForce(width - 50, height - 50, 80))
        .force("radialBand", radialBandForce(35, 20, 80))
        .force("radial", d3.forceRadial(
            d => (d.depth ** 0.4 - (0.2 * d3.max(nodes, d => d.depth))) * 50,
            width / 2,
            height / 2
        ).strength(0.1))
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

        // Stop simulation when velocity is low
        let avgVelocity = d3.mean(nodes, d => Math.sqrt(d.vx * d.vx + d.vy * d.vy));
        if (avgVelocity < 0.08) { // Adjust threshold as needed
            simulation.stop();
        }
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

    function radialBandForce(var1, var2, strength = 0.1) {
        let nodes;
        function force(alpha) {
            for (let i = 0, n = nodes.length; i < n; ++i) {
                const node = nodes[i];
                if (node.depth === 0) continue; // Keep root fixed

                const depthMultiplier = 1 + 0.5 / node.depth; // Adjust space based on depth
                const targetRadius = node.depth * var1 * depthMultiplier;
                const minRadius = targetRadius - var2 / 2;
                const maxRadius = targetRadius + var2 / 2;

                const dx = node.x - width / 2;
                const dy = node.y - height / 2;
                let dist = Math.sqrt(dx * dx + dy * dy);

                let forceFactor = 0;
                if (dist < minRadius) {
                    forceFactor = (minRadius - dist) / minRadius;
                } else if (dist > maxRadius) {
                    forceFactor = (maxRadius - dist) / maxRadius;
                }

                const normX = dx / (dist || 1);
                const normY = dy / (dist || 1);

                node.vx += normX * forceFactor * strength * alpha;
                node.vy += normY * forceFactor * strength * alpha;
            }
        }
        force.initialize = function (_nodes) {
            nodes = _nodes;
        };
        return force;
    }



}



export function highlightEmployee(empID) {
    // Remove highlight from all nodes
    d3.selectAll("circle").classed("highlight", false);
    // Find and highlight the node with the matching employee ID
    if (empID != null) {
        d3.selectAll("circle")
            .filter(d => d.data.ID === empID)
            .classed("highlight", true)
            .raise();
    }
}



export function grayOutEmployee(empID) {
    if (!empID) return;

    d3.selectAll("circle")
        .filter(d => d.data.ID === empID || isDescendant(d, empID))
        .attr("fill", "#888");  // Gray color

    function isDescendant(node, targetID) {
        if (!node.parent) return false;
        if (node.parent.data.ID === targetID) return true;
        return isDescendant(node.parent, targetID);
    }
}
