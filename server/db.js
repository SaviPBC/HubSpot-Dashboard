const { Database } = require('node-sqlite3-wasm');
const path = require('path');
const fs = require('fs');
const config = require('./config');

const dbPath = path.resolve(__dirname, config.dbPath);
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const _db = new Database(dbPath);

function normalizeParams(args) {
  if (args.length === 0) return undefined;
  if (args.length === 1 && Array.isArray(args[0])) return args[0];
  if (args.length === 1 && args[0] !== null && typeof args[0] === 'object') return args[0];
  return args;
}

class Statement {
  constructor(sql) {
    this._sql = sql;
  }
  run(...args) {
    return _db.run(this._sql, normalizeParams(args));
  }
  get(...args) {
    return _db.get(this._sql, normalizeParams(args));
  }
  all(...args) {
    return _db.all(this._sql, normalizeParams(args));
  }
}

const db = {
  prepare(sql) {
    return new Statement(sql);
  },
  exec(sql) {
    return _db.exec(sql);
  },
  transaction(fn) {
    return (...args) => {
      _db.run('BEGIN');
      try {
        const result = fn(...args);
        _db.run('COMMIT');
        return result;
      } catch (e) {
        _db.run('ROLLBACK');
        throw e;
      }
    };
  },
};

const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
db.exec(schema);

// Migrations for existing databases
try { _db.run('ALTER TABLE deals ADD COLUMN contract_start_date TEXT'); } catch (e) {}
try { _db.run('ALTER TABLE deals ADD COLUMN contract_end_date TEXT'); } catch (e) {}
try { _db.run('ALTER TABLE deals ADD COLUMN contract_renewal_date TEXT'); } catch (e) {}
try { _db.run('ALTER TABLE deals ADD COLUMN network_value TEXT'); } catch (e) {}
try { _db.run('ALTER TABLE deals ADD COLUMN pricing_model TEXT'); } catch (e) {}
try { _db.run('ALTER TABLE deals ADD COLUMN deal_source TEXT'); } catch (e) {}
try { _db.run('CREATE TABLE IF NOT EXISTS pipeline_stages (id TEXT PRIMARY KEY, label TEXT NOT NULL, pipeline_id TEXT)'); } catch (e) {}
try { _db.run('ALTER TABLE deals ADD COLUMN contact_email TEXT'); } catch (e) {}

module.exports = db;
