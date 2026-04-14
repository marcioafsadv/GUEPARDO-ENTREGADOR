import fs from 'fs';

const filePath = 'c:/Projetos/GUEPARDO-ENTREGADOR/App.tsx';
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

let bLevel = 0;
let pLevel = 0;
let inRenderScreen = false;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('const renderScreen = () => {')) {
        inRenderScreen = true;
        bLevel = 1;
        continue;
    }
    
    if (inRenderScreen) {
        // Simple regex to count but ignore string contents (approximate)
        const pureLine = line.replace(/`[\s\S]*?`/g, '').replace(/'[\s\S]*?'/g, '').replace(/"[\s\S]*?"/g, '');
        
        const openersB = (pureLine.match(/\{/g) || []).length;
        const closersB = (pureLine.match(/\}/g) || []).length;
        bLevel += openersB - closersB;

        const openersP = (pureLine.match(/\(/g) || []).length;
        const closersP = (pureLine.match(/\)/g) || []).length;
        pLevel += openersP - closersP;
        
        if (bLevel < 1 || pLevel < 0) {
            console.log(`ERROR at line ${i + 1}: bLevel=${bLevel}, pLevel=${pLevel}`);
            console.log(`Line content: ${line}`);
            break;
        }

        if (bLevel === 1 && i > 4000) {
            console.log(`renderScreen potentially ended correctly at line ${i + 1}`);
            // break;
        }
    }
}
console.log('Final Auditor Level:', { bLevel, pLevel });
