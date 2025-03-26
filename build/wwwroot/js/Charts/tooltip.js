import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

let tooltipState = {
    vertical: "bottom"
};

// Create one global tooltip element
export function createGlobalTooltip() {
    if (d3.select("#tooltip").empty()) {
        d3.select("body")
            .append("div")
            .attr("id", "tooltip")
            .style("position", "absolute")
            .style("background", "#fff")
            .style("padding", "5px 10px")
            .style("border", "1px solid #ddd")
            .style("border-radius", "5px")
            .style("box-shadow", "0px 0px 5px rgba(0,0,0,0.3)")
            .style("pointer-events", "none")
            .style("opacity", 0);
    }
    hideTooltip();
}

export function showTooltip(content, event) {
    const tooltip = d3.select("#tooltip");
    tooltip.html(content)
        .style("opacity", 1);
    positionTooltip(event);
}

export function hideTooltip() {
    d3.select("#tooltip").style("opacity", 0);
}

export function positionTooltip(event) {
    const tooltip = d3.select("#tooltip");
    const tooltipNode = tooltip.node();
    const rect = tooltipNode.getBoundingClientRect();
    const offset = 10;

    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    const cursorX = event.pageX;
    const cursorY = event.pageY;

    // --- Horizontal Position Interpolation ---
    let left;
    if (cursorX <= screenWidth * 0.15) {
        // Right-aligned tooltip
        left = cursorX + offset;
    } else if (cursorX >= screenWidth * 0.85) {
        // Left-aligned tooltip
        left = cursorX - rect.width - offset;
    } else {
        // Interpolate between right and left
        const t = (cursorX - screenWidth * 0.15) / (screenWidth * 0.7); // Normalize to 0-1
        left = (1 - t) * (cursorX + offset) + t * (cursorX - rect.width - offset);
    }

    // --- Vertical Position (State Machine) ---
    if (cursorY >= screenHeight * 0.75 && tooltipState.vertical !== "top") {
        tooltipState.vertical = "top";
    } else if (cursorY <= screenHeight * 0.25 && tooltipState.vertical !== "bottom") {
        tooltipState.vertical = "bottom";
    }

    let top = tooltipState.vertical === "bottom"
        ? cursorY + offset + 20 // account for mouse height
        : cursorY - rect.height - offset;

    tooltip.style("left", left + "px").style("top", top + "px");
}
