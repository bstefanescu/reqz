

function LogConfig(cfg, all) {
    this.all = !!all;
    if (!cfg) {
        this.req = true;
        this.resb = true; // the defaults
    } else {
        if (typeof cfg === 'string') {
            cfg = cfg.split(',');
        }
        cfg.forEach(val => this[val] = true);
    }
}

module.exports = LogConfig;
