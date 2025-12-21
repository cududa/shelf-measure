import { CONFIG } from './config.js';
import { State } from './state.js';
import { Renderer } from './renderer.js';
import { Layout } from './layout.js';
import { Units } from './units.js';
import { Template } from './template.js';

export const Controls = {
    init() {
        const pipeDistanceInput = document.getElementById('pipe-distance');
        const nutClearanceInput = document.getElementById('nut-clearance');
        const viewToggleBtn = document.getElementById('view-toggle');

        pipeDistanceInput.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            if (!isNaN(value) && value > 0) {
                State.pipeDistance = value;
                if (State.view === 'template') {
                    Template.render();
                } else {
                    Renderer.calculateDimensions();
                    Renderer.render();
                }
                this.updateClearanceDisplay();
            }
        });

        nutClearanceInput.addEventListener('input', (e) => {
            const valueMm = parseFloat(e.target.value);
            if (!isNaN(valueMm) && valueMm >= 0) {
                State.nutPipeClearance = valueMm / 25.4;  // Convert mm to inches
                if (State.view === 'template') {
                    Template.render();
                } else {
                    Renderer.render();
                }
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
            // Cycle: top -> front -> template -> top
            if (State.view === 'top') {
                State.view = 'front';
            } else if (State.view === 'front') {
                State.view = 'template';
            } else {
                State.view = 'top';
            }

            // Update button text
            const viewNames = { top: 'Top', front: 'Front', template: 'Template' };
            viewToggleBtn.textContent = `View: ${viewNames[State.view]}`;

            // Show/hide appropriate containers
            const canvasContainer = document.getElementById('canvas-container');
            const templateContainer = document.getElementById('template-container');

            if (State.view === 'template') {
                canvasContainer.style.display = 'none';
                templateContainer.style.display = 'block';
                Template.render();
            } else {
                canvasContainer.style.display = 'block';
                templateContainer.style.display = 'none';
                Renderer.calculateDimensions();
                Renderer.render();
            }
        });
    },

    /**
     * Update the clearance display UI
     */
    updateClearanceDisplay() {
        const shiftInfo = Layout.optimalShift();
        const leftClearance = Layout.nutToPipeClearance(true, shiftInfo.shift);
        const rightClearance = Layout.nutToPipeClearance(false, shiftInfo.shift);

        const leftEl = document.getElementById('clearance-left');
        const rightEl = document.getElementById('clearance-right');

        // Format shift info
        const shiftMm = Units.toMm(shiftInfo.shift);
        const minMm = Units.toMm(shiftInfo.minShift);
        const maxMm = Units.toMm(shiftInfo.maxShift);

        if (shiftInfo.hasConflict) {
            leftEl.textContent = `CONFLICT: Need ${minMm.toFixed(1)}mm shift, max allowed ${maxMm.toFixed(1)}mm`;
            leftEl.style.color = '#c62828';
            rightEl.textContent = `Using ${shiftMm.toFixed(1)}mm (inner holes may pass center)`;
            rightEl.style.color = '#c62828';
        } else {
            leftEl.textContent = `Shift: ${shiftMm.toFixed(2)}mm (range: ${minMm.toFixed(1)}-${maxMm.toFixed(1)}mm)`;
            leftEl.style.color = '#2e7d32';
            rightEl.textContent = leftClearance.isOk ? 'Nut clearance: OK' : 'Nut clearance: Check';
            rightEl.style.color = leftClearance.isOk ? '#2e7d32' : '#ff9800';
        }

        // Update placement guide
        this.updatePlacementGuide(shiftInfo.shift);
    },

    /**
     * Update the placement guide display with practical measurements
     */
    updatePlacementGuide(shift) {
        const b = CONFIG.bracket;
        const shelfOverhang = (CONFIG.shelf.width - State.pipeDistance) / 2;
        const holeCenterFromBracketCenter = b.width / 2 - b.holeCenter;

        // Distance from shelf edge to bracket outer edge
        // Bracket outer edge (for left bracket) is at: -shift - b.width/2
        // Shelf edge is at: -shelfOverhang
        // Distance = shelfEdge - bracketOuterEdge = -shelfOverhang - (-shift - b.width/2)
        //          = -shelfOverhang + shift + b.width/2 = shift + b.width/2 - shelfOverhang
        const bracketEdgeFromShelfEdge = shift + b.width / 2 - shelfOverhang;

        // Distance from shelf edge to inner drill hole center
        // Inner hole (for left bracket) is at: -shift + holeCenterFromBracketCenter
        // Distance = shelfEdge - innerHoleX = -shelfOverhang - (-shift + holeCenterFromBracketCenter)
        //          = -shelfOverhang + shift - holeCenterFromBracketCenter
        // But we want positive "inward" distance, so:
        const innerHoleFromShelfEdge = shelfOverhang - shift + holeCenterFromBracketCenter;

        const bracketEdgeEl = document.getElementById('bracket-edge-distance');
        const drillHoleEl = document.getElementById('drill-hole-distance');

        bracketEdgeEl.textContent = `Bracket outer edge from shelf edge: ${Units.formatWithFraction(bracketEdgeFromShelfEdge)}`;
        drillHoleEl.textContent = `Inner drill hole from edge: ${Units.formatWithFraction(innerHoleFromShelfEdge)}`;
    }
};
