export const CONFIG = {
    shelf: {
        width: 30,
        depth: 12,
        height: 1 // For front view
    },
    pipe: {
        diameter: 1.0743,
        length: 13,
        overhang: 0.5 // How much pipe extends beyond shelf top/bottom
    },
    bracket: {
        // All measurements converted from mm to inches
        width: 38 / 25.4,           // 38mm = 1.4961"
        length: 60 / 25.4,          // 60mm = 2.3622" (along pipe)
        thickness: 1.5 / 25.4,      // 1.5mm = 0.05906"
        holes: {
            left: 9 / 25.4,
            right: 9 / 25.4,
            bottom: 9 / 25.4,
            top: 9 / 25.4,
        }, holeDiameter: 4.5 / 25.4,   // 4.5mm = 0.17717"
        holeClearance: 1 / 16       // Keep holes this far inside/outside shelf edges
    },
    hardware: {
        // M4-0.7 x 8mm ISO 7380 Button Head Cap Screw
        buttonScrew: {
            headDiameter: 7.6 / 25.4,    // 7.6mm typical for M4 button head
            headHeight: 2.2 / 25.4       // 2.2mm typical height
        },
        // M4 Brass Hex Cap Nut
        hexCapNut: {
            acrossFlats: 4.9 / 25.4,     // 4.9mm AF
            acrossCorners: 7.9 / 25.4,   // 7.9mm AC (corner-to-corner)
            height: 9.3 / 25.4           // 9.3mm total height
        },
        // Clearance requirements
        nutPipeClearance: {
            target: 1 / 25.4,            // Target gap: 1mm
            minimum: 1.0 / 25.4          // Minimum acceptable: 1.0mm
        }
    },
    precision: 5,
    mmPerInch: 25.4,
    layout: {
        // Bracket placement along shelf depth
        // mode: 'golden' uses golden ratio on the free space after subtracting bracket lengths
        mode: 'golden',
        phi: (1 + Math.sqrt(5)) / 2
    },
    display: {
        padding: 40,        // Canvas padding in pixels
        minCanvasWidth: 600,
        minCanvasHeight: 300
    },
    colors: {
        shelf: '#d4a574',
        shelfStroke: '#8b6914',
        pipe: '#6b7b8a',
        pipeStroke: '#3d4a54',
        bracket: '#2d2d2d',
        bracketStroke: '#1a1a1a',
        bracketHole: '#ffffff',
        background: '#ffffff',
        // Hardware colors
        buttonScrewHead: '#4a4a4a',
        buttonScrewHeadStroke: '#2d2d2d',
        buttonScrewSocket: '#1a1a1a',
        hexNut: '#b8860b',           // Brass color
        hexNutStroke: '#8b6914'
    }
};
