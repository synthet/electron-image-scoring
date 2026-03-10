/**
 * Patches node-firebird to fix a crash when the callback queue is empty
 * but socket data still arrives (TypeError: Cannot set properties of undefined 'lazy_count').
 *
 * This is a known issue in node-firebird@1.1.9.
 * Applied automatically via postinstall. Safe to re-run.
 */
const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '..', 'node_modules', 'node-firebird', 'lib', 'wire', 'connection.js');

if (!fs.existsSync(target)) {
    console.log('[patch] node-firebird not installed, skipping patch.');
    process.exit(0);
}

let src = fs.readFileSync(target, 'utf8');
let changed = false;

// --- Patch 1: Guard against empty _queue in the data handler loop ---
const oldLoop = 'while (xdr.pos < xdr.buffer.length) {\n            var cb = self._queue[0], pos = xdr.pos;';

const newLoop = 'while (xdr.pos < xdr.buffer.length) {\n            if (self._queue.length === 0) {\n                // No pending callbacks \u2014 discard remaining data to avoid crash\n                break;\n            }\n            var cb = self._queue[0], pos = xdr.pos;';

if (src.includes('if (self._queue.length === 0) {')) {
    console.log('[patch] node-firebird already patched (queue guard). Skipping.');
} else if (src.includes(oldLoop)) {
    src = src.replace(oldLoop, newLoop);
    changed = true;
    console.log('[patch] Applied queue-empty guard.');
} else {
    console.warn('[patch] Could not find expected code pattern for queue guard. Manual review needed.');
}

// --- Patch 2: Guard against self.accept being undefined ---
const oldAccess = 'if (self.accept.protocolMinimumType === Const.ptype_lazy_send';
const newAccess = 'if (self.accept && self.accept.protocolMinimumType === Const.ptype_lazy_send';

if (src.includes(newAccess)) {
    console.log('[patch] node-firebird already patched (accept guard). Skipping.');
} else if (src.includes(oldAccess)) {
    src = src.replace(oldAccess, newAccess);
    changed = true;
    console.log('[patch] Applied self.accept guard.');
} else {
    console.warn('[patch] Could not find expected code pattern for accept guard. Manual review needed.');
}

if (changed) {
    fs.writeFileSync(target, src, 'utf8');
    console.log('[patch] node-firebird patched successfully.');
} else {
    console.log('[patch] No changes needed.');
}
