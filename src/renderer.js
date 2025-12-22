import { CONFIG } from './config.js';
import { State } from './state.js';
import { Layout } from './layout.js';

export const Renderer = {
    canvas: null,
    ctx: null,
    scale: 1,       // Pixels per inch
    offsetX: 0,     // Offset to center drawing
    offsetY: 0,

    // Cached shelf bounds for click detection
    shelfBounds: { x: 0, y: 0, width: 0, height: 0 },

    /**
     * Initialize the renderer
     */
    init() {
        this.canvas = document.getElementById('shelf-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.calculateDimensions();
        this.setupClickHandler();
    },

    /**
     * Setup click handler for shelf opacity toggle
     */
    setupClickHandler() {
        this.canvas.addEventListener('click', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // Check if click is within shelf bounds
            if (x >= this.shelfBounds.x &&
                x <= this.shelfBounds.x + this.shelfBounds.width &&
                y >= this.shelfBounds.y &&
                y <= this.shelfBounds.y + this.shelfBounds.height) {
                // Toggle opacity
                State.shelfOpacity = State.shelfOpacity === 1.0 ? 0.5 : 1.0;
                this.render();
            }
        });

        // Change cursor when hovering over shelf
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            if (x >= this.shelfBounds.x &&
                x <= this.shelfBounds.x + this.shelfBounds.width &&
                y >= this.shelfBounds.y &&
                y <= this.shelfBounds.y + this.shelfBounds.height) {
                this.canvas.style.cursor = 'pointer';
            } else {
                this.canvas.style.cursor = 'default';
            }
        });
    },

    /**
     * Calculate canvas size and scale
     */
    calculateDimensions() {
        const pipeRadius = CONFIG.pipe.diameter / 2;

        // Total width needs to encompass the full shelf and the widest pipe/bracket spread
        const shelfHalfWidth = CONFIG.shelf.width / 2;
        const shiftFront = Layout.optimalShift('bottom').shift;
        const shiftBack = Layout.optimalShift('top').shift;
        const bracketHalfWidth = CONFIG.bracket.width / 2;
        const frontExtent = State.pipeDistanceFront / 2 + pipeRadius + shiftFront + bracketHalfWidth;
        const backExtent = State.pipeDistanceBack / 2 + pipeRadius + shiftBack + bracketHalfWidth;
        const halfSpan = Math.max(shelfHalfWidth, frontExtent, backExtent);
        const totalWidth = halfSpan * 2;

        // Total height depends on view
        let totalHeight;
        if (State.view === 'top') {
            // Brackets are now fully under the shelf, so just pipe length
            totalHeight = CONFIG.pipe.length;
        } else {
            // Front view: bracket thickness + pipe diameter + shelf height
            totalHeight = CONFIG.bracket.thickness + CONFIG.pipe.diameter + CONFIG.shelf.height;
        }

        // Calculate scale to fit within viewport with padding
        const availableWidth = Math.max(window.innerWidth - 100, CONFIG.display.minCanvasWidth);
        const availableHeight = Math.max(window.innerHeight - 150, CONFIG.display.minCanvasHeight);

        const scaleX = (availableWidth - CONFIG.display.padding * 2) / totalWidth;
        const scaleY = (availableHeight - CONFIG.display.padding * 2) / totalHeight;
        this.scale = Math.min(scaleX, scaleY);

        // Set canvas size (use integers to avoid blur)
        this.canvas.width = Math.round(totalWidth * this.scale + CONFIG.display.padding * 2);
        this.canvas.height = Math.round(totalHeight * this.scale + CONFIG.display.padding * 2);

        // Center coordinate system on shelf midpoint (x = 0 at shelf center)
        this.offsetX = CONFIG.display.padding + halfSpan * this.scale;

        if (State.view === 'top') {
            this.offsetY = CONFIG.display.padding + CONFIG.pipe.overhang * this.scale;
        } else {
            // Front view: y=0 is at top of pipe circles
            // Bracket sits above pipe (at -thickness), shelf sits above bracket
            this.offsetY = CONFIG.display.padding + (CONFIG.bracket.thickness + CONFIG.shelf.height) * this.scale;
        }
    },

    /**
     * Convert inches to canvas pixels (X coordinate) - returns rounded integer
     * @param {number} inches
     * @returns {number}
     */
    toPixelX(inches) {
        return Math.round(this.offsetX + inches * this.scale);
    },

    /**
     * Convert inches to canvas pixels (Y coordinate) - returns rounded integer
     * @param {number} inches
     * @returns {number}
     */
    toPixelY(inches) {
        return Math.round(this.offsetY + inches * this.scale);
    },

    /**
     * Convert inches to pixels (for dimensions) - returns rounded integer
     * @param {number} inches
     * @returns {number}
     */
    toPixels(inches) {
        return Math.round(inches * this.scale);
    },

    /**
     * Get the pipe center X coordinate in shelf-centered space
     * @param {number} pipeDistance - inner-edge spacing for this depth position
     * @param {boolean} isLeft
     */
    getPipeCenterX(pipeDistance, isLeft) {
        const pipeRadius = CONFIG.pipe.diameter / 2;
        return isLeft
            ? -pipeDistance / 2 - pipeRadius
            : pipeDistance / 2 + pipeRadius;
    },

    /**
     * Clear the canvas
     */
    clear() {
        this.ctx.fillStyle = CONFIG.colors.background;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    },

    /**
     * Draw a crisp rectangle (for fills)
     */
    fillRect(x, y, width, height, color) {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x, y, width, height);
    },

    /**
     * Draw a crisp stroked rectangle
     * Offset by 0.5 to align stroke to pixel grid
     */
    strokeRect(x, y, width, height, color, lineWidth) {
        const ctx = this.ctx;
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        // Offset by 0.5 for crisp 1px lines
        const offset = lineWidth % 2 === 1 ? 0.5 : 0;
        ctx.strokeRect(x + offset, y + offset, width, height);
    },

    /**
     * Draw a hexagon (for button screw socket or nut)
     * @param {number} cx - Center X in pixels
     * @param {number} cy - Center Y in pixels
     * @param {number} radius - Radius (to vertex) in pixels
     * @param {string} fillColor
     * @param {string} strokeColor (optional)
     */
    drawHexagon(cx, cy, radius, fillColor, strokeColor = null) {
        const ctx = this.ctx;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i - Math.PI / 2; // Start at top vertex
            const x = cx + radius * Math.cos(angle);
            const y = cy + radius * Math.sin(angle);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fillStyle = fillColor;
        ctx.fill();
        if (strokeColor) {
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    },

    /**
     * Draw a single angled pipe (parallelogram for right pipe when distances differ)
     * The pipe maintains constant width (diameter) but tilts to show the angle.
     * @param {boolean} isLeft - true for left pipe, false for right pipe
     */
    drawAngledPipe(isLeft) {
        const ctx = this.ctx;
        const pipeRadius = CONFIG.pipe.diameter / 2;
        const pipeWidth = CONFIG.pipe.diameter;

        // Y positions: top of view is back, bottom of view is front
        const yTop = -CONFIG.pipe.overhang;  // Back
        const yBottom = -CONFIG.pipe.overhang + CONFIG.pipe.length;  // Front

        // X positions for inner edge at front (bottom) and back (top) relative to shelf center
        const frontInnerX = isLeft
            ? -State.pipeDistanceFront / 2
            : State.pipeDistanceFront / 2;
        const backInnerX = isLeft
            ? -State.pipeDistanceBack / 2
            : State.pipeDistanceBack / 2;

        const backOuterX = isLeft
            ? backInnerX - CONFIG.pipe.diameter
            : backInnerX + CONFIG.pipe.diameter;
        const frontOuterX = isLeft
            ? frontInnerX - CONFIG.pipe.diameter
            : frontInnerX + CONFIG.pipe.diameter;

        const topLeftX = this.toPixelX(isLeft ? backOuterX : backInnerX);
        const topRightX = this.toPixelX(isLeft ? backInnerX : backOuterX);
        const bottomLeftX = this.toPixelX(isLeft ? frontOuterX : frontInnerX);
        const bottomRightX = this.toPixelX(isLeft ? frontInnerX : frontOuterX);
        const topY = this.toPixelY(yTop);
        const bottomY = this.toPixelY(yBottom);

        // Draw as polygon (parallelogram)
        ctx.beginPath();
        ctx.moveTo(topLeftX, topY);
        ctx.lineTo(topRightX, topY);
        ctx.lineTo(bottomRightX, bottomY);
        ctx.lineTo(bottomLeftX, bottomY);
        ctx.closePath();

        ctx.fillStyle = CONFIG.colors.pipe;
        ctx.fill();
        ctx.strokeStyle = CONFIG.colors.pipeStroke;
        ctx.lineWidth = 1;
        ctx.stroke();
    },

    /**
     * Draw both pipe supports (potentially angled)
     */
    drawPipes() {
        this.drawAngledPipe(true);   // Left pipe
        this.drawAngledPipe(false);  // Right pipe
    },

    /**
     * Draw center line on an angled pipe
     * @param {boolean} isLeft - true for left pipe, false for right pipe
     */
    drawAngledPipeCenterLine(isLeft) {
        const ctx = this.ctx;
        const pipeRadius = CONFIG.pipe.diameter / 2;

        // Y positions
        const yTop = -CONFIG.pipe.overhang;
        const yBottom = -CONFIG.pipe.overhang + CONFIG.pipe.length;

        // X positions for inner edge at front (bottom) and back (top)
        const frontInnerX = isLeft
            ? -State.pipeDistanceFront / 2
            : State.pipeDistanceFront / 2;
        const backInnerX = isLeft
            ? -State.pipeDistanceBack / 2
            : State.pipeDistanceBack / 2;

        const frontCenterX = frontInnerX + (isLeft ? -pipeRadius : pipeRadius);
        const backCenterX = backInnerX + (isLeft ? -pipeRadius : pipeRadius);

        // Center line goes from back center to front center
        const xStart = Math.round(this.toPixelX(backCenterX)) + 0.5;
        const xEnd = Math.round(this.toPixelX(frontCenterX)) + 0.5;
        const yStart = this.toPixelY(yTop);
        const yEnd = this.toPixelY(yBottom);

        ctx.beginPath();
        ctx.moveTo(xStart, yStart);
        ctx.lineTo(xEnd, yEnd);
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 1;
        ctx.stroke();
    },

    /**
     * Draw center lines on both pipes (top view)
     */
    drawPipeCenterLines() {
        this.drawAngledPipeCenterLine(true);   // Left pipe
        this.drawAngledPipeCenterLine(false);  // Right pipe
    },

    // ========== FRONT VIEW METHODS ==========

    /**
     * Draw a pipe as a circle (front view)
     * @param {number} xCenter - pipe center X coordinate in inches
     */
    drawPipeCircle(xCenter) {
        const ctx = this.ctx;
        const pipeRadius = CONFIG.pipe.diameter / 2;

        // Circle center
        const cx = this.toPixelX(xCenter);
        const cy = this.toPixelY(pipeRadius);
        const r = this.toPixels(pipeRadius);

        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = CONFIG.colors.pipe;
        ctx.fill();
        ctx.strokeStyle = CONFIG.colors.pipeStroke;
        ctx.lineWidth = 1;
        ctx.stroke();
    },

    /**
     * Draw both pipe circles (front view)
     * Uses front pipe distance since this is the front view
     */
    drawPipeCircles() {
        const pipeRadius = CONFIG.pipe.diameter / 2;
        const leftCenter = -State.pipeDistanceFront / 2 - pipeRadius;
        const rightCenter = State.pipeDistanceFront / 2 + pipeRadius;
        this.drawPipeCircle(leftCenter);
        this.drawPipeCircle(rightCenter);
    },

    /**
     * Draw center line on a pipe circle (front view) - vertical line through center
     * @param {number} xCenter - pipe center X coordinate in inches
     */
    drawPipeCircleCenterLine(xCenter) {
        const ctx = this.ctx;
        const pipeRadius = CONFIG.pipe.diameter / 2;

        const x = Math.round(this.toPixelX(xCenter)) + 0.5;
        const yStart = this.toPixelY(0);
        const yEnd = this.toPixelY(CONFIG.pipe.diameter);

        ctx.beginPath();
        ctx.moveTo(x, yStart);
        ctx.lineTo(x, yEnd);
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 1;
        ctx.stroke();
    },

    /**
     * Draw center lines on both pipe circles (front view)
     * Uses front pipe distance since this is the front view
     */
    drawPipeCircleCenterLines() {
        const pipeRadius = CONFIG.pipe.diameter / 2;
        const leftCenter = -State.pipeDistanceFront / 2 - pipeRadius;
        const rightCenter = State.pipeDistanceFront / 2 + pipeRadius;
        this.drawPipeCircleCenterLine(leftCenter);
        this.drawPipeCircleCenterLine(rightCenter);
    },

    /**
     * Draw shelf in front view (rectangle above pipes and brackets)
     * Uses front pipe distance since this is the front view
     */
    drawShelfFront() {
        const ctx = this.ctx;

        // Shelf is centered on origin (fixed rectangle)
        const shelfX = -CONFIG.shelf.width / 2;

        const x = this.toPixelX(shelfX);
        // Shelf sits above the bracket (which is above the pipe)
        const y = this.toPixelY(-CONFIG.bracket.thickness - CONFIG.shelf.height);
        const width = this.toPixels(CONFIG.shelf.width);
        const height = this.toPixels(CONFIG.shelf.height);

        // Store bounds for click detection
        this.shelfBounds = { x, y, width, height };

        // Apply opacity
        ctx.globalAlpha = State.shelfOpacity;
        this.fillRect(x, y, width, height, CONFIG.colors.shelf);
        // Draw stroke INSIDE the shelf bounds (inset by half stroke width)
        const strokeWidth = 2;
        const inset = strokeWidth / 2;
        ctx.strokeStyle = CONFIG.colors.shelfStroke;
        ctx.lineWidth = strokeWidth;
        ctx.strokeRect(x + inset, y + inset, width - strokeWidth, height - strokeWidth);
        ctx.globalAlpha = 1.0;
    },

    // ========== BRACKET METHODS ==========

    /**
     * Draw a bracket in top view (rectangle with 4 holes)
     * @param {string} position - 'top' (back) or 'bottom' (front) edge of shelf
     * @param {boolean} isLeft - true for left pipe brackets, false for right
     */
    drawBracketTop(position, isLeft) {
        const ctx = this.ctx;
        const b = CONFIG.bracket;
        const hw = CONFIG.hardware;

        const pipeDistance = position === 'top' ? State.pipeDistanceBack : State.pipeDistanceFront;
        const pipeCenterX = this.getPipeCenterX(pipeDistance, isLeft);

        // Get optimal shift from Layout module (position-specific for pipe distance)
        const shiftInfo = Layout.optimalShift(position);
        const shift = shiftInfo.shift;

        let bracketCenterX;
        bracketCenterX = pipeCenterX + (isLeft ? -shift : shift);
        const bracketX = bracketCenterX - b.width / 2;

        // Bracket is fully under the shelf, positioned along depth
        // Default uses golden ratio inset (see Layout module)
        const bracketY = Layout.bracketYTopView(position);

        const x = this.toPixelX(bracketX);
        const y = this.toPixelY(bracketY);
        const width = this.toPixels(b.width);
        const height = this.toPixels(b.length);

        // Draw bracket rectangle
        this.fillRect(x, y, width, height, CONFIG.colors.bracket);
        this.strokeRect(x, y, width, height, CONFIG.colors.bracketStroke, 1);

        // Draw 4 holes (2x2 pattern)
        const holeRadiusPixels = this.toPixels(b.holeDiameter / 2);

        // Hole positions relative to bracket top-left
        // [0] Top-left, [1] Top-right, [2] Bottom-left, [3] Bottom-right
        const holes = [
            { x: bracketX + b.holes.left, y: bracketY + b.holes.top },                              // Top-left
            { x: bracketX + b.width - b.holes.right, y: bracketY + b.holes.top },                   // Top-right
            { x: bracketX + b.holes.left, y: bracketY + b.length - b.holes.bottom },                // Bottom-left
            { x: bracketX + b.width - b.holes.right, y: bracketY + b.length - b.holes.bottom }      // Bottom-right
        ];

        // Outer holes (outside shelf edge, get button screws):
        // Left brackets: left column = indices [0, 2]
        // Right brackets: right column = indices [1, 3]
        const outerHoleIndices = isLeft ? [0, 2] : [1, 3];

        // Draw holes first
        ctx.fillStyle = CONFIG.colors.bracketHole;
        holes.forEach((hole, index) => {
            ctx.beginPath();
            ctx.arc(this.toPixelX(hole.x), this.toPixelY(hole.y), holeRadiusPixels, 0, Math.PI * 2);
            ctx.fill();
        });

        // Draw button screw heads on outer holes
        const buttonRadius = this.toPixels(hw.buttonScrew.headDiameter / 2);
        const socketRadius = this.toPixels(1.5 / 25.4); // ~1.5mm hex socket

        outerHoleIndices.forEach(index => {
            const hole = holes[index];
            const hx = this.toPixelX(hole.x);
            const hy = this.toPixelY(hole.y);

            // Draw button head (circle)
            ctx.beginPath();
            ctx.arc(hx, hy, buttonRadius, 0, Math.PI * 2);
            ctx.fillStyle = CONFIG.colors.buttonScrewHead;
            ctx.fill();
            ctx.strokeStyle = CONFIG.colors.buttonScrewHeadStroke;
            ctx.lineWidth = 1;
            ctx.stroke();

            // Draw hex socket in center
            this.drawHexagon(hx, hy, socketRadius, CONFIG.colors.buttonScrewSocket);
        });
    },

    /**
     * Draw all 4 brackets in top view (2 per pipe)
     * Top (back) brackets use pipeDistanceBack
     * Bottom (front) brackets use pipeDistanceFront
     */
    drawBracketsTop() {
        // Back (top) brackets
        this.drawBracketTop('top', true);
        this.drawBracketTop('top', false);
        // Front (bottom) brackets
        this.drawBracketTop('bottom', true);
        this.drawBracketTop('bottom', false);
    },

    /**
     * Draw a bracket in front view (thin rectangle on top of pipe)
     * Uses front position calculations since this is the front view
     * @param {boolean} isLeft - true for left pipe bracket, false for right
     */
    drawBracketFront(isLeft) {
        const ctx = this.ctx;
        const b = CONFIG.bracket;
        const pipeDistance = State.pipeDistanceFront;
        const pipeCenterX = this.getPipeCenterX(pipeDistance, isLeft);

        // Get optimal shift for front (bottom) position
        const shiftInfo = Layout.optimalShift('bottom');
        const shift = shiftInfo.shift;

        const bracketCenterX = pipeCenterX + (isLeft ? -shift : shift);
        const bracketX = bracketCenterX - b.width / 2;

        const x = this.toPixelX(bracketX);
        const y = this.toPixelY(-b.thickness);  // Just above y=0 (top of pipe)
        const width = this.toPixels(b.width);
        const height = this.toPixels(b.thickness);

        this.fillRect(x, y, width, height, CONFIG.colors.bracket);
        this.strokeRect(x, y, width, height, CONFIG.colors.bracketStroke, 1);
    },

    /**
     * Draw button screw head in front view (showing it must clear shelf)
     * Uses front position calculations since this is the front view
     * @param {boolean} isLeft - true for left pipe bracket, false for right
     */
    drawButtonScrewFront(isLeft) {
        const ctx = this.ctx;
        const b = CONFIG.bracket;
        const hw = CONFIG.hardware;

        // Get optimal shift for front (bottom) position
        const shiftInfo = Layout.optimalShift('bottom');
        const shift = shiftInfo.shift;
        const pipeCenterX = this.getPipeCenterX(State.pipeDistanceFront, isLeft);

        const bracketCenterX = pipeCenterX + (isLeft ? -shift : shift);
        const bracketX = bracketCenterX - b.width / 2;

        // Outer hole X position
        const outerHoleX = isLeft
            ? bracketX + b.holes.left
            : bracketX + b.width - b.holes.right;

        // Button screw sits on top of bracket, head extends up toward shelf
        const screwY = -b.thickness - hw.buttonScrew.headHeight;
        const screwWidth = hw.buttonScrew.headDiameter;
        const screwHeight = hw.buttonScrew.headHeight;

        const x = this.toPixelX(outerHoleX - screwWidth / 2);
        const y = this.toPixelY(screwY);
        const width = this.toPixels(screwWidth);
        const height = this.toPixels(screwHeight);

        // Draw button head as rounded rectangle
        ctx.fillStyle = CONFIG.colors.buttonScrewHead;
        ctx.beginPath();
        const radius = height / 2;
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.arc(x + width - radius, y + radius, radius, -Math.PI/2, Math.PI/2);
        ctx.lineTo(x + radius, y + height);
        ctx.arc(x + radius, y + radius, radius, Math.PI/2, -Math.PI/2);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = CONFIG.colors.buttonScrewHeadStroke;
        ctx.lineWidth = 1;
        ctx.stroke();
    },

    /**
     * Draw hex cap nuts hanging below bracket in front view
     * Uses front position calculations since this is the front view
     * @param {boolean} isLeft - true for left pipe bracket, false for right
     */
    drawHexNutsFront(isLeft) {
        const ctx = this.ctx;
        const b = CONFIG.bracket;
        const hw = CONFIG.hardware;

        // Get optimal shift for front (bottom) position
        const shiftInfo = Layout.optimalShift('bottom');
        const shift = shiftInfo.shift;
        const pipeCenterX = this.getPipeCenterX(State.pipeDistanceFront, isLeft);

        const bracketCenterX = pipeCenterX + (isLeft ? -shift : shift);
        const bracketX = bracketCenterX - b.width / 2;

        // Outer hole X position (where nut hangs)
        const outerHoleX = isLeft
            ? bracketX + b.holes.left
            : bracketX + b.width - b.holes.right;

        // Nut hangs below bracket - top of nut at y = 0 (top of pipe)
        const nutWidth = hw.hexCapNut.acrossCorners;
        const nutHeight = hw.hexCapNut.height;
        const facetHeight = hw.hexCapNut.acrossFlats; // Height of hex portion

        const x = this.toPixelX(outerHoleX - nutWidth / 2);
        const y = this.toPixelY(0);  // Top of nut at top of pipe
        const width = this.toPixels(nutWidth);
        const totalHeight = this.toPixels(nutHeight);
        const hexHeight = this.toPixels(facetHeight);
        const domeHeight = totalHeight - hexHeight;

        // Draw hex body (top portion - the threaded part)
        ctx.fillStyle = CONFIG.colors.hexNut;
        ctx.fillRect(x, y, width, hexHeight);
        ctx.strokeStyle = CONFIG.colors.hexNutStroke;
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, width, hexHeight);

        // Draw inner hex detail (darker lines to show hex shape)
        ctx.strokeStyle = '#8b6508';
        ctx.lineWidth = 1;
        const inset = width * 0.15;
        ctx.beginPath();
        ctx.moveTo(x + inset, y);
        ctx.lineTo(x + inset, y + hexHeight);
        ctx.moveTo(x + width - inset, y);
        ctx.lineTo(x + width - inset, y + hexHeight);
        ctx.stroke();

        // Draw domed cap (bottom portion - the acorn cap)
        const domeRadius = width / 2;
        const domeStartY = y + hexHeight;

        ctx.beginPath();
        ctx.moveTo(x, domeStartY);
        ctx.lineTo(x, domeStartY + domeHeight * 0.3);
        ctx.quadraticCurveTo(x, domeStartY + domeHeight, x + width/2, domeStartY + domeHeight);
        ctx.quadraticCurveTo(x + width, domeStartY + domeHeight, x + width, domeStartY + domeHeight * 0.3);
        ctx.lineTo(x + width, domeStartY);
        ctx.closePath();
        ctx.fillStyle = CONFIG.colors.hexNut;
        ctx.fill();
        ctx.strokeStyle = CONFIG.colors.hexNutStroke;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Add highlight to dome for 3D effect
        ctx.beginPath();
        ctx.arc(x + width/2, domeStartY + domeHeight * 0.6, width * 0.2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fill();
    },

    /**
     * Draw both brackets in front view
     * Uses front pipe distance since this is the front view
     */
    drawBracketsFront() {
        this.drawBracketFront(true);
        this.drawBracketFront(false);
        // Draw button screw heads on top of brackets
        this.drawButtonScrewFront(true);
        this.drawButtonScrewFront(false);
        // Draw hex nuts hanging below brackets
        this.drawHexNutsFront(true);
        this.drawHexNutsFront(false);
    },

    /**
     * Draw the main shelf rectangle (fixed 30" width)
     * The shelf stays centered on the origin; only the pipes move/angle.
     */
    drawShelf() {
        const ctx = this.ctx;

        // Shelf is centered on origin (fixed rectangle regardless of pipe angles)
        const shelfX = -CONFIG.shelf.width / 2;

        const x = this.toPixelX(shelfX);
        const y = this.toPixelY(0);
        const width = this.toPixels(CONFIG.shelf.width);
        const height = this.toPixels(CONFIG.shelf.depth);

        // Store bounds for click detection
        this.shelfBounds = { x, y, width, height };

        // Apply opacity
        ctx.globalAlpha = State.shelfOpacity;
        this.fillRect(x, y, width, height, CONFIG.colors.shelf);
        // Draw stroke INSIDE the shelf bounds (inset by half stroke width)
        const strokeWidth = 2;
        const inset = strokeWidth / 2;
        ctx.strokeStyle = CONFIG.colors.shelfStroke;
        ctx.lineWidth = strokeWidth;
        ctx.strokeRect(x + inset, y + inset, width - strokeWidth, height - strokeWidth);
        ctx.globalAlpha = 1.0;
    },

    /**
     * Render everything - pipes first, then shelf on top
     */
    render() {
        this.clear();

        if (State.view === 'top') {
            this.drawPipes();           // Draw pipes first (underneath)
            this.drawPipeCenterLines(); // Draw center lines on pipes
            this.drawBracketsTop();     // Draw brackets on pipes
            this.drawShelf();           // Draw shelf on top (covers middle of lines and top of brackets)
        } else {
            // Front view
            this.drawPipeCircles();           // Draw pipe circles
            this.drawPipeCircleCenterLines(); // Draw center lines
            this.drawBracketsFront();         // Draw brackets on top of pipes
            this.drawShelfFront();            // Draw shelf on top
        }
    }
};
