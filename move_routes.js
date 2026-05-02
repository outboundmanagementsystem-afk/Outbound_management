const fs = require('fs');
const path = require('path');

const baseDir = path.join('d:', 'tms', 'app');
const dashboardDir = path.join(baseDir, '(dashboard)');

if (fs.existsSync(dashboardDir)) {
    const items = fs.readdirSync(dashboardDir);
    items.forEach(item => {
        const oldPath = path.join(dashboardDir, item);
        const newPath = path.join(baseDir, item);
        
        if (item === 'layout.tsx') {
            // Rename dashboard layout to avoid conflict with root layout
            fs.renameSync(oldPath, path.join(baseDir, 'dashboard-layout-root.tsx'));
            console.log(`Renamed dashboard layout to dashboard-layout-root.tsx`);
        } else {
            if (fs.existsSync(newPath)) {
                console.log(`Conflict: ${newPath} already exists. Skipping.`);
            } else {
                fs.renameSync(oldPath, newPath);
                console.log(`Moved ${item} to root.`);
            }
        }
    });
    // Remove the empty directory
    // fs.rmdirSync(dashboardDir);
} else {
    console.log(`(dashboard) directory not found.`);
}
