import { State } from './state.js';

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
                        <td>${(f.nutPipeClearance * 25.4).toFixed(1)}</td>
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
    },

    init() {
        this.renderTable();
    }
};
