import { sendToDotNet, mapInstance }  from "./runMapThings.js";

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
        sendToDotNet(this.place);
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
}