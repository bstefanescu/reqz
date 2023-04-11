
export function debug(env) {
    console.log('!!module is', this.file);
    console.log('!!env is', env.vars, env.headers, env.functions);
}
