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
            Mailer.onEmailRead(emailId, req);
        }
        res.end();

    } else {
        next();
    }
});
