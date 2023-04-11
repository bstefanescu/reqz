import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { readFileSync } from 'fs';

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const pkg = JSON.parse(readFileSync(packageRoot + '/package.json', 'utf8'));

export default pkg;

