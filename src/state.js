import { CONFIG } from './config.js';

export const State = {
    pipeDistance: 28.96875,  // Distance between inside edges of pipes (the gap between pipes)
    shelfOpacity: 1.0,       // 1.0 or 0.5
    view: 'top',             // 'top', 'front', or 'template'
    nutPipeClearance: CONFIG.hardware.nutPipeClearance.target,  // Default gap in inches
    shelfNumber: ''          // Optional shelf identifier (1, 2, a, b, etc.)
};
