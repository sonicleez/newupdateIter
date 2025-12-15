/**
 * Automated Component Extraction Script
 * Extracts UI components from App.tsx into separate files
 */

const fs = require('fs');
const path = require('path');

// Read App.tsx
const appPath = path.join(__dirname, 'App.tsx');
const appContent = fs.readFileSync(appPath, 'utf8');
const lines = appContent.split('\n');

// Component definitions with line ranges (manually identified)
const components = [
    {
        name: 'ProjectNameInput',
        file: 'components/ProjectNameInput.tsx',
        startLine: 173,
        endLine: 193,
        imports: "import React from 'react';",
        interfaceStart: 173,
        interfaceEnd: 176
    },
    {
        name: 'Modal',
        file: 'components/Modal.tsx',
        startLine: 195,
        endLine: 212,
        imports: "import React from 'react';",
        interfaceStart: 195,
        interfaceEnd: 200
    },
    {
        name: 'SectionTitle',
        file: 'components/SectionTitle.tsx',
        startLine: 838,
        endLine: 841,
        imports: "import React from 'react';",
        hasInterface: false
    },
    {
        name: 'Tooltip',
        file: 'components/Tooltip.tsx',
        startLine: 1049,
        endLine: 1054,
        imports: "import React from 'react';",
        hasInterface: false
    },
    {
        name: 'CoffeeButton',
        file: 'components/CoffeeButton.tsx',
        startLine: 359,
        endLine: 366,
        imports: "import React from 'react';",
        interfaceStart: 359,
        interfaceEnd: 361
    },
    {
        name: 'CoffeeModal',
        file: 'components/modals/CoffeeModal.tsx',
        startLine: 344,
        endLine: 357,
        imports: "import React from 'react';\nimport { Modal } from '../Modal';",
        interfaceStart: 344,
        interfaceEnd: 348
    }
];

console.log('🚀 Starting automated component extraction...\n');

// Create directories
const dirs = ['components', 'components/modals'];
dirs.forEach(dir => {
    const dirPath = path.join(__dirname, dir);
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`✅ Created directory: ${dir}`);
    }
});

// Extract each component
components.forEach(comp => {
    try {
        console.log(`\n📦 Extracting ${comp.name}...`);

        // Extract lines
        const componentLines = [];

        // Add imports
        componentLines.push(comp.imports);
        componentLines.push('');

        // Add interface if exists
        if (comp.hasInterface !== false && comp.interfaceStart && comp.interfaceEnd) {
            for (let i = comp.interfaceStart - 1; i < comp.interfaceEnd; i++) {
                componentLines.push(lines[i]);
            }
            componentLines.push('');
        }

        // Add component
        for (let i = comp.startLine - 1; i < comp.endLine; i++) {
            componentLines.push(lines[i]);
        }

        // Add export
        if (!componentLines.join('\n').includes('export')) {
            // Find the component declaration and add export
            const content = componentLines.join('\n');
            const updatedContent = content.replace(
                new RegExp(`const ${comp.name}`, 'g'),
                `export const ${comp.name}`
            ).replace(
                new RegExp(`interface ${comp.name}Props`, 'g'),
                `export interface ${comp.name}Props`
            );

            // Write to file
            const filePath = path.join(__dirname, comp.file);
            fs.writeFileSync(filePath, updatedContent + '\n');
            console.log(`   ✅ Created ${comp.file}`);
        } else {
            const filePath = path.join(__dirname, comp.file);
            fs.writeFileSync(filePath, componentLines.join('\n') + '\n');
            console.log(`   ✅ Created ${comp.file}`);
        }

    } catch (error) {
        console.error(`   ❌ Error extracting ${comp.name}:`, error.message);
    }
});

console.log('\n\n✅ Component extraction complete!');
console.log('\n📊 Summary:');
console.log(`   - Extracted: ${components.length} components`);
console.log(`   - Location: components/ and components/modals/`);
console.log('\n⚠️  Next steps:');
console.log('   1. Review generated files');
console.log('   2. Update App.tsx imports (manual step)');
console.log('   3. Test application');
console.log('   4. Commit changes\n');
