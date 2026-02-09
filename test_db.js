const Firebird = require('node-firebird');
const path = require('path');
const fs = require('fs');

// Load configuration
function loadConfig() {
    const configPath = path.resolve(path.join(__dirname, 'config.json'));
    try {
        if (fs.existsSync(configPath)) {
            return JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }
    } catch (e) {
        console.error('Failed to load config.json:', e);
    }
    return {};
}

const config = loadConfig();
const dbConfig = config.database || {};

// Database options
const rawDbPath = dbConfig.path || '../image-scoring/SCORING_HISTORY.FDB';
const dbPath = path.isAbsolute(rawDbPath)
    ? rawDbPath
    : path.resolve(path.join(__dirname, rawDbPath));

console.log('Resolved DB Path:', dbPath);

const options = {
    host: dbConfig.host || '127.0.0.1',
    port: dbConfig.port || 3050,
    database: dbPath,
    user: dbConfig.user || 'sysdba',
    password: dbConfig.password || 'masterkey',
    lowercase_keys: true,
    role: ''
};

console.log('Attempting connection...');

Firebird.attach(options, (err, db) => {
    if (err) {
        console.error('Connection Failed!');
        console.error('Error:', err);
        if (err.gdscode) console.error('GDS Code:', err.gdscode);
        return;
    }
    console.log('Connected successfully!');
    db.query('SELECT COUNT(*) FROM IMAGES', (err, result) => {
        if (err) console.error('Query Error:', err);
        else console.log('Result:', result);
        db.detach();
    });
});
