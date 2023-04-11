
const builtinFilters = {
    json(value: any) {
        return JSON.stringify(value);
    },
    lowercase(value: string) {
        return value != null ? String(value).toLowerCase() : '';
    },
    uppercase(value: string) {
        return value != null ? String(value).toUpperCase() : '';
    },
    trim(value: string) {
        return value != null ? String(value).trim() : '';
    },
    base64(value: string) {
        return value != null ? Buffer.from(String(value), 'utf8').toString('base64') : '';
    }
}

export default builtinFilters;