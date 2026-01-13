/**
 * Enhanced Features for Government Travel App
 * - Auto-save functionality
 * - Dark mode toggle
 * - Keyboard shortcuts
 * - Trip history
 * - Toast notifications
 * - Export functionality
 */

// ============ AUTO-SAVE FUNCTIONALITY ============

class AutoSave {
    constructor(formId, saveInterval = 2000) {
        this.form = document.getElementById(formId);
        this.saveInterval = saveInterval;
        this.saveTimer = null;
        this.storageKey = 'travel_form_autosave';
        
        this.init();
    }

    init() {
        if (!this.form) return;

        // Load saved data on page load
        this.loadSavedData();

        // Set up auto-save on form changes
        this.form.addEventListener('input', () => this.scheduleSave());
        this.form.addEventListener('change', () => this.scheduleSave());

        // Show indicator
        this.createIndicator();
    }

    createIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'autosave-indicator';
        indicator.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 8px 16px;
            background: #4caf50;
            color: white;
            border-radius: 4px;
            font-size: 14px;
            opacity: 0;
            transition: opacity 0.3s;
            z-index: 10000;
            pointer-events: none;
        `;
        document.body.appendChild(indicator);
    }

    showIndicator(message, type = 'success') {
        const indicator = document.getElementById('autosave-indicator');
        if (!indicator) return;

        const colors = {
            success: '#4caf50',
            warning: '#ff9800',
            error: '#f44336'
        };

        indicator.textContent = message;
        indicator.style.background = colors[type] || colors.success;
        indicator.style.opacity = '1';

        setTimeout(() => {
            indicator.style.opacity = '0';
        }, 2000);
    }

    scheduleSave() {
        clearTimeout(this.saveTimer);
        this.saveTimer = setTimeout(() => this.save(), this.saveInterval);
    }

    save() {
        const formData = new FormData(this.form);
        const data = {};
        
        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }

        // Add timestamp
        data._savedAt = new Date().toISOString();

        try {
            localStorage.setItem(this.storageKey, JSON.stringify(data));
            this.showIndicator('✓ Auto-saved', 'success');
            console.log('Form auto-saved at', data._savedAt);
        } catch (error) {
            console.error('Auto-save failed:', error);
            this.showIndicator('⚠ Save failed', 'error');
        }
    }

    loadSavedData() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (!saved) return;

            const data = JSON.parse(saved);
            const savedDate = new Date(data._savedAt);
            const hoursSince = (Date.now() - savedDate) / (1000 * 60 * 60);

            // Only restore if less than 24 hours old
            if (hoursSince > 24) {
                this.clearSaved();
                return;
            }

            // Show restore prompt
            const shouldRestore = confirm(
                `Found auto-saved form data from ${savedDate.toLocaleString()}.\n\nRestore this data?`
            );

            if (shouldRestore) {
                this.restoreData(data);
                this.showIndicator('✓ Data restored', 'success');
            } else {
                this.clearSaved();
            }
        } catch (error) {
            console.error('Failed to load saved data:', error);
        }
    }

    restoreData(data) {
        for (let [key, value] of Object.entries(data)) {
            if (key === '_savedAt') continue;
            
            const field = this.form.elements[key];
            if (field) {
                field.value = value;
                // Trigger change event to update any dependent fields
                field.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }
    }

    clearSaved() {
        localStorage.removeItem(this.storageKey);
    }

    manualSave() {
        this.save();
        this.showIndicator('✓ Saved', 'success');
    }
}

// ============ DARK MODE ============

class DarkMode {
    constructor() {
        this.storageKey = 'travel_app_dark_mode';
        this.isDark = this.getSavedPreference();
        
        this.init();
    }

    init() {
        // Create toggle button
        this.createToggle();
        
        // Apply saved preference
        if (this.isDark) {
            this.enable();
        }
    }

    createToggle() {
        const toggle = document.createElement('button');
        toggle.id = 'dark-mode-toggle';
        toggle.className = 'dark-mode-toggle';
        toggle.innerHTML = '🌙';
        toggle.title = 'Toggle dark mode';
        toggle.onclick = () => this.toggle();
        
        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .dark-mode-toggle {
                position: fixed;
                top: 80px;
                right: 20px;
                width: 50px;
                height: 50px;
                border-radius: 50%;
                border: none;
                background: #333;
                color: #fff;
                font-size: 24px;
                cursor: pointer;
                box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                transition: all 0.3s;
                z-index: 9999;
            }
            
            .dark-mode-toggle:hover {
                transform: scale(1.1);
            }
            
            body.dark-mode {
                background: #1a1a1a;
                color: #e0e0e0;
            }
            
            body.dark-mode .container {
                background: #2a2a2a;
            }
            
            body.dark-mode header {
                background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
            }
            
            body.dark-mode .form-section {
                background: #333;
                border-color: #444;
            }
            
            body.dark-mode input, 
            body.dark-mode select, 
            body.dark-mode textarea {
                background: #444;
                color: #e0e0e0;
                border-color: #555;
            }
            
            body.dark-mode button {
                background: #0056b3;
            }
            
            body.dark-mode button:hover {
                background: #003d82;
            }
            
            body.dark-mode .results {
                background: #333;
                border-color: #444;
            }
            
            body.dark-mode .cost-item {
                border-color: #444;
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(toggle);
    }

    getSavedPreference() {
        return localStorage.getItem(this.storageKey) === 'true';
    }

    toggle() {
        this.isDark = !this.isDark;
        this.isDark ? this.enable() : this.disable();
    }

    enable() {
        document.body.classList.add('dark-mode');
        document.getElementById('dark-mode-toggle').innerHTML = '☀️';
        localStorage.setItem(this.storageKey, 'true');
        this.isDark = true;
    }

    disable() {
        document.body.classList.remove('dark-mode');
        document.getElementById('dark-mode-toggle').innerHTML = '🌙';
        localStorage.setItem(this.storageKey, 'false');
        this.isDark = false;
    }
}

// ============ KEYBOARD SHORTCUTS ============

class KeyboardShortcuts {
    constructor() {
        this.shortcuts = {
            'ctrl+s': () => this.saveForm(),
            'ctrl+e': () => this.calculateEstimate(),
            'ctrl+r': () => this.resetForm(),
            'ctrl+h': () => this.showHistory(),
            'ctrl+d': () => this.toggleDarkMode(),
            'esc': () => this.closeModals()
        };
        
        this.init();
    }

    init() {
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
        this.createShortcutsHelp();
    }

    handleKeyPress(e) {
        const key = [];
        
        if (e.ctrlKey) key.push('ctrl');
        if (e.shiftKey) key.push('shift');
        if (e.altKey) key.push('alt');
        
        key.push(e.key.toLowerCase());
        
        const shortcut = key.join('+');
        
        if (this.shortcuts[shortcut]) {
            e.preventDefault();
            this.shortcuts[shortcut]();
        }
    }

    saveForm() {
        if (window.autoSave) {
            window.autoSave.manualSave();
        }
    }

    calculateEstimate() {
        const form = document.getElementById('travelForm');
        if (form) {
            form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        }
    }

    resetForm() {
        const form = document.getElementById('travelForm');
        if (form && confirm('Reset form? Unsaved changes will be lost.')) {
            form.reset();
        }
    }

    showHistory() {
        if (window.tripHistory) {
            window.tripHistory.show();
        }
    }

    toggleDarkMode() {
        if (window.darkMode) {
            window.darkMode.toggle();
        }
    }

    closeModals() {
        // Close any open modals
        const modals = document.querySelectorAll('.modal, .popup');
        modals.forEach(modal => modal.style.display = 'none');
    }

    createShortcutsHelp() {
        const helpButton = document.createElement('button');
        helpButton.id = 'shortcuts-help';
        helpButton.innerHTML = '⌨️ Shortcuts';
        helpButton.className = 'shortcuts-help-button';
        helpButton.onclick = () => this.showHelp();
        
        const style = document.createElement('style');
        style.textContent = `
            .shortcuts-help-button {
                position: fixed;
                bottom: 20px;
                right: 20px;
                padding: 10px 20px;
                background: #007bff;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                z-index: 9999;
            }
            
