/**
 * hack: changes default .js migrations extension to .ts
 */

import * as path from 'path';
import * as fs from 'fs';

const filePath = path.resolve('./node_modules/sequelize-cli/lib/core/migrator.js');
const content = fs.readFileSync(filePath, 'utf8');

fs.writeFileSync(filePath, content.replace(/\/\\\.js\$\//, '/\\.ts$/'));
