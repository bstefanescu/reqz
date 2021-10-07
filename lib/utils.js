const path = require('path');
const fs = require('fs');

function resolveFile(file, from) {
    if (from && (file.startsWith('./') || file.startsWith('../'))) {
        return path.resolve(path.dirname(from), file);
    }
    return path.resolve(file); // from cwd
}

function fileExists(file) {
    try {
        fs.accessSync(file);
        return true;
    } catch(e) {
        return false;
    }
}

function parseValue(value) {
    if (value === 'true') {
        return true;
    }
    if (value === 'false') {
        return false;
    }
    if (/^-?\d*(\.\d+)?$/.test(value)) {
        return value.indexOf('.') < 0 ? parseInt(value) : parseFloat(value);
    }
    if (value.startsWith('"') && value.endsWith('"') || value.startsWith('\'') && value.endsWith('\'')) {
        return unescape(value.substring(1, value.length-1));
    }
    return value;
}

module.exports = {
    resolveFile,
    fileExists,
    parseValue
}