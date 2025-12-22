import { State } from './state.js';
import { exportAllToNewTab, downloadTemplate } from './exporter.js';

const STORAGE_KEY = 'shelf-measure-favorites';

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

export const Favorites = {
    getAll() {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    },

    save() {
        const favorites = this.getAll();
        const entry = {
            id: generateUUID(),
            shelfNumber: State.shelfNumber,
            pipeDistance: State.pipeDistance,
            nutPipeClearance: State.nutPipeClearance,
            createdAt: new Date().toISOString()
        };
        favorites.push(entry);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
        this.renderTable();
        return entry;
    },

    delete(id) {
        const favorites = this.getAll().filter(f => f.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
        this.renderTable();
    },

    load(id) {
        const favorites = this.getAll();
        const entry = favorites.find(f => f.id === id);
        if (entry) {
            State.shelfNumber = entry.shelfNumber || '';
            State.pipeDistance = entry.pipeDistance;
            State.nutPipeClearance = entry.nutPipeClearance;
            return entry;
        }
        return null;
    },

    renderTable() {
        const container = document.getElementById('favorites-table-container');
        const favorites = this.getAll();

        // Sort by shelf number (natural sort: 1, 2, 10, a, b, etc.)
        favorites.sort((a, b) => {
            const aNum = a.shelfNumber || '';
            const bNum = b.shelfNumber || '';
            return aNum.localeCompare(bNum, undefined, { numeric: true, sensitivity: 'base' });
        });

        if (favorites.length === 0) {
            container.innerHTML = '<p style="color: #666; font-size: 13px;">No saved configurations yet.</p>';
            return;
        }

        const table = document.createElement('table');
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Shelf #</th>
                    <th>Pipe Distance (in)</th>
                    <th>Nut Gap (mm)</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${favorites.map(f => `
                    <tr data-id="${f.id}">
                        <td>${f.shelfNumber || '-'}</td>
                        <td>${f.pipeDistance.toFixed(5)}</td>
                        <td>${(f.nutPipeClearance * 25.4).toFixed(2)}</td>
                        <td>
                            <button class="load-btn" data-id="${f.id}">Load</button>
                            <button class="delete-btn" data-id="${f.id}">Delete</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        `;

        container.innerHTML = '';
        container.appendChild(table);

        // Attach event listeners
        container.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                this.delete(id);
            });
        });

        container.querySelectorAll('.load-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                this.load(id);
                // Dispatch event so controls can update UI
                window.dispatchEvent(new CustomEvent('favorites-loaded'));
            });
        });

        // Add "Export All" section if 2+ items
        if (favorites.length >= 2) {
            const exportAllDiv = document.createElement('div');
            exportAllDiv.style.cssText = 'margin-top: 10px; font-size: 13px; color: #333;';
            exportAllDiv.innerHTML = `
                <span>Export All:</span>
                <a href="#" id="export-all-newtab" style="margin-left: 8px; color: #2e7d32; text-decoration: underline; cursor: pointer;">New Tab</a>
                <a href="#" id="export-all-download" style="margin-left: 12px; color: #2e7d32; text-decoration: underline; cursor: pointer;">Download</a>
            `;
            container.appendChild(exportAllDiv);

            document.getElementById('export-all-newtab').addEventListener('click', async (e) => {
                e.preventDefault();
                await this.exportAll(false);
            });

            document.getElementById('export-all-download').addEventListener('click', async (e) => {
                e.preventDefault();
                await this.exportAll(true);
            });
        }
    },

    /**
     * Export all favorites
     * @param {boolean} download - true to download individual files, false to open single multi-page PDF
     */
    async exportAll(download) {
        // Sort favorites by shelf number before export
        const favorites = this.getAll().sort((a, b) => {
            const aNum = a.shelfNumber || '';
            const bNum = b.shelfNumber || '';
            return aNum.localeCompare(bNum, undefined, { numeric: true, sensitivity: 'base' });
        });

        if (download) {
            // Download individual PDFs
            const originalState = {
                shelfNumber: State.shelfNumber,
                pipeDistance: State.pipeDistance,
                nutPipeClearance: State.nutPipeClearance
            };

            for (const entry of favorites) {
                State.shelfNumber = entry.shelfNumber || '';
                State.pipeDistance = entry.pipeDistance;
                State.nutPipeClearance = entry.nutPipeClearance;

                try {
                    await downloadTemplate();
                    await new Promise(resolve => setTimeout(resolve, 300));
                } catch (error) {
                    console.error('Export failed for:', entry, error);
                }
            }

            // Restore original state
            State.shelfNumber = originalState.shelfNumber;
            State.pipeDistance = originalState.pipeDistance;
            State.nutPipeClearance = originalState.nutPipeClearance;
        } else {
            // Open single multi-page PDF in new tab
            await exportAllToNewTab(favorites);
        }
    },

    init() {
        this.renderTable();
    }
};
