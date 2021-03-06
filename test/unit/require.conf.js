var tests = [];
for (var file in window.__karma__.files) {
    if (window.__karma__.files.hasOwnProperty(file)) {
        if (/test\/unit\/tests\/component\/.*\.js$/.test(file) || /test\/unit\/tests\/service\/.*\.js$/.test(file)) {
            tests.push(file);
        }
    }
}

requirejs.config({
    baseUrl: '/base/src/client/component',
    paths: {
        'ng': '../lib/angular-1.3.15',
        'text': '../lib/require-text-2.0.14',
        'service': '../service',
        'ngMock': '../../../test/unit/lib/angular-mocks-1.3.14'
    },
    deps: tests,
    callback: window.__karma__.start
});