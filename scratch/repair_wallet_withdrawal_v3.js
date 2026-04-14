import fs from 'fs';

const filePath = 'c:/Projetos/GUEPARDO-ENTREGADOR/App.tsx';
let content = fs.readFileSync(filePath, 'utf8');
let lines = content.split(/\r?\n/);

// From latest view_file:
// 3505:                       ))
// 3506:             </button>

const REPAIR_LINES = [
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

// Verify the line before replacing
if (lines[3505].includes('</button>')) {
    console.log('Target line confirmed:', lines[3505]);
    lines.splice(3505, 1, ...REPAIR_LINES);
    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    console.log('Successfully repaired via line index.');
} else {
    console.error('Line 3506 (index 3505) is NOT </button>. It is:', lines[3505]);
    // Search nearby
    for (let i = 3500; i < 3510; i++) {
        if (lines[i].includes('</button>') && lines[i-1].includes('))')) {
            console.log('Found target at index', i);
            lines.splice(i, 1, ...REPAIR_LINES);
            fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
            process.exit(0);
        }
    }
}
