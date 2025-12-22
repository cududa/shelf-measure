import { CONFIG } from './config.js';
import { State } from './state.js';
import { Renderer } from './renderer.js';
import { Layout } from './layout.js';
import { Units } from './units.js';
import { exportTemplate, exportSVG, downloadTemplate } from './exporter.js';
import { Favorites } from './favorites.js';

export const Controls = {
    init() {
        const shelfNumberInput = document.getElementById('shelf-number');
        const pipeDistanceInput = document.getElementById('pipe-distance');
        const nutClearanceInput = document.getElementById('nut-clearance');
        const viewToggleBtn = document.getElementById('view-toggle');
        const openBtn = document.getElementById('open-template');
        const downloadBtn = document.getElementById('download-template');

        shelfNumberInput.addEventListener('input', (e) => {
            State.shelfNumber = e.target.value.trim();
        });

        pipeDistanceInput.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            if (!isNaN(value) && value > 0) {
                State.pipeDistance = value;
                Renderer.calculateDimensions();
                Renderer.render();
                this.updateClearanceDisplay();
            }
        });

        nutClearanceInput.addEventListener('input', (e) => {
            const valueMm = parseFloat(e.target.value);
            if (!isNaN(valueMm) && valueMm >= 0) {
                State.nutPipeClearance = valueMm / 25.4;  // Convert mm to inches
                Renderer.calculateDimensions();
                Renderer.render();
                this.updateClearanceDisplay();

                if (valueMm < 0.25) {
                    nutClearanceInput.style.borderColor = '#c62828';
                    nutClearanceInput.style.backgroundColor = '#ffebee';
                    nutClearanceInput.title = 'Warning: Gap below 0.25mm recommended minimum';
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

        openBtn.addEventListener('click', async () => {
            openBtn.disabled = true;
            try {
                await exportTemplate();
            } catch (error) {
                console.error('PDF export failed:', error);
                alert('PDF export failed. Falling back to SVG export.');
                exportSVG();
            } finally {
                openBtn.disabled = false;
            }
        });

        downloadBtn.addEventListener('click', async () => {
            downloadBtn.disabled = true;
            try {
                await downloadTemplate();
            } catch (error) {
                console.error('PDF download failed:', error);
                alert('PDF download failed. Falling back to SVG download.');
                exportSVG();
            } finally {
                downloadBtn.disabled = false;
            }
        });

        // Save favorite button
        const saveFavoriteBtn = document.getElementById('save-favorite');
        saveFavoriteBtn.addEventListener('click', () => {
            Favorites.save();
        });

        // Listen for favorites being loaded to update UI
        window.addEventListener('favorites-loaded', () => {
            shelfNumberInput.value = State.shelfNumber;
            pipeDistanceInput.value = State.pipeDistance;
            nutClearanceInput.value = (State.nutPipeClearance * 25.4).toFixed(2);
            Renderer.calculateDimensions();
            Renderer.render();
            this.updateClearanceDisplay();
        });

        // Initialize favorites table
        Favorites.init();
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
        // pipeDistance is inside-to-inside, so center-to-center = pipeDistance + diameter
        const pipeCenterToCenter = State.pipeDistance + CONFIG.pipe.diameter;
        const shelfOverhang = (CONFIG.shelf.width - pipeCenterToCenter) / 2;
        const holeCenterFromBracketCenter = b.width / 2 - b.holes.left;

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
