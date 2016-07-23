Package.describe({
    name: 'jalik:mailer',
    version: '0.3.2',
    author: 'karl.stein.pro@gmail.com',
    summary: 'Mailing service with tracking',
    homepage: 'https://github.com/jalik/jalik-mailer',
    git: 'https://github.com/jalik/jalik-mailer.git',
    documentation: 'README.md'
});

Package.onUse(function (api) {
    api.versionsFrom('1.3.4.4');
    api.use('check@1.0.6');
    api.use('ecmascript@0.1.5');
    api.use('email@1.0.7', 'server');
    api.use('jalik:callback-helper@0.1.1');
    api.use('matb33:collection-hooks@0.7.13');
    api.use('mongo@1.1.2');
    api.use('underscore@1.0.3');
    api.use('webapp@1.2.2', 'server');

    api.addFiles('mailer.js');
    api.addFiles('mailer-config.js', 'server');
    api.addFiles('mailer-server.js', 'server');
    api.addFiles('mailer-viewer.js', 'server');

    api.mainModule('mailer.js');
});
