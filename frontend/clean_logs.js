const fs = require('fs');
const path = require('path');

function walk(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const p = path.join(dir, file);
        if (fs.statSync(p).isDirectory()) {
            walk(p);
        } else if (/\.(ts|tsx)$/.test(p)) {
            let content = fs.readFileSync(p, 'utf8');
            if (content.includes('console.log')) {
                const lines = content.split('\n');
                let changed = false;
                const newLines = lines.map(line => {
                    // Match console.log but not if it's already guarded by NODE_ENV
                    // This is a simple check: if the line itself doesn't have NODE_ENV
                    if (line.includes('console.log') && !line.includes('NODE_ENV')) {
                        // Check if it looks like a statement (starts with optional whitespace and console.log)
                        const match = line.match(/^(\s*)console\.log/);
                        if (match) {
                            changed = true;
                            return `${match[1]}if (process.env.NODE_ENV === 'development') ${line.trim()}`;
                        }
                    }
                    return line;
                });
                if (changed) {
                    fs.writeFileSync(p, newLines.join('\n'));
                }
            }
        }
    }
}

walk('src');