            .shortcuts-help-modal {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                padding: 30px;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                z-index: 10000;
                max-width: 500px;
            }
            
            .shortcuts-help-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.5);
                z-index: 9999;
            }
            
            .shortcut-item {
                display: flex;
                justify-content: space-between;
                padding: 8px 0;
                border-bottom: 1px solid #eee;
            }
            
            .shortcut-key {
                font-family: monospace;
                background: #f5f5f5;
                padding: 2px 8px;
                border-radius: 3px;
                font-weight: bold;
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(helpButton);
    }

    showHelp() {
        const overlay = document.createElement('div');
        overlay.className = 'shortcuts-help-overlay';
        overlay.onclick = () => {
            overlay.remove();
            modal.remove();
        };
        
        const modal = document.createElement('div');
        modal.className = 'shortcuts-help-modal';
        modal.innerHTML = `
            <h3>⌨️ Keyboard Shortcuts</h3>
            <div class="shortcut-item">
                <span>Save form</span>
                <span class="shortcut-key">Ctrl + S</span>
            </div>
            <div class="shortcut-item">
                <span>Calculate estimate</span>
                <span class="shortcut-key">Ctrl + E</span>
            </div>
            <div class="shortcut-item">
                <span>Reset form</span>
                <span class="shortcut-key">Ctrl + R</span>
            </div>
            <div class="shortcut-item">
                <span>Show trip history</span>
                <span class="shortcut-key">Ctrl + H</span>
            </div>
            <div class="shortcut-item">
                <span>Toggle dark mode</span>
                <span class="shortcut-key">Ctrl + D</span>
            </div>
            <div class="shortcut-item">
                <span>Close modals</span>
                <span class="shortcut-key">Esc</span>
            </div>
            <button onclick="this.parentElement.parentElement.previousSibling.remove(); this.parentElement.remove()" 
                    style="margin-top: 20px; padding: 8px 20px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
                Close
            </button>
        `;
        
        document.body.appendChild(overlay);
        document.body.appendChild(modal);
    }
}

