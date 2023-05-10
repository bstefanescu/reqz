import { readFile } from "fs/promises";
import RequestModule from "../RequestModule.js";
import { IDirective } from "../Directive.js";
import { ILineParser, LineParser } from "./LineParser.js";
import builtinDirectives from "../directives/index.js"

export default class Parser {
    constructor(public directives: Record<string, IDirective>) {
    }

    async parseFile(module: RequestModule, file: string) {
        const content = await readFile(file, "utf8");
        await this.parseText(module, content);
    }

    async parseText(module: RequestModule, content: string) {
        const lines = content.trim().split("\n");
        let lineParser: ILineParser = new LineParser(this.directives);
        for (let i = 0, l = lines.length; i < l; i++) {
            lineParser = await lineParser.parseLine(module, lines[i]);
        }
        lineParser.close(module);
    }

}
