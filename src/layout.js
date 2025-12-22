import { CONFIG } from './config.js';
import { State } from './state.js';

export const Layout = {
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

    minShiftForButtonHeadClearance() {
        const b = CONFIG.bracket;
        const hw = CONFIG.hardware;
        const shelfOverhang = (CONFIG.shelf.width - State.pipeDistance) / 2;
        const holeCenterFromBracketCenter = b.width / 2 - b.holes.left;
        const buttonHeadRadius = hw.buttonScrew.headDiameter / 2;

        return shelfOverhang - holeCenterFromBracketCenter + buttonHeadRadius + b.holeClearance;
    },

    minShiftForNutClearance() {
        const hw = CONFIG.hardware;
        const pipeRadius = CONFIG.pipe.diameter / 2;
        const holeCenterFromBracketCenter = CONFIG.bracket.width / 2 - CONFIG.bracket.holes.left;
        const nutInnerRadius = hw.hexCapNut.acrossFlats / 2;

        return pipeRadius - holeCenterFromBracketCenter + nutInnerRadius + State.nutPipeClearance;
    },

    maxShiftForInnerHoles() {
        const holeCenterFromBracketCenter = CONFIG.bracket.width / 2 - CONFIG.bracket.holes.left;
        return holeCenterFromBracketCenter;
    },

    nutToPipeClearance(isLeft, shift) {
        const hw = CONFIG.hardware;
        const b = CONFIG.bracket;
        const pipeRadius = CONFIG.pipe.diameter / 2;
        const holeCenterFromBracketCenter = b.width / 2 - b.holes.left;
        const nutInnerRadius = hw.hexCapNut.acrossFlats / 2;

        const pipeCenter = isLeft ? 0 : State.pipeDistance;
        const bracketCenterX = isLeft ? pipeCenter - shift : pipeCenter + shift;
        const outerHoleX = isLeft
            ? bracketCenterX - holeCenterFromBracketCenter
            : bracketCenterX + holeCenterFromBracketCenter;

        const nutInnerEdgeX = isLeft
            ? outerHoleX + nutInnerRadius
            : outerHoleX - nutInnerRadius;

        const pipeOuterEdge = isLeft ? -pipeRadius : State.pipeDistance + pipeRadius;

        const clearance = isLeft
            ? pipeOuterEdge - nutInnerEdgeX
            : nutInnerEdgeX - pipeOuterEdge;

        return {
            clearance: Math.abs(clearance),
            isOk: (isLeft ? nutInnerEdgeX <= pipeOuterEdge : nutInnerEdgeX >= pipeOuterEdge),
            required: State.nutPipeClearance
        };
    },

    optimalShift() {
        const minShiftButtonHead = this.minShiftForButtonHeadClearance();
        const minShiftNut = this.minShiftForNutClearance();
        const maxShiftInnerHoles = this.maxShiftForInnerHoles();

        const minShift = Math.max(minShiftButtonHead, minShiftNut);
        const maxShift = maxShiftInnerHoles;

        const hasConflict = minShift > maxShift;
        const shift = hasConflict ? maxShift : minShift;

        return {
            shift,
            minShift,
            maxShift,
            minShiftButtonHead,
            minShiftNut,
            hasConflict
        };
    }
};
