import superagent from 'superagent';

export interface IRequest {
    method: string;
    url: string;
    headers: Record<string, string>;
    body?: string;
}

export interface IResponse {
    error: false | superagent.HTTPError;
    clientError: boolean;
    serverError: boolean;
    ok: boolean;
    status: number;
    type: string;
    isJSON: boolean;
    headers: Record<string, string>;
    text: string | undefined;
    body: any;
}

export class ResponseWrapper implements IResponse {
    isJSON: boolean;
    constructor(public res: superagent.Response) {
        this.isJSON = res.type === 'application/json';
    }
    get clientError() {
        return this.res.clientError;
    }
    get serverError() {
        return this.res.serverError;
    }
    get error() {
        return this.res.error;
    }
    get ok() {
        return this.res.ok;
    }
    get status() {
        return this.res.status;
    }
    get headers() {
        return this.res.headers;
    }
    get type() {
        return this.res.type;
    }
    get charset() {
        return this.res.charset;
    }
    get text() {
        return this.res.text;
    }
    get body() {
        return this.res.body;
    }
}

export async function request(request: IRequest): Promise<IResponse> {
    const req = superagent(request.method, request.url);
    const headers = request.headers;
    for (const key in headers) {
        req.set(key, headers[key]);
    }
    if (request.body) {
        req.send(request.body);
    }
    const response = await req;
    return new ResponseWrapper(response);
}

