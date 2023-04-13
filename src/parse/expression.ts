
export const TOK_NULL = 0;
export const TOK_BOOLEAN = 1;
export const TOK_NUMBER = 2;
export const TOK_STRING = 3;
export const TOK_VAR = 4;
export const TOK_EXPR = 5;

export interface IToken<V> {
    value: V, //IVarExprTokens | string[] | string | number | boolean | null,
    remaining: string;
    type: number;
}

export interface IVarExprTokens {
    varRef: string[],
    defaultValue?: string | number | boolean | null,
    filters?: string[]
}

const WHITESPACE_RX = /^\s+/;
export function skipSpaces(text: string) {
    const m = WHITESPACE_RX.exec(text);
    if (m) {
        return text.substring(m[0].length);
    } else {
        return text;
    }
}

// find the next var ref from the start o fthe string. May also include an ending . for invalid vars. Ex: a.b.c. will match too.
const VAR_REF_RX = /^\s*((?:(?:[_$a-zA-Z]+[_$a-zA-Z0-9]*)\.?)+)\s*/
export function readVarRef(text: string): IToken<string[]> | null {
    const m = VAR_REF_RX.exec(text);
    if (m) {
        const token = m[1];
        if (token[token.length - 1] === '.') { // wnds with a dot.
            return null; // not a valid var ref
        }
        return {
            value: token.split('.'),
            remaining: text.substring(m[0].length),
            type: TOK_VAR
        }
    } else {
        return null; // not a valid var ref
    }
}

const SYMBOL_RX = /^\s*(true\b)|(false\b)|(null\b)\s*/
export function readSymbol(text: string): IToken<boolean | null> | null {
    const m = SYMBOL_RX.exec(text);
    if (m) {
        let type: number;
        let value: boolean | null;
        if (m[1]) {
            type = TOK_BOOLEAN;
            value = true;
        } else if (m[2]) {
            type = TOK_BOOLEAN;
            value = false;
        } else {
            type = TOK_NULL;
            value = null;
        }
        return {
            value,
            remaining: text.substring(m[0].length),
            type
        }
    } else {
        return null;
    }
}

const QUOTED_STRING_RX = /^\s*'([^'\\]*(\\.[^'\\]*)*)'\s*/
export function readSingleQuotedString(text: string): IToken<string> | null {
    const m = QUOTED_STRING_RX.exec(text);
    if (m) {
        return {
            value: JSON.parse('"' + m[1] + '"'),
            remaining: text.substring(m[0].length),
            type: TOK_STRING
        }
    } else {
        return null;
    }
}

const DQUOTED_STRING_RX = /^\s*"([^"\\]*(\\.[^"\\]*)*)"\s*/
export function readDoubleQuotedString(text: string): IToken<string> | null {
    const m = DQUOTED_STRING_RX.exec(text);
    if (m) {
        return {
            value: JSON.parse('"' + m[1] + '"'),
            remaining: text.substring(m[0].length),
            type: TOK_STRING
        };
    } else {
        return null;
    }
}

const NUMBER_RX = /^\s*([+-]?\d+(?:\.\d+)?)\s*/
export function readNumber(text: string): IToken<number> | null {
    const m = NUMBER_RX.exec(text);
    if (m) {
        return {
            value: parseFloat(m[1]),
            remaining: text.substring(m[0].length),
            type: TOK_NUMBER
        };
    } else {
        return null;
    }
}

// find the next literal from the start of the string.
export function readLiteral(text: string, leftTrimmed = false): IToken<string | number | boolean | null> | null {
    if (!leftTrimmed) {
        text = skipSpaces(text);
    }
    const first = text[0];
    if (first === '"') {
        return readDoubleQuotedString(text);
    } else if (first === "'") {
        return readSingleQuotedString(text);
    } else if (first >= '0' && first <= '9') {
        return readNumber(text);
    } else {
        return readSymbol(text);
    }
}

export function readVarExpr(text: string): IToken<IVarExprTokens> | null {
    const varToken = readVarRef(text);
    if (!varToken) {
        return null;
    }
    const result: IVarExprTokens = { varRef: varToken.value }
    text = varToken.remaining;
    if (!text) return { value: result, remaining: text, type: TOK_EXPR };

    if (text[0] === '?') { // a default value
        text = text.substring(1);
        const valueToken = readLiteral(text);
        if (!valueToken) {
            throw new Error('Expecting a literal: ' + text);
        }
        result.defaultValue = valueToken.value;
        text = valueToken.remaining;
        if (!text) return { value: result, remaining: text, type: TOK_EXPR };
    }

    if (text[0] === '|') { // a filter
        text = text.substring(1).trim();
        result.filters = text.split(/\s*\|\s*/);
    }
    //TODO filter must be matched using a regex and remaining should be set
    return { value: result, remaining: '', type: TOK_EXPR };
}

