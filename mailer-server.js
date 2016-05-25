WebApp.connectHandlers.use(function (req, res, next) {
    var emailId = req.query && req.query.emailId;
    var endPoint = Mailer.getReadLink(emailId).replace(Meteor.absoluteUrl(), '');

    if (emailId && req.url.indexOf(endPoint) !== -1) {
        // Mark the email as read
        var result = Mailer.emails.update({
            _id: emailId,
            status: 'sent'
        }, {
            $set: {
                status: 'read',
                readAt: new Date()
            }
        });

        if (result) {
            // Execute callback
            events.onEmailRead.call(Mailer, emailId, req);
        }

        var redirect = req.query && req.query.redirect;

        if (redirect) {
            res.writeHead(301, {Location: decodeURIComponent(redirect)});
            res.end();

        } else {
            // Return a 1x1 png image
            var base64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABAQMAAAAl21bKAAAAA1BMVEUAAACnej3aAAAAAXRSTlMAQObYZgAAAApJREFUCNdjYAAAAAIAAeIhvDMAAAAASUVORK5CYII=';
            res.setHeader('Content-Type', 'image/png');
            res.end(new Buffer(base64, 'base64').toString());
        }

    } else {
        next();
    }
});
