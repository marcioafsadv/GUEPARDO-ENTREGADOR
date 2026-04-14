import fs from 'fs';

const filePath = 'c:/Projetos/GUEPARDO-ENTREGADOR/App.tsx';
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

let level = 0;
let inRenderScreen = false;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('const renderScreen = () => {')) {
        inRenderScreen = true;
    }
    
    if (inRenderScreen) {
        const openers = (line.match(/\{/g) || []).length;
        const closers = (line.match(/\}/g) || []).length;
        level += openers - closers;
        
        if (level < 0) {
            console.log(`SURPLUS CLOSER at line ${i + 1}: Level dropped to ${level}`);
            console.log(`Line content: ${line}`);
            // Reset level to continue checking
            level = 0;
        }

        if (line.includes('};') && level === 0 && i > 4000) {
            console.log(`renderScreen potentially ended at line ${i + 1}`);
            // inRenderScreen = false; // Keep checking to see if there are more
        }
    }
}
console.log('Final level:', level);
