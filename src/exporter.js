import { jsPDF } from 'jspdf';
import 'svg2pdf.js';
import { Template } from './template.js';
import { State } from './state.js';

function generateFileName(extension) {
    const distance = State.pipeDistance.toFixed(3).replace(/\./g, '-');
    const timestamp = new Date().toISOString().replace(/[:T]/g, '-').split('.')[0];
    return `shelf-template-${distance}-${timestamp}.${extension}`;
}

/**
 * Export template as PDF using jsPDF + svg2pdf.js
 * Uses 72 points per inch which maps 1:1 to our SVG coordinates
 */
export async function exportPDF() {
    // Generate SVG content
    const svgContent = Template.generateSVG();

    // Parse SVG string to DOM element
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');
    const svgElement = svgDoc.documentElement;

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

    // Convert SVG to PDF
    // svg2pdf.js preserves coordinates when SVG viewBox matches PDF dimensions
    await pdf.svg(svgElement, {
        x: 0,
        y: 0,
        width: 612,
        height: 792
    });

    // Save the PDF
    pdf.save(generateFileName('pdf'));
}

/**
 * Export template as SVG (fallback)
 */
export function exportSVG() {
    const svgContent = Template.generateSVG();
    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = generateFileName('svg');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => URL.revokeObjectURL(url), 0);
}

/**
 * Default export function - uses PDF
 */
export async function exportTemplate() {
    await exportPDF();
}
