import fs from 'fs';

const filePath = 'c:/Projetos/GUEPARDO-ENTREGADOR/App.tsx';
let content = fs.readFileSync(filePath, 'utf8');
let lines = content.split('\n');

// The botched area starts after line 3505 (0-indexed 3504)
// and ends before line 3510 (0-indexed 3509) in the latest view.

const REPAIR_LINES = [
    "                      ))",
    "                    )}",
    "                  </>",
    "                )}",
    "              </div>",
    "            </div>",
    "          </div>",
    "        );",
    "      }",
    "      case 'WITHDRAWAL_REQUEST': {",
    "        return (",
    "        <div className={`h-full w-full p-6 overflow-y-auto pb-40 transition-colors duration-300 bg-[#0f0502]`}>",
    "          <div className=\"flex items-center space-x-4 mb-8\">",
    "            <button onClick={() => setCurrentScreen('WALLET')} className={`w-11 h-11 rounded-2xl flex items-center justify-center border chocolate-inner-card-v2`}>",
    "              <i className=\"fas fa-chevron-left text-white\"></i>",
    "            </button>"
];

// Finding the target: line 3505 starts with "                      ))"
// and reaches line 3506 which is currently "            </button>"
const targetIndex = lines.findIndex(l => l.includes("                      ))") && lines[lines.indexOf(l)+1].includes("            </button>"));

if (targetIndex !== -1) {
    // Replace from targetIndex to targetIndex + 1 (the botched line)
    lines.splice(targetIndex, 2, ...REPAIR_LINES);
    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    console.log('Successfully repaired WALLET and WITHDRAWAL_REQUEST transition.');
} else {
    console.error('Could not find target index for repair.');
}
