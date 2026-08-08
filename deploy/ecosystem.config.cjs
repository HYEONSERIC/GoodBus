/**
 * pm2 process config — run from repo root:
 *   pm2 start deploy/ecosystem.config.cjs
 */
const path = require('path');

const root = path.resolve(__dirname, '..');

module.exports = {
    apps: [
        {
            name: 'goodbus-api',
            cwd: path.join(root, 'server'),
            script: 'dist/index.js',
            instances: 1,
            autorestart: true,
            max_memory_restart: '500M',
            env: {
                NODE_ENV: 'production',
            },
        },
        {
            name: 'goodbus-web',
            cwd: root,
            script: 'node_modules/next/dist/bin/next',
            args: 'start -p 3000',
            instances: 1,
            autorestart: true,
            max_memory_restart: '800M',
            env: {
                NODE_ENV: 'production',
            },
        },
    ],
};
