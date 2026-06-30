async function getJsonBody(req) {
    if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
        return req.body;
    }
    if (typeof req.body === 'string' && req.body.length > 0) {
        try { return JSON.parse(req.body); } catch { return {}; }
    }
    return new Promise((resolve) => {
        let data = '';
        req.on('data', chunk => { data += chunk; });
        req.on('end', () => {
            try { resolve(JSON.parse(data || '{}')); } catch { resolve({}); }
        });
        req.on('error', () => resolve({}));
    });
}

module.exports = { getJsonBody };