import { jsPDF } from 'jspdf';
import 'svg2pdf.js';
import { Template } from './template.js';
import { State } from './state.js';

function generateFileName(prefix, extension) {
    const frontDist = State.pipeDistanceFront.toFixed(3).replace(/\./g, '-');
    const backDist = State.pipeDistanceBack.toFixed(3).replace(/\./g, '-');
    const timestamp = new Date().toISOString().replace(/[:T]/g, '-').split('.')[0];
    return `${prefix}-F${frontDist}-B${backDist}-${timestamp}.${extension}`;
}

/**
 * Export templates as multi-page PDF using jsPDF + svg2pdf.js
 * Uses 72 points per inch which maps 1:1 to our SVG coordinates
 * @param {object} templates - { front: string, back: string } SVG content
 */
async function exportPDF(templates) {
    const parser = new DOMParser();

    // Create PDF with exact letter size (8.5 x 11 inches)
    // jsPDF uses points: 72 points = 1 inch
    // Letter size: 612 x 792 points
    const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'letter',
        compress: true
    });

    // Add PDF metadata to suggest no scaling
    pdf.setProperties({
        title: 'Shelf Bracket Drilling Template',
        subject: 'Print at 100% scale - do not fit to page',
        creator: 'Shelf Measure App'
    });

    // Page 1: Front template
    const frontSvgDoc = parser.parseFromString(templates.front, 'image/svg+xml');
    const frontSvgElement = frontSvgDoc.documentElement;
    await pdf.svg(frontSvgElement, {
        x: 0,
        y: 0,
        width: 612,
        height: 792
    });

    // Page 2: Back template
    pdf.addPage('letter', 'portrait');
    const backSvgDoc = parser.parseFromString(templates.back, 'image/svg+xml');
    const backSvgElement = backSvgDoc.documentElement;
    await pdf.svg(backSvgElement, {
        x: 0,
        y: 0,
        width: 612,
        height: 792
    });

    // Open PDF in new tab
    const pdfBlob = pdf.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    window.open(pdfUrl, '_blank');
}

/**
 * Export templates as SVG (fallback) - exports both as separate files
 */
export function exportSVG() {
    const templates = Template.generateSVG();

    // Export front template
    const frontBlob = new Blob([templates.front], { type: 'image/svg+xml;charset=utf-8' });
    const frontUrl = URL.createObjectURL(frontBlob);
    const frontLink = document.createElement('a');
    frontLink.href = frontUrl;
    frontLink.download = generateFileName('shelf-template-front', 'svg');
    document.body.appendChild(frontLink);
    frontLink.click();
    document.body.removeChild(frontLink);
    setTimeout(() => URL.revokeObjectURL(frontUrl), 0);

    // Export back template
    const backBlob = new Blob([templates.back], { type: 'image/svg+xml;charset=utf-8' });
    const backUrl = URL.createObjectURL(backBlob);
    const backLink = document.createElement('a');
    backLink.href = backUrl;
    backLink.download = generateFileName('shelf-template-back', 'svg');
    document.body.appendChild(backLink);
    backLink.click();
    document.body.removeChild(backLink);
    setTimeout(() => URL.revokeObjectURL(backUrl), 0);
}

/**
 * Default export function - uses multi-page PDF
 */
export async function exportTemplate() {
    const templates = Template.generateSVG();
    await exportPDF(templates);
}
