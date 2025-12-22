import { CONFIG } from './config.js';

export const State = {
    pipeDistanceFront: 28.96875,  // Distance between inner edges of pipes at front/bottom
    pipeDistanceBack: 28.96875,   // Distance between inner edges of pipes at back/top
    shelfOpacity: 1.0,            // 1.0 or 0.5
    view: 'top',                  // 'top', 'front', or 'template'
    nutPipeClearance: CONFIG.hardware.nutPipeClearance.target,  // Default gap in inches
    shelfNumber: ''               // Optional shelf identifier (1, 2, a, b, etc.)
};
