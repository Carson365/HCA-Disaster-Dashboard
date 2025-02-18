import { sendToDotNet, mapInstance } from "./runMapThings.js";
import { countyLayer } from "./countyUtils.js";
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

export class Hex {
    constructor(color, place, anchorX, anchorY) {
        this.place = place;
        this.defaultColor = color;
        this.currentColor = color;
        this.anchorX = anchorX;
        this.anchorY = anchorY;
        this.x = anchorX;
        this.y = anchorY;
        this.selected = false;
        this.hidden = false;
        this.size = (place.Size ** 0.25) * 2;
    }

    select() {
        this.selected = true;
        this.currentColor = "white";
        const fipCode = this.getFipCode();
        sendToDotNet(fipCode, this.place);
    }

    deselect() {
        this.selected = false;
        this.currentColor = this.hidden ? "black" : this.defaultColor;
        sendToDotNet(null);
    }

    hide() {
        this.hidden = true;
        if (!this.selected) this.currentColor = "black";
    }

    show() {
        this.hidden = false;
        if (!this.selected) this.currentColor = this.defaultColor;
    }

    updateAnchor() {
        const pt = mapInstance.latLngToLayerPoint([
            this.place.Latitude,
            this.place.Longitude,
        ]);
        this.anchorX = pt.x;
        this.anchorY = pt.y;
    }

    getFipCode() {
        if (!countyLayer) return null;
        const lat = this.place.Latitude;
        const lon = this.place.Longitude;

        let foundFipCode = null;
        countyLayer.eachLayer((layer) => {
            if (d3.geoContains(layer.feature, [lon, lat])) {
                const props = layer.feature.properties;
                foundFipCode = `${props.STATEFP}${props.COUNTYFP}`;
            }
        });

        return foundFipCode;
    }
}

export function generateHexagon(x, y, size) {
    const angle = Math.PI / 3;
    return Array.from({ length: 6 }, (_, i) => {
        const px = x + size * Math.cos(angle * i);
        const py = y + size * Math.sin(angle * i);
        return `${px},${py}`;
    }).join(" ");
}
