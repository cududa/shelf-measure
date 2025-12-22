import { CONFIG } from './config.js';
import { State } from './state.js';
import { Layout } from './layout.js';
import { Units } from './units.js';

export const Template = {
    // Letter paper dimensions in inches
    pageWidth: 8.5,
    pageHeight: 11,

    /**
     * Generate the complete SVG template
     * @returns {string} SVG markup
     */
    generateSVG() {
        const b = CONFIG.bracket;
        const shiftInfo = Layout.optimalShift();
        const shift = shiftInfo.shift;
        // pipeDistance is inside-to-inside, so center-to-center = pipeDistance + diameter
        const pipeCenterToCenter = State.pipeDistance + CONFIG.pipe.diameter;
        const shelfOverhang = (CONFIG.shelf.width - pipeCenterToCenter) / 2;
        const holeCenterFromBracketCenter = b.width / 2 - b.holes.left;
        const bracketTopInset = Layout.bracketYTopView('top');

        // Key measurements
        const bracketEdgeFromShelfEdge = shift + b.width / 2 - shelfOverhang;
        const innerHoleFromShelfEdge = shelfOverhang - shift + holeCenterFromBracketCenter;

        // Use 72 DPI for coordinate system (standard print DPI)
        // This gives us 612 x 792 pixels for 8.5" x 11"
        const dpi = 72;
        const pageWidthPx = this.pageWidth * dpi;
        const pageHeightPx = this.pageHeight * dpi;

        let svg = `<svg xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 ${pageWidthPx} ${pageHeightPx}"
            width="${pageWidthPx}pt"
            height="${pageHeightPx}pt"
            style="background: white;">
            <style>
                .shelf-edge { stroke: #333; stroke-width: 1.5; stroke-dasharray: 7 4; }
                .bracket { fill: none; stroke: #444; stroke-width: 1; }
                .drill-hole { fill: none; stroke: #000; stroke-width: 1.5; }
                .crosshair { stroke: #000; stroke-width: 0.75; }
                .scale-box { fill: none; stroke: #000; stroke-width: 1.5; }
                .dimension-line { stroke: #666; stroke-width: 0.75; }
                .dimension-text { font-family: sans-serif; font-size: 9px; fill: #333; }
                .label { font-family: sans-serif; font-size: 11px; fill: #333; font-weight: bold; }
                .info-text { font-family: sans-serif; font-size: 8px; fill: #555; }
                .corner-mark { stroke: #000; stroke-width: 3; }
            </style>`;

        // Add 1" scale reference square (convert inches to pixels) near top-left margin
        svg += this.drawScaleReference(pageWidthPx - 1.8 * dpi, pageHeightPx - 1.8 * dpi, dpi);

        // Add title and pipe distance
        const shelfLabel = State.shelfNumber ? `Shelf ${State.shelfNumber} ` : '';
        svg += `<text x="${pageWidthPx / 2}" y="${0.5 * dpi}" class="label" text-anchor="middle" style="font-size: 14px;">${shelfLabel}Bracket Drilling Template</text>`;
        svg += `<text x="${pageWidthPx / 2}" y="${0.5 * dpi + 16}" class="label" text-anchor="middle" style="font-size: 11px;">Pipe Distance: ${State.pipeDistance}, ${Units.formatWithFraction(State.pipeDistance)}</text>`;

        const templateCenterX = pageWidthPx / 2;
        const templateOffsetX = 3.2 * dpi;
        const templateY = 1.6 * dpi;

        // Left corner template (positioned symmetrically about center)
        svg += this.drawCornerTemplate(false, templateCenterX - templateOffsetX, templateY, bracketEdgeFromShelfEdge, innerHoleFromShelfEdge, bracketTopInset, dpi);

        // Right corner template
        svg += this.drawCornerTemplate(true, templateCenterX + templateOffsetX, templateY, bracketEdgeFromShelfEdge, innerHoleFromShelfEdge, bracketTopInset, dpi);

        // Add measurements info at bottom
        svg += this.drawMeasurementsInfo(bracketEdgeFromShelfEdge, innerHoleFromShelfEdge, dpi, pageWidthPx);

        // Add usage instructions
        svg += this.drawInstructions(dpi, pageWidthPx);

        svg += '</svg>';
        return svg;
    },

    /**
     * Draw 1" x 1" scale reference square
     * @param {number} x - X position in pixels
     * @param {number} y - Y position in pixels
     * @param {number} dpi - Dots per inch for conversion
     */
    drawScaleReference(x, y, dpi) {
        const size = 1 * dpi; // 1 inch in pixels
        return `
            <g id="scale-reference">
                <rect x="${x}" y="${y}" width="${size}" height="${size}" class="scale-box"/>
                <text x="${x + size/2}" y="${y + size + 12}" class="info-text" text-anchor="middle">1" x 1" (verify scale)</text>
            </g>`;
    },

    /**
     * Draw a corner template (shelf corner + bracket + holes)
     * @param {boolean} isRight - true for right corner (mirrored)
     * @param {number} x - center X position in pixels
     * @param {number} y - top Y position in pixels
     * @param {number} bracketEdge - distance from shelf edge to bracket outer edge (inches)
     * @param {number} innerHole - distance from shelf edge to inner hole center (inches)
     * @param {number} bracketInset - distance from shelf top edge to bracket top (inches)
     * @param {number} dpi - Dots per inch for conversion
     */
    drawCornerTemplate(isRight, x, y, bracketEdge, innerHole, bracketInset, dpi) {
        const b = CONFIG.bracket;
        const interiorDir = isRight ? -1 : 1;
        const boardHorizontalPreview = 3 * dpi;
        const bracketInsetPx = bracketInset * dpi;

        // Convert bracket dimensions to pixels
        const bracketWidthPx = b.width * dpi;
        const bracketLengthPx = b.length * dpi;
        const holeDiameterPx = b.holeDiameter * dpi;
        // Hole offsets from each edge
        const holeLeftPx = b.holes.left * dpi;
        const holeRightPx = b.holes.right * dpi;
        const holeTopPx = b.holes.top * dpi;
        const holeBottomPx = b.holes.bottom * dpi;
        const bracketEdgePx = bracketEdge * dpi;

        // Ensure the board preview extends past the bracket
        const minBoardDepthPx = bracketInsetPx + bracketLengthPx + dpi * 0.5;
        const boardVerticalPreview = Math.max(3 * dpi, minBoardDepthPx);

        let g = `<g id="${isRight ? 'right' : 'left'}-corner" transform="translate(${x}, ${y})">`;

        // Label
        const labelAnchor = isRight ? 'end' : 'start';
        const labelX = isRight ? -0.2 * dpi : 0.2 * dpi;
        g += `<text x="${labelX}" y="-24" class="label" text-anchor="${labelAnchor}">${isRight ? 'RIGHT' : 'LEFT'} CORNER</text>`;

        // Draw board reference - the shelf edges extending a few inches
        g += `<line x1="0" y1="0" x2="${interiorDir * boardHorizontalPreview}" y2="0" class="corner-mark"/>`;
        g += `<line x1="0" y1="0" x2="0" y2="${boardVerticalPreview}" class="corner-mark"/>`;

        // Calculate bracket position in pixels
        const outerEdge = isRight ? bracketEdgePx : -bracketEdgePx;
        const innerEdge = outerEdge + interiorDir * bracketWidthPx;
        const bracketX = Math.min(outerEdge, innerEdge);
        const bracketY = bracketInsetPx;

        // Draw bracket outline
        g += `<rect x="${bracketX}" y="${bracketY}" width="${bracketWidthPx}" height="${bracketLengthPx}" class="bracket"/>`;

        // Draw the 4 drill holes with crosshairs
        const holes = [
            { x: bracketX + holeLeftPx, y: bracketY + holeTopPx },
            { x: bracketX + bracketWidthPx - holeRightPx, y: bracketY + holeTopPx },
            { x: bracketX + holeLeftPx, y: bracketY + bracketLengthPx - holeBottomPx },
            { x: bracketX + bracketWidthPx - holeRightPx, y: bracketY + bracketLengthPx - holeBottomPx }
        ];

        holes.forEach((hole) => {
            g += this.drawHole(hole.x, hole.y, holeDiameterPx);
        });

        // Draw dimension line from shelf edge to bracket outer edge
        const dimY = bracketY + bracketLengthPx + 35;
        const dimensionEndX = isRight ? bracketEdgePx : -bracketEdgePx;
        g += this.drawDimension(0, dimY, dimensionEndX, dimY, Units.formatWithFraction(bracketEdge), 14);

        g += '</g>';
        return g;
    },

    /**
     * Draw a drill hole with crosshairs
     * @param {number} cx - Center X in pixels
     * @param {number} cy - Center Y in pixels
     * @param {number} diameter - Hole diameter in pixels
     */
    drawHole(cx, cy, diameter) {
        const r = diameter / 2;
        const crossLen = r + 6; // Crosshairs extend 6px beyond hole

        return `
            <circle cx="${cx}" cy="${cy}" r="${r}" class="drill-hole"/>
            <line x1="${cx - crossLen}" y1="${cy}" x2="${cx + crossLen}" y2="${cy}" class="crosshair"/>
            <line x1="${cx}" y1="${cy - crossLen}" x2="${cx}" y2="${cy + crossLen}" class="crosshair"/>`;
    },

    /**
     * Draw a dimension line with label
     * All coordinates in pixels
     */
    drawDimension(x1, y1, x2, y2, label, textOffset) {
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;

        return `
            <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="dimension-line"/>
            <line x1="${x1}" y1="${y1 - 4}" x2="${x1}" y2="${y1 + 4}" class="dimension-line"/>
            <line x1="${x2}" y1="${y2 - 4}" x2="${x2}" y2="${y2 + 4}" class="dimension-line"/>
            <text x="${midX}" y="${midY + textOffset}" class="dimension-text" text-anchor="middle">${label}</text>`;
    },

    /**
     * Draw measurements info section
     * @param {number} bracketEdge - Bracket edge distance in inches
     * @param {number} innerHole - Inner hole distance in inches
     * @param {number} dpi - Dots per inch
     * @param {number} pageWidthPx - Page width in pixels
     */
    drawMeasurementsInfo(bracketEdge, innerHole, dpi, pageWidthPx) {
        const y = 7.5 * dpi;
        const centerX = pageWidthPx / 2;
        return `
            <g id="measurements">
                <text x="${centerX}" y="${y}" class="label" text-anchor="middle">Key Measurements</text>
                <text x="${centerX}" y="${y + 18}" class="info-text" text-anchor="middle">Bracket outer edge from shelf edge: ${Units.formatWithFraction(bracketEdge)}</text>
                <text x="${centerX}" y="${y + 32}" class="info-text" text-anchor="middle">Inner drill hole from shelf edge: ${Units.formatWithFraction(innerHole)}</text>
                <text x="${centerX}" y="${y + 46}" class="info-text" text-anchor="middle">Pipe Distance: ${State.pipeDistance.toFixed(5)}" | Nut-Pipe Gap: ${(State.nutPipeClearance * 25.4).toFixed(2)}mm</text>
            </g>`;
    },

    /**
     * Draw usage instructions
     * @param {number} dpi - Dots per inch
     * @param {number} pageWidthPx - Page width in pixels
     */
    drawInstructions(dpi, pageWidthPx) {
        const y = 8.8 * dpi;
        const centerX = pageWidthPx / 2;
        return `
            <g id="instructions">
                <text x="${centerX}" y="${y}" class="label" text-anchor="middle">Instructions</text>
                <text x="${centerX}" y="${y + 16}" class="info-text" text-anchor="middle">1. Print at 100% scale (no fit-to-page) - measure the 1" square to verify</text>
                <text x="${centerX}" y="${y + 30}" class="info-text" text-anchor="middle">2. Align corner mark with shelf corner, use LEFT for left corners, RIGHT for right corners</text>
                <text x="${centerX}" y="${y + 44}" class="info-text" text-anchor="middle">3. Mark drill hole centers through the crosshairs</text>
                <text x="${centerX}" y="${y + 58}" class="info-text" text-anchor="middle">4. Flip paper 180° to mark bottom corners (same left/right orientation)</text>
            </g>`;
    },

    /**
     * Render the template to the container
     */
    render() {
        const container = document.getElementById('template-container');
        container.innerHTML = this.generateSVG();
    }
};
