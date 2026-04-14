
import fs from 'fs';

const filePath = 'c:/Projetos/GUEPARDO-ENTREGADOR/App.tsx';
let content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

// Search for the end of HOME case around 3320
// current state:
// 3320:            )}
// 3321:            </div>
// 3322:          </div>
// 3323:        );
// 3324:      }

if (lines[3320-1].includes(')}')) {
    console.log(`Matching line 3320: ${lines[3320-1]}`);
    console.log(`Line 3321: ${lines[3321-1]}`);
    console.log(`Line 3322: ${lines[3322-1]}`);
    
    // Remote line 3322 (index 3321)
    if (lines[3322-1].trim() === '</div>') {
        lines.splice(3322-1, 1);
        console.log('Line 3322 removed successfully.');
    } else {
        console.log('Line 3322 does not match </div>, searching slightly...');
        for (let i = 3315; i < 3335; i++) {
             if (lines[i].includes(');') && lines[i-1].includes('</div>') && lines[i-2].includes('</div>')) {
                 // Found the sequence
                 console.log(`Found sequence at ${i+1}. Indices: ${i-2}, ${i-1}, ${i}`);
                 // Let's see if we have 3 divs ending there
                 // ... wait, I'll just use the pattern
             }
        }
    }
}

fs.writeFileSync(filePath, lines.join('\n'));
