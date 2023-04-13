
const builtins = {
    base64(value: string) {
        return value != null ? Buffer.from(String(value), 'utf8').toString('base64') : '';
    }
}

export default builtins;