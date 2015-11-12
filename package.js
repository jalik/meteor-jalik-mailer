Package.describe({
    name: 'jalik:mailer',
    version: '0.1.0',
    author: 'karl.stein.pro@gmail.com',
    summary: 'Mailing service with tracking',
    homepage: 'https://github.com/jalik/jalik-mailer',
    git: 'https://github.com/jalik/jalik-mailer.git',
    documentation: 'README.md'
});

Package.onUse(function (api) {
    api.versionsFrom('1.2.1');
    api.use('check');
    api.use('ecmascript');
    api.use('email', 'server');
    api.use('mongo');
    api.use('underscore');

    api.addFiles('mailer.js', 'server');
    api.addFiles('mailer-config.js', 'server');

    api.export('Mailer');
});

Package.onTest(function (api) {
});
