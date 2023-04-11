import RequestModule from "./RequestModule.js";
import { BlockLineParser, LineParser, ILineParser } from "./parse/LineParser.js";

export interface IDirective {
    onMatch(module: RequestModule, parser: ILineParser, name: string, arg: string): Promise<ILineParser>;
}

export abstract class BlockDirective implements IDirective {
    abstract build(module: RequestModule, arg: string, lines: string[]): void;
    async onMatch(module: RequestModule, parser: LineParser, name: string, arg: string): Promise<ILineParser> {
        return new BlockLineParser(parser, this, name, arg);
    }
}

export abstract class LineDirective implements IDirective {
    abstract build(module: RequestModule, arg: string): void;
    async onMatch(module: RequestModule, parser: ILineParser, name: string, arg: string): Promise<ILineParser> {
        await this.build(module, arg);
        return parser;
    }
}

