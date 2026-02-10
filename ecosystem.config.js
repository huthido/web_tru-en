module.exports = {
    apps: [
        {
            name: 'truyen-backend',
            cwd: './apps/backend',
            script: 'dist/main.js',
            env: {
                NODE_ENV: 'production',
                PORT: 3001,
            },
        },
        {
            name: 'truyen-frontend',
            cwd: './apps/frontend',
            script: 'node_modules/next/dist/bin/next',
            args: 'start -p 3000',
            env: {
                NODE_ENV: 'production',
            },
        },
    ],
};