// ============ TRIP HISTORY ============

class TripHistory {
    constructor() {
        this.storageKey = 'travel_trip_history';
        this.maxHistory = 20;
        
        this.init();
    }

    init() {
        this.createHistoryButton();
    }

    createHistoryButton() {
        const button = document.createElement('button');
        button.id = 'trip-history-button';
        button.innerHTML = '📚 Trip History';
        button.className = 'trip-history-button';
        button.onclick = () => this.show();
        
        const style = document.createElement('style');
        style.textContent = `
            .trip-history-button {
                position: fixed;
                bottom: 20px;
                left: 20px;
                padding: 10px 20px;
                background: #28a745;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                z-index: 9999;
            }
            
            .trip-history-modal {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                padding: 30px;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                z-index: 10000;
                max-width: 700px;
                max-height: 80vh;
                overflow-y: auto;
                width: 90%;
            }
            
            .trip-item {
                padding: 15px;
                margin: 10px 0;
                border: 1px solid #ddd;
                border-radius: 4px;
                cursor: pointer;
                transition: background 0.2s;
            }
            
            .trip-item:hover {
                background: #f5f5f5;
            }
            
            .trip-item-header {
                font-weight: bold;
                margin-bottom: 5px;
            }
            
            .trip-item-details {
                font-size: 0.9em;
                color: #666;
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(button);
    }

    save(tripData) {
        const history = this.getAll();
        
        const trip = {
            id: Date.now(),
            ...tripData,
            savedAt: new Date().toISOString()
        };
        
        history.unshift(trip);
        
        // Keep only max items
        const trimmed = history.slice(0, this.maxHistory);
        
        localStorage.setItem(this.storageKey, JSON.stringify(trimmed));
    }

    getAll() {
        try {
            const history = localStorage.getItem(this.storageKey);
            return history ? JSON.parse(history) : [];
        } catch (error) {
            console.error('Failed to load trip history:', error);
            return [];
        }
    }

    show() {
        const history = this.getAll();
        
        const overlay = document.createElement('div');
        overlay.className = 'shortcuts-help-overlay';
        overlay.onclick = () => {
            overlay.remove();
            modal.remove();
        };
        
        const modal = document.createElement('div');
        modal.className = 'trip-history-modal';
        
        if (history.length === 0) {
            modal.innerHTML = `
                <h3>📚 Trip History</h3>
                <p>No saved trips yet. Complete a trip estimate to save it to history.</p>
                <button onclick="this.parentElement.parentElement.previousSibling.remove(); this.parentElement.remove()" 
                        style="margin-top: 20px; padding: 8px 20px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    Close
                </button>
            `;
        } else {
            let html = '<h3>📚 Trip History</h3>';
            html += '<p style="color: #666; margin-bottom: 20px;">Click on a trip to reload it</p>';
            
            history.forEach(trip => {
                const date = new Date(trip.savedAt).toLocaleString();
                html += `
                    <div class="trip-item" onclick="window.tripHistory.load(${trip.id})">
                        <div class="trip-item-header">
                            ${trip.departureCity || 'Unknown'} → ${trip.destinationCity || 'Unknown'}
                        </div>
                        <div class="trip-item-details">
                            ${trip.departureDate || 'No date'} | Total: $${trip.totalCost || '0'} | Saved: ${date}
                        </div>
                    </div>
                `;
            });
            
            html += `
                <div style="margin-top: 20px; display: flex; gap: 10px;">
                    <button onclick="window.tripHistory.clearAll()" 
                            style="padding: 8px 20px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        Clear All
                    </button>
                    <button onclick="this.parentElement.parentElement.parentElement.previousSibling.remove(); this.parentElement.parentElement.remove()" 
                            style="padding: 8px 20px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        Close
                    </button>
                </div>
            `;
            
            modal.innerHTML = html;
        }
        
        document.body.appendChild(overlay);
        document.body.appendChild(modal);
    }

    load(tripId) {
        const history = this.getAll();
        const trip = history.find(t => t.id === tripId);
        
        if (!trip) {
            alert('Trip not found');
            return;
        }
        
        // Close modal
        document.querySelector('.shortcuts-help-overlay')?.remove();
        document.querySelector('.trip-history-modal')?.remove();
        
        // Load trip data into form
        const form = document.getElementById('travelForm');
        if (!form) return;
        
        for (let [key, value] of Object.entries(trip)) {
            if (key === 'id' || key === 'savedAt' || key === 'totalCost') continue;
            
            const field = form.elements[key];
            if (field) {
                field.value = value;
                field.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }
        
        // Show success message
        showToast('✓ Trip loaded from history', 'success');
    }

    clearAll() {
        if (confirm('Clear all trip history? This cannot be undone.')) {
            localStorage.removeItem(this.storageKey);
            this.show(); // Refresh display
        }
    }
}

// ============ TOAST NOTIFICATIONS ============

function showToast(message, type = 'info', duration = 3000) {
    // Remove existing toast
    const existing = document.getElementById('toast-notification');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.id = 'toast-notification';
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    const colors = {
        success: '#4caf50',
        error: '#f44336',
        warning: '#ff9800',
        info: '#2196f3'
    };
    
    toast.style.cssText = `
        position: fixed;
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%);
        padding: 15px 25px;
        background: ${colors[type] || colors.info};
        color: white;
        border-radius: 4px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10001;
        animation: slideUp 0.3s ease-out;
    `;
    
    // Add animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideUp {
            from {
                transform: translateX(-50%) translateY(100px);
                opacity: 0;
            }
            to {
                transform: translateX(-50%) translateY(0);
                opacity: 1;
            }
        }
    `;
    if (!document.getElementById('toast-animations')) {
        style.id = 'toast-animations';
        document.head.appendChild(style);
    }
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideUp 0.3s ease-out reverse';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// ============ EXPORT FUNCTIONALITY ============

function exportToExcel(data, filename = 'travel_estimate.xlsx') {
    // This requires xlsx library - for now we'll export as CSV
    exportToCSV(data, filename.replace('.xlsx', '.csv'));
}

function exportToCSV(data, filename = 'travel_estimate.csv') {
    const rows = [];
    
    // Add headers
    rows.push(['Government Travel Cost Estimate']);
    rows.push([`Generated: ${new Date().toLocaleString()}`]);
    rows.push([]);
    
    // Add trip details
    rows.push(['Trip Details']);
    rows.push(['Departure City', data.departureCity || '']);
    rows.push(['Destination City', data.destinationCity || '']);
    rows.push(['Departure Date', data.departureDate || '']);
    rows.push(['Return Date', data.returnDate || '']);
    rows.push(['Number of Days', data.numberOfDays || '']);
    rows.push([]);
    
    // Add cost breakdown
    rows.push(['Cost Breakdown']);
    rows.push(['Category', 'Amount (CAD)']);
    rows.push(['Transportation', data.transportCost || '0']);
    rows.push(['Accommodation', data.accommodationCost || '0']);
    rows.push(['Meals', data.mealsCost || '0']);
    rows.push(['Incidentals', data.incidentalsCost || '0']);
    rows.push([]);
    rows.push(['Total Cost', data.totalCost || '0']);
    
    // Convert to CSV
    const csv = rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    
    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    
    showToast('✓ Export complete', 'success');
}

// ============ INITIALIZE ON PAGE LOAD ============

document.addEventListener('DOMContentLoaded', () => {
    // Initialize features
    window.autoSave = new AutoSave('travelForm');
    window.darkMode = new DarkMode();
    window.keyboardShortcuts = new KeyboardShortcuts();
    window.tripHistory = new TripHistory();
    
    console.log('✨ Enhanced features loaded');
    console.log('- Auto-save enabled');
    console.log('- Dark mode available');
    console.log('- Keyboard shortcuts active');
    console.log('- Trip history ready');
});
