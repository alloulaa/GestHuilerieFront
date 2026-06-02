module.exports = {
    '/api': {
        target: 'http://localhost:8000',
        secure: false,
        changeOrigin: true,
        logLevel: 'warn',
        onProxyReq(proxyReq) {
            proxyReq.removeHeader('origin');
        },
    },
};