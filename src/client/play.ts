import fs from 'fs';
import { parse } from 'csv-parse';
import RequestModule from '../RequestModule.js';

export default async function play(module: RequestModule, csvFile: string, vars: Record<string, any>, delimiter = ';') {
    const parser = fs.createReadStream(csvFile).pipe(parse({
        bom: true,
        delimiter: delimiter || ',',
        comment: '#',
        columns: true,
        trim: true,
        skip_empty_lines: true
    }));
    for await (const record of parser) {
        await module.exec({ ...vars, $play: record });
    }
}
