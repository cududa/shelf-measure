import { CONFIG } from './config.js';

export const Units = {
    toMm(inches) {
        return inches * CONFIG.mmPerInch;
    },

    toInches(mm) {
        return mm / CONFIG.mmPerInch;
    },

    format(value, unit = 'in') {
        const formatted = value.toFixed(CONFIG.precision);
        return `${formatted} ${unit}`;
    },

    formatInches(inches, showBoth = false) {
        if (showBoth) {
            const mm = this.toMm(inches);
            return `${inches.toFixed(CONFIG.precision)}" (${mm.toFixed(CONFIG.precision)} mm)`;
        }
        return `${inches.toFixed(CONFIG.precision)}"`;
    },

    toFraction(inches) {
        const maxDenom = 32;
        const sign = inches < 0 ? '-' : '';
        const absInches = Math.abs(inches);
        const whole = Math.floor(absInches);
        const decimal = absInches - whole;

        let bestNumer = 0;
        let bestDenom = 1;
        let bestError = decimal;

        for (let denom = 1; denom <= maxDenom; denom *= 2) {
            const numer = Math.round(decimal * denom);
            const error = Math.abs(decimal - numer / denom);
            if (error < bestError) {
                bestError = error;
                bestNumer = numer;
                bestDenom = denom;
            }
        }

        const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
        if (bestNumer > 0) {
            const divisor = gcd(bestNumer, bestDenom);
            bestNumer /= divisor;
            bestDenom /= divisor;
        }

        if (bestNumer === 0 || bestNumer === bestDenom) {
            const wholeResult = bestNumer === bestDenom ? whole + 1 : whole;
            return sign + wholeResult + '"';
        } else if (whole === 0) {
            return sign + bestNumer + '/' + bestDenom + '"';
        } else {
            return sign + whole + '-' + bestNumer + '/' + bestDenom + '"';
        }
    },

    formatWithFraction(inches) {
        const precise = inches.toFixed(4) + '"';
        const fraction = this.toFraction(inches);
        const mm = this.toMm(inches).toFixed(2) + 'mm';
        return `${precise} (${fraction}, ${mm})`;
    }
};
