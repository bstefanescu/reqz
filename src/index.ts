import RequestModule from "./RequestModule.js";

const env = {}

new RequestModule().loadFile('file').then(module => {
    return module.exec(env);
})


