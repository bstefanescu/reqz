export function debug(env) {
    console.log("debug: " + this, env);
}

export function hello(env, arg) {
    console.log('hello', arg);
}
hello.__REQZ_DIRECTIVE = {
    args: 'object',
    optional: false,
    name: "@hello"
}

