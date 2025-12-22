import { CONFIG } from './config.js';
import { State } from './state.js';
import { Renderer } from './renderer.js';
import { Layout } from './layout.js';
import { Units } from './units.js';
import { exportTemplate, exportSVG } from './exporter.js';

export const Controls = {
    init() {
        const shelfNumberInput = document.getElementById('shelf-number');
        const pipeDistanceFrontInput = document.getElementById('pipe-distance-front');
        const pipeDistanceBackInput = document.getElementById('pipe-distance-back');
        const nutClearanceInput = document.getElementById('nut-clearance');
        const viewToggleBtn = document.getElementById('view-toggle');
        const exportBtn = document.getElementById('export-template');

        shelfNumberInput.addEventListener('input', (e) => {
            State.shelfNumber = e.target.value.trim();
        });

        pipeDistanceFrontInput.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            if (!isNaN(value) && value > 0) {
                State.pipeDistanceFront = value;
                Renderer.calculateDimensions();
                Renderer.render();
                this.updateClearanceDisplay();
            }
        });

        pipeDistanceBackInput.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            if (!isNaN(value) && value > 0) {
                State.pipeDistanceBack = value;
                Renderer.calculateDimensions();
                Renderer.render();
                this.updateClearanceDisplay();
            }
        });

        nutClearanceInput.addEventListener('input', (e) => {
            const valueMm = parseFloat(e.target.value);
            if (!isNaN(valueMm) && valueMm >= 0) {
                State.nutPipeClearance = valueMm / 25.4;  // Convert mm to inches
                Renderer.render();
                this.updateClearanceDisplay();

                // Warn if gap is too small (< 1.0mm recommended minimum)
                if (valueMm < 1.0) {
                    nutClearanceInput.style.borderColor = '#c62828';
                    nutClearanceInput.style.backgroundColor = '#ffebee';
                    nutClearanceInput.title = 'Warning: Gap below 1.0mm recommended minimum';
                } else {
                    nutClearanceInput.style.borderColor = '';
                    nutClearanceInput.style.backgroundColor = '';
                    nutClearanceInput.title = '';
                }
            }
        });

        viewToggleBtn.addEventListener('click', () => {
            // Cycle: top -> front -> top
            State.view = State.view === 'top' ? 'front' : 'top';

            // Update button text
            const viewNames = { top: 'Top', front: 'Front' };
            viewToggleBtn.textContent = `View: ${viewNames[State.view]}`;

            Renderer.calculateDimensions();
            Renderer.render();
        });

        exportBtn.addEventListener('click', async () => {
            // Add loading indicator
            exportBtn.disabled = true;
            const originalText = exportBtn.textContent;
            exportBtn.textContent = 'Generating PDF...';

            try {
                await exportTemplate();
            } catch (error) {
                console.error('PDF export failed:', error);
                alert('PDF export failed. Falling back to SVG export.');
                exportSVG();
            } finally {
                exportBtn.disabled = false;
                exportBtn.textContent = originalText;
            }
        });
    },

    /**
     * Update the clearance display UI
     */
    updateClearanceDisplay() {
        // Get shifts for both front and back positions
        const shiftInfoFront = Layout.optimalShift('bottom');
        const shiftInfoBack = Layout.optimalShift('top');

        const leftEl = document.getElementById('clearance-left');
        const rightEl = document.getElementById('clearance-right');

        // Format shift info for front (bottom brackets)
        const shiftMmFront = Units.toMm(shiftInfoFront.shift);
        const shiftMmBack = Units.toMm(shiftInfoBack.shift);

        leftEl.textContent = `Front shift: ${shiftMmFront.toFixed(2)}mm | Back shift: ${shiftMmBack.toFixed(2)}mm`;
        leftEl.style.color = '#2e7d32';

        const frontLeftClear = Layout.nutToPipeClearance(true, shiftInfoFront.shift, 'bottom');
        const frontRightClear = Layout.nutToPipeClearance(false, shiftInfoFront.shift, 'bottom');
        const backLeftClear = Layout.nutToPipeClearance(true, shiftInfoBack.shift, 'top');
        const backRightClear = Layout.nutToPipeClearance(false, shiftInfoBack.shift, 'top');

        const minFrontClear = Math.min(frontLeftClear.clearance, frontRightClear.clearance);
        const minBackClear = Math.min(backLeftClear.clearance, backRightClear.clearance);

        const minClearance = Math.min(minFrontClear, minBackClear);

        if (minClearance < 0) {
            const overlapMm = Units.toMm(Math.abs(minClearance));
            rightEl.textContent = `WARNING: Nut overlaps pipe by ${overlapMm.toFixed(2)}mm`;
            rightEl.style.color = '#c62828';
        } else {
            const frontMm = Units.toMm(minFrontClear);
            const backMm = Units.toMm(minBackClear);
            rightEl.textContent = `Nut clearance: Front ${frontMm.toFixed(2)}mm | Back ${backMm.toFixed(2)}mm`;
            rightEl.style.color = '#2e7d32';
        }

        // Update placement guide for both positions
        this.updatePlacementGuide(shiftInfoFront.shift, shiftInfoBack.shift);
    },

    /**
     * Update the placement guide display with practical measurements
     */
    updatePlacementGuide(shiftFront, shiftBack) {
        const b = CONFIG.bracket;
        const holeCenterFromBracketCenter = b.width / 2 - b.holes.left;

        // Calculate for front (bottom) brackets
        const shelfOverhangFront = (CONFIG.shelf.width - State.pipeDistanceFront) / 2;
        const bracketEdgeFront = shiftFront + b.width / 2 - shelfOverhangFront;
        const innerHoleFront = shelfOverhangFront - shiftFront + holeCenterFromBracketCenter;

        // Calculate for back (top) brackets
        const shelfOverhangBack = (CONFIG.shelf.width - State.pipeDistanceBack) / 2;
        const bracketEdgeBack = shiftBack + b.width / 2 - shelfOverhangBack;
        const innerHoleBack = shelfOverhangBack - shiftBack + holeCenterFromBracketCenter;

        const bracketEdgeEl = document.getElementById('bracket-edge-distance');
        const drillHoleEl = document.getElementById('drill-hole-distance');

        bracketEdgeEl.textContent = `Front: ${Units.formatWithFraction(bracketEdgeFront)} | Back: ${Units.formatWithFraction(bracketEdgeBack)}`;
        drillHoleEl.textContent = `Front hole: ${Units.formatWithFraction(innerHoleFront)} | Back hole: ${Units.formatWithFraction(innerHoleBack)}`;
    }
};
