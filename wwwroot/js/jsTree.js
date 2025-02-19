import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

export function runTree(employeeJson) {
    let rootData = JSON.parse(employeeJson);

    // Create a hierarchy; assume that d.Downs holds child nodes.
    const root = d3.hierarchy(rootData, d => d.Downs);

    const totalNodes = root.descendants().length;

    // Define dimensions and parameters.
    const width = 1200;
    const height = 750;
    const spacing = 50; // radial spacing between levels

    // Place the root at the center.
    root.x = width / 2;
    root.y = height / 2;

    // The root is allocated the full circle: [0, 2π].
    // Then recursively allocate angular slices to each child.
    assignArcs(root, 0, 2 * Math.PI, spacing);

    // Extract nodes and links for D3.
    const nodes = root.descendants();
    const links = root.links();

    // Set up the SVG canvas.
    d3.select(".container").select("svg").remove(); // clear previous tree
    const svg = d3.select(".container")
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    // Define a tooltip element for hover popups.
    const tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("z-index", "1000") // Bring tooltip to the front
    .style("background", "#333")
    .style("color", "#FFF")
    .style("padding", "5px")
    .style("border-radius", "5px")
    .style("font-size", "12px")
    .style("visibility", "hidden");

    // Add links (lines between nodes).
    const link = svg.append("g")
        .attr("stroke", "#FFF")
        .style("pointer-events", "auto")
        .selectAll("line")
        .data(links)
        .enter()
        .append("line")
        .attr("stroke-width", 0.3);

    const depthColors = ["#777", "#FFF", "#07F", "#0F0", "#FF0", "#FFA500", "#F00", "#FFC0CB", "#800080"];

    // Add nodes as circles and attach tooltip event handlers.
    const node = svg.append("g")
        .selectAll("circle")
        .data(nodes)
        .enter()
        .append("circle")
        .attr("r", 2.5)  // increased radius for easier interaction
        .style("pointer-events", "all")
        .attr("fill", d => depthColors[Math.min(d.depth, depthColors.length - 1)])  // Cap depth at last color
        .attr("stroke", "#FFF")  // White outline
        .attr("stroke-width", 0.3)
        .on("mouseover", function (event, d) {
            // Update the tooltip content.
            tooltip.html(`
                <b>${d.data.Name}</b><br>
                <b>ID:</b> ${d.data.ID}
            `)
                .style("visibility", "visible");
        })
        .on("mousemove", function (event) {
            // Position the tooltip near the cursor.
            tooltip.style("top", (event.pageY + 10) + "px")
                .style("left", (event.pageX + 10) + "px");
        })
        .on("mouseout", function () {
            tooltip.style("visibility", "hidden");
        });

    // (Optional) Set up a force simulation.
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

    // Fix the root at the center.
    nodes[0].fx = width / 2;
    nodes[0].fy = height / 2;

    // Update positions on each simulation tick.
    function ticked() {
        link.attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);

        node.attr("cx", d => d.x)
            .attr("cy", d => d.y);
    }

    /**
     * Recursively allocate angular slices to a node’s children.
     *
     * @param {object} node - The current node (a d3.hierarchy node).
     * @param {number} arcStart - The starting angle (in radians) of the allocated arc.
     * @param {number} arcEnd - The ending angle of the allocated arc.
     * @param {number} spacing - The radial distance from parent to child.
     */
    function assignArcs(node, arcStart, arcEnd, spacing) {
        if (node.children && node.children.length > 0) {
            // For each child, define a weight based on the number of children
            // at the next level. For leaves, default the weight to 1.
            const weights = node.children.map(child =>
                (child.children && child.children.length > 0) ? child.children.length : 1
            );
            const totalWeight = weights.reduce((a, b) => a + b, 0);

            let currentAngle = arcStart;
            node.children.forEach((child, i) => {
                // The fraction of the parent's arc this child will receive.
                const fraction = weights[i] / totalWeight;
                const childArcWidth = (arcEnd - arcStart) * fraction;
                const childArcStart = currentAngle;
                const childArcEnd = currentAngle + childArcWidth;
                // Place the child at the midpoint of its allocated arc.
                const childAngle = (childArcStart + childArcEnd) / 2;

                // Position the child relative to the parent's position.
                child.x = node.x + spacing * Math.cos(childAngle);
                child.y = node.y + spacing * Math.sin(childAngle);

                // Recursively assign angular slices for the child's children.
                assignArcs(child, childArcStart, childArcEnd, spacing);

                currentAngle += childArcWidth;
            });
        }
    }

    // Custom force to attract nodes to their parent positions.
    function forceToParent(strength = 0.1) {
        let nodes;
        function force(alpha) {
            for (let i = 0, n = nodes.length; i < n; ++i) {
                const node = nodes[i];
                if (node.parent) { // Only if there is a parent.
                    // Calculate the difference between parent's and child's positions.
                    const dx = node.parent.x - node.x;
                    const dy = node.parent.y - node.y;
                    // Adjust velocities to pull the node toward its parent.
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

    // Custom force to keep nodes within a border.
    function borderForce(width, height, padding = 10) {
        return function (alpha) {
            nodes.forEach(node => {
                const r = 5; // Node radius.
                // Push back if node is beyond left or right bounds.
                if (node.x - r < padding) node.vx += (padding - (node.x - r)) * alpha;
                if (node.x + r > width - padding) node.vx -= ((node.x + r) - (width - padding)) * alpha;
                // Push back if node is beyond top or bottom bounds.
                if (node.y - r < padding) node.vy += (padding - (node.y - r)) * alpha;
                if (node.y + r > height - padding) node.vy -= ((node.y + r) - (height - padding)) * alpha;
            });
        };
    }
}
