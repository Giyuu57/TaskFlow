async function getJsonBody(req) {
    // Case 1: platform already parsed it into a populated object
    if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
        return req.body;
    }

    // Case 2: platform gave us a raw JSON string
    if (typeof req.body === 'string' && req.body.length > 0) {
        try { return JSON.parse(req.body); } catch { /* fall through */ }
    }

    // Case 3: Web-standard Request object (has .json())
    if (typeof req.json === 'function') {
        try {
            const data = await req.json();
            if (data) return data;
        } catch { /* fall through */ }
    }

    // Case 4: classic Node.js readable stream
    if (typeof req.on === 'function') {
        return new Promise((resolve) => {
            let data = '';
            req.on('data', chunk => { data += chunk; });
            req.on('end', () => {
                try { resolve(JSON.parse(data || '{}')); } catch { resolve({}); }
            });
            req.on('error', () => resolve({}));
        });
    }

    return {};
}

module.exports = { getJsonBody };