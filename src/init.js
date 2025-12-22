import { Renderer } from './renderer.js';
import { Controls } from './controls.js';
import { Units } from './units.js';
import { CONFIG } from './config.js';
import { Layout } from './layout.js';
import { State } from './state.js';
import { Template } from './template.js';

export function init() {
    Renderer.init();
    Controls.init();
    Renderer.render();
    Controls.updateClearanceDisplay();

    // Handle window resize
    window.addEventListener('resize', () => {
        Renderer.calculateDimensions();
        Renderer.render();
    });

    window.addEventListener('beforeprint', () => {
        const templateContainer = document.getElementById('template-container');
        // Always render fresh printable view before printing
        Template.render();
        templateContainer.style.display = 'block';
    });

    window.addEventListener('afterprint', () => {
        // Restore canvas view after printing
        const templateContainer = document.getElementById('template-container');
        const canvasContainer = document.getElementById('canvas-container');
        templateContainer.style.display = 'none';
        canvasContainer.style.display = 'block';
    });

    // Log dimensions for verification
    console.log('Shelf Measure initialized');
    console.log('Shelf:', Units.formatInches(CONFIG.shelf.width, true), 'x', Units.formatInches(CONFIG.shelf.depth, true));
    console.log('Pipe diameter:', Units.formatInches(CONFIG.pipe.diameter, true));
    console.log('Pipe distance (front):', Units.formatInches(State.pipeDistanceFront, true));
    console.log('Pipe distance (back):', Units.formatInches(State.pipeDistanceBack, true));
    console.log('Scale:', Renderer.scale.toFixed(2), 'pixels per inch');
    const inset = Layout.bracketInsetDepth();
    const gap = CONFIG.shelf.depth - 2 * inset - 2 * CONFIG.bracket.length;
    console.log('Bracket inset (depth):', Units.formatInches(inset, true));
    console.log('Bracket gap between (depth):', Units.formatInches(gap, true));

    // Log clearance info for both positions
    const shiftInfoFront = Layout.optimalShift('bottom');
    const shiftInfoBack = Layout.optimalShift('top');
    console.log('Front bracket shift:', Units.formatInches(shiftInfoFront.shift, true));
    console.log('Back bracket shift:', Units.formatInches(shiftInfoBack.shift, true));
    console.log('Min shift (button head, front):', Units.formatInches(shiftInfoFront.minShiftButtonHead, true));
    console.log('Min shift (button head, back):', Units.formatInches(shiftInfoBack.minShiftButtonHead, true));
    console.log('Min shift (nut clearance):', Units.formatInches(shiftInfoFront.minShiftNut, true));
    if (shiftInfoFront.hasConflict || shiftInfoBack.hasConflict) {
        console.warn('CONFLICT: Required min shift exceeds max allowed!');
    }
}
