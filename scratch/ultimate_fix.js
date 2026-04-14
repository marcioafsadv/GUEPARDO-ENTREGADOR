
import fs from 'fs';

const filePath = 'c:/Projetos/GUEPARDO-ENTREGADOR/App.tsx';
let content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

// 1. Fix the Payment Prompt (unclosed divs at 3193-3194)
// Currently it looks like:
// 3211:                                   </div>
// 3212:                                 )}
// We need it to be </div></div></div> )}

for (let i = 3190; i < 3220; i++) {
    if (lines[i].includes(')}') && lines[i-1].includes('</div>') && i < 3220) {
        if (lines[i-2].includes('</div>') && !lines[i-3].includes('</div>')) {
             console.log(`Found payment prompt end at line ${i+1}`);
             // Add missing closures
             lines[i-1] = '                                  </div>';
             lines.splice(i, 0, '                                </div>', '                              </div>');
             break;
        }
    }
}

// 2. Fix the ARRIVED_AT_CUSTOMER block (missing </> at 3216 area)
// Currently it might be shifted.

// Update the whole file and then we'll run a new check.
fs.writeFileSync(filePath, lines.join('\n'));
console.log('Payment prompt fix applied.');
