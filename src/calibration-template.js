import { CONFIG } from './config.js';
import { Units } from './units.js';

const MM_ADJUSTMENTS = [-1.5, -1.0, -0.5, 0, 0.5, 1.0, 1.5];

export const CalibrationTemplate = {
    pageWidth: 8.5,
    pageHeight: 11,
    blockWidth: 3.45,
    blockHeight: 3.3,

    generateSVG() {
        const dpi = 72;
        const pageWidthPx = this.pageWidth * dpi;
        const pageHeightPx = this.pageHeight * dpi;

        const blockWidthPx = this.blockWidth * dpi;
        const blockHeightPx = this.blockHeight * dpi;
        const gapX = 0.35 * dpi;
        const gapY = 0.3 * dpi;

        const totalBlocksWidth = blockWidthPx * 2 + gapX;
        const startX = (pageWidthPx - totalBlocksWidth) / 2;
        const startY = 1.2 * dpi;

        let svg = `<svg xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 ${pageWidthPx} ${pageHeightPx}"
            width="${pageWidthPx}pt"
            height="${pageHeightPx}pt"
            style="background:white;">
            <style>
                .calibration-title { font-family: sans-serif; font-size: 16px; font-weight: bold; fill: #333; }
                .calibration-subtitle { font-family: sans-serif; font-size: 10px; fill: #444; }
                .calibration-block { fill: none; stroke: #bbb; stroke-width: 1; }
                .calibration-block-label { font-family: sans-serif; font-size: 12px; font-weight: bold; fill: #000; }
                .calibration-bracket { stroke: #222; stroke-width: 1; fill: none; }
                .calibration-crosshair line { stroke: #000; stroke-width: 0.65; stroke-linecap: round; }
                .calibration-crosshair.zero line { stroke: #d32f2f; stroke-width: 1.2; }
                .calibration-instruction { font-family: sans-serif; font-size: 9px; fill: #333; }
                .calibration-legend-label { font-family: sans-serif; font-size: 10px; fill: #222; font-weight: bold; }
                .calibration-legend-text { font-family: monospace; font-size: 10px; fill: #333; }
                .notes-table { fill: none; stroke: #000; stroke-width: 1; }
                .notes-text { font-family: sans-serif; font-size: 9px; fill: #333; }
                .scale-box { fill: none; stroke: #000; stroke-width: 1.5; }
            </style>`;

        svg += this.drawScaleReference(0.75 * dpi, pageHeightPx - 1.75 * dpi, dpi);

        svg += `<text x="${pageWidthPx / 2}" y="${0.6 * dpi}" text-anchor="middle" class="calibration-title">Bracket Hole Calibration Sheet</text>`;
        svg += `<text x="${pageWidthPx / 2}" y="${0.95 * dpi}" text-anchor="middle" class="calibration-subtitle">Align bracket edges with the outlines below, then note which crosshair lines up with each hole</text>`;

        const instructionsY = 1.2 * dpi;
        const infoLines = [
            'Columns run from the nearest edge toward the center. Rows run from the nearest edge inward as well.',
            'Each step between crosshairs is 0.5mm (about 0.020\") and represents the hole center moving toward (+) or away (-) from the bracket edge.',
            'Count how many steps from the outermost crosshair to match a hole center, then use the legend to read the mm offset. Red crosshairs mark the current 0mm baseline.'
        ];

        infoLines.forEach((line, idx) => {
            svg += `<text x="${pageWidthPx / 2}" y="${instructionsY + idx * 12}" text-anchor="middle" class="calibration-instruction">${line}</text>`;
        });

        const labels = ['A', 'B', 'C', 'D'];
        let blockIndex = 0;
        for (let row = 0; row < 2; row++) {
            for (let col = 0; col < 2; col++) {
                const x = startX + col * (blockWidthPx + gapX);
                const y = startY + row * (blockHeightPx + gapY);
                svg += this.drawCalibrationBlock(x, y, labels[blockIndex++], dpi, blockWidthPx, blockHeightPx);
            }
        }

        const blocksBottom = startY + 2 * blockHeightPx + gapY;
        const legendY = blocksBottom + 0.3 * dpi;
        const notesY = legendY + 1.2 * dpi;

        svg += this.drawLegend(0.7 * dpi, legendY, pageWidthPx - 1.4 * dpi, dpi);
        svg += this.drawNotesTable(0.7 * dpi, notesY, pageWidthPx - 1.4 * dpi, 1.25 * dpi);

        svg += '</svg>';
        return svg;
    },

    drawScaleReference(x, y, dpi) {
        const size = dpi;
        return `
            <g id="calibration-scale">
                <rect x="${x}" y="${y}" width="${size}" height="${size}" class="scale-box" />
                <text x="${x + size / 2}" y="${y + size + 12}" class="calibration-instruction" text-anchor="middle">1\" square</text>
            </g>`;
    },

    drawCalibrationBlock(x, y, label, dpi, width, height) {
        const b = CONFIG.bracket;
        const bracketWidthPx = b.width * dpi;
        const bracketLengthPx = b.length * dpi;
        const labelHeight = 18;
        const paddingX = (width - bracketWidthPx) / 2;
        const paddingY = labelHeight + 0.4 * dpi;

        const bracketX = paddingX;
        const bracketY = paddingY;

        let g = `<g transform="translate(${x}, ${y})">
            <rect x="0" y="0" width="${width}" height="${height}" class="calibration-block"/>
            <text x="${width / 2}" y="${labelHeight}" text-anchor="middle" class="calibration-block-label">Block ${label}</text>
            <rect x="${bracketX}" y="${bracketY}" width="${bracketWidthPx}" height="${bracketLengthPx}" class="calibration-bracket"/>`;

        const holeData = this.getHoleDefinitions(bracketX, bracketY, dpi);
        holeData.forEach((hole) => {
            g += this.drawHoleGrid(hole);
        });

        g += '</g>';
        return g;
    },

    getHoleDefinitions(bracketX, bracketY, dpi) {
        const b = CONFIG.bracket;
        const holeLeftPx = b.holes.left * dpi;
        const holeRightPx = b.holes.right * dpi;
        const holeTopPx = b.holes.top * dpi;
        const holeBottomPx = b.holes.bottom * dpi;
        const holeData = [
            {
                id: 'TL',
                cx: bracketX + holeLeftPx,
                cy: bracketY + holeTopPx,
                edgeX: 'left',
                edgeY: 'top'
            },
            {
                id: 'TR',
                cx: bracketX + (b.width * dpi) - holeRightPx,
                cy: bracketY + holeTopPx,
                edgeX: 'right',
                edgeY: 'top'
            },
            {
                id: 'BL',
                cx: bracketX + holeLeftPx,
                cy: bracketY + (b.length * dpi) - holeBottomPx,
                edgeX: 'left',
                edgeY: 'bottom'
            },
            {
                id: 'BR',
                cx: bracketX + (b.width * dpi) - holeRightPx,
                cy: bracketY + (b.length * dpi) - holeBottomPx,
                edgeX: 'right',
                edgeY: 'bottom'
            }
        ];
        return holeData;
    },

    drawHoleGrid(hole) {
        const adjustments = MM_ADJUSTMENTS.map((mm) => ({
            mm,
            inches: Units.toInches(mm)
        }));
        const dpi = 72;
        const cross = 0.04 * dpi;
        let g = '';

        adjustments.forEach((col) => {
            adjustments.forEach((row) => {
                const shiftX = (hole.edgeX === 'left' ? col.inches : -col.inches) * dpi;
                const shiftY = (hole.edgeY === 'top' ? row.inches : -row.inches) * dpi;
                const cx = hole.cx + shiftX;
                const cy = hole.cy + shiftY;
                const isZero = Math.abs(col.mm) < 1e-6 && Math.abs(row.mm) < 1e-6;
                g += `
                    <g class="${isZero ? 'calibration-crosshair zero' : 'calibration-crosshair'}">
                        <line x1="${cx - cross}" y1="${cy}" x2="${cx + cross}" y2="${cy}" />
                        <line x1="${cx}" y1="${cy - cross}" x2="${cx}" y2="${cy + cross}" />
                    </g>`;
            });
        });

        return g;
    },

    drawLegend(x, y, width, dpi) {
        const stepText = MM_ADJUSTMENTS.map((mm, idx) => `${idx + 1}=${mm.toFixed(1)}mm`).join('   ');
        const instructions = [
            'Count columns from the bracket edge toward the center. Column #1 is the outermost crosshair.',
            'Rows follow the same numbering. For bottom holes count row #1 starting closest to the bottom edge.',
            'Positive values move the hole inward toward the center of the bracket.'
        ];

        let g = `<g id="calibration-legend">
            <text x="${x}" y="${y}" class="calibration-legend-label">Legend</text>
            <text x="${x}" y="${y + 16}" class="calibration-legend-text">Column / Row index: ${stepText}</text>`;

        instructions.forEach((text, idx) => {
            g += `<text x="${x}" y="${y + 32 + idx * 12}" class="calibration-instruction">${text}</text>`;
        });

        return g + '</g>';
    },

    drawNotesTable(x, y, width, height) {
        const rows = 5;
        const cols = [0.15, 0.2, 0.2, 0.45];
        const rowHeight = height / rows;
        const colWidths = cols.map((ratio) => width * ratio);

        let g = `<g id="calibration-notes">
            <rect x="${x}" y="${y}" width="${width}" height="${height}" class="notes-table"/>`;

        for (let i = 1; i < rows; i++) {
            const lineY = y + i * rowHeight;
            g += `<line x1="${x}" y1="${lineY}" x2="${x + width}" y2="${lineY}" class="notes-table"/>`;
        }

        let offsetX = x;
        for (let i = 0; i < cols.length - 1; i++) {
            offsetX += colWidths[i];
            g += `<line x1="${offsetX}" y1="${y}" x2="${offsetX}" y2="${y + height}" class="notes-table"/>`;
        }

        const headers = ['Hole', 'Horizontal mm', 'Vertical mm', 'Notes'];
        offsetX = x;
        headers.forEach((text, idx) => {
            const cellCenter = offsetX + colWidths[idx] / 2;
            g += `<text x="${cellCenter}" y="${y + 12}" text-anchor="middle" class="notes-text">${text}</text>`;
            offsetX += colWidths[idx];
        });

        const holeLabels = ['Top Left', 'Top Right', 'Bottom Left', 'Bottom Right'];
        holeLabels.forEach((hole, idx) => {
            const textY = y + (idx + 1) * rowHeight + 12;
            g += `<text x="${x + colWidths[0] / 2}" y="${textY}" text-anchor="middle" class="notes-text">${hole}</text>`;
        });

        return g + '</g>';
    },

    render() {
        const container = document.getElementById('template-container');
        container.innerHTML = this.generateSVG();
    }
};
