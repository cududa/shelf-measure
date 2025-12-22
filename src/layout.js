import { CONFIG } from './config.js';
import { State } from './state.js';

export const Layout = {
    /**
     * Helper to fetch the correct pipe span for a given depth position
     * @param {string} position - 'top' (back) or 'bottom' (front)
     */
    getPipeDistanceForPosition(position = 'bottom') {
        return position === 'top' ? State.pipeDistanceBack : State.pipeDistanceFront;
    },

    bracketInsetDepth() {
        const depth = CONFIG.shelf.depth;
        const L = CONFIG.bracket.length;
        const phi = CONFIG.layout?.phi ?? ((1 + Math.sqrt(5)) / 2);

        if ((CONFIG.layout?.mode ?? 'golden') !== 'golden') return 0;

        const free = depth - 2 * L;
        if (free <= 0) return 0;

        const inset = free / (2 * (1 + phi));
        if (!Number.isFinite(inset) || inset < 0) return 0;

        return inset;
    },

    bracketYTopView(position) {
        const inset = this.bracketInsetDepth();
        const depth = CONFIG.shelf.depth;
        const L = CONFIG.bracket.length;

        if (position === 'top') return inset;
        return depth - inset - L;
    },

    minShiftForButtonHeadClearance(position = 'bottom') {
        const b = CONFIG.bracket;
        const hw = CONFIG.hardware;
        const pipeDistance = this.getPipeDistanceForPosition(position);
        const shelfOverhang = (CONFIG.shelf.width - pipeDistance) / 2;
        const holeCenterFromBracketCenter = b.width / 2 - b.holes.left;
        const buttonHeadRadius = hw.buttonScrew.headDiameter / 2;

        return shelfOverhang - holeCenterFromBracketCenter + buttonHeadRadius + b.holeClearance;
    },

    minShiftForNutClearance() {
        const hw = CONFIG.hardware;
        const pipeRadius = CONFIG.pipe.diameter / 2;
        const holeCenterFromBracketCenter = CONFIG.bracket.width / 2 - CONFIG.bracket.holes.left;
        const nutInnerRadius = hw.hexCapNut.acrossFlats / 2;

        const tangencyShift = pipeRadius - holeCenterFromBracketCenter + nutInnerRadius;
        return Math.max(0, tangencyShift);
    },

    maxShiftForInnerHoles() {
        const holeCenterFromBracketCenter = CONFIG.bracket.width / 2 - CONFIG.bracket.holes.left;
        return holeCenterFromBracketCenter;
    },

    nutToPipeClearance(isLeft, shift, position = 'bottom') {
        const hw = CONFIG.hardware;
        const b = CONFIG.bracket;
        const pipeRadius = CONFIG.pipe.diameter / 2;
        const pipeDistance = this.getPipeDistanceForPosition(position);
        const holeCenterFromBracketCenter = b.width / 2 - b.holes.left;
        const nutInnerRadius = hw.hexCapNut.acrossFlats / 2;

        const pipeCenter = isLeft ? 0 : pipeDistance;
        const bracketCenterX = isLeft ? pipeCenter - shift : pipeCenter + shift;
        const outerHoleX = isLeft
            ? bracketCenterX - holeCenterFromBracketCenter
            : bracketCenterX + holeCenterFromBracketCenter;

        const nutInnerEdgeX = isLeft
            ? outerHoleX + nutInnerRadius
            : outerHoleX - nutInnerRadius;

        const pipeOuterEdge = isLeft ? -pipeRadius : pipeDistance + pipeRadius;

        const clearance = isLeft
            ? pipeOuterEdge - nutInnerEdgeX
            : nutInnerEdgeX - pipeOuterEdge;

        return {
            clearance,
            isOk: clearance >= 0,
            required: State.nutPipeClearance
        };
    },

    optimalShift(position = 'bottom') {
        const minShiftButtonHead = this.minShiftForButtonHeadClearance(position);
        const minShiftNut = this.minShiftForNutClearance();

        const shift = Math.max(minShiftButtonHead, minShiftNut);

        return {
            shift,
            minShift: shift,
            maxShift: shift,
            minShiftButtonHead,
            minShiftNut,
            hasConflict: false
        };
    }
};
