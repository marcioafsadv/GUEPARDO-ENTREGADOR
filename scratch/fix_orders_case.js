
import fs from 'fs';

const filePath = 'c:/Projetos/GUEPARDO-ENTREGADOR/App.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// The goal is to find the end of the ORDERS case and add the missing </div>
// Looking for the range line 3617-3621 roughly
const lines = content.split('\n');

// Search between 3610 and 3630
for (let i = 3610; i < 3630; i++) {
    if (lines[i].includes(');') && lines[i-1].includes('</div>') && lines[i-2].includes('</div>')) {
        console.log(`Found target at line ${i+1}`);
        // We need to insert a </div> before the );
        lines.splice(i, 0, '            </div>');
        break;
    }
}

fs.writeFileSync(filePath, lines.join('\n'));
console.log('Correction applied.');
