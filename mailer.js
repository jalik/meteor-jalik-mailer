Mailer = {
    /**
     * Checks if the email has been opened
     * @param emailId
     * @return {boolean}
     */
    isEmailRead: function (emailId) {
        check(emailId, String);

        return Mailer.emails.find({
                _id: emailId,
                $or: [
                    {status: 'read'},
                    {readAt: {$ne: null}}
                ]
            }).count() > 0;
    },

    /**
     * Checks if the email has been sent
     * @param emailId
     * @return {boolean}
     */
    isEmailSent: function (emailId) {
        check(emailId, String);

        return Mailer.emails.find({
                _id: emailId,
                $or: [
                    {status: 'sent'},
                    {sentAt: {$ne: null}}
                ]
            }).count() > 0;
    }
};


/**
 * Emails as tasks for daemon mailer
 * @type {Mongo.Collection}
 */
Mailer.emails = new Mongo.Collection('jalik-mailerEmails');


if (Meteor.isServer) {
    /**
     * Returns the URL to mark the email as read
     * @param emailId
     * @return {*}
     */
    Mailer.getReadLink = function (emailId) {
        return Meteor.absoluteUrl(Mailer.config.webHook + '/read?emailId=' + emailId);
    };

    /**
     * Called when the email has been read
     * @param emailId
     * @param request
     */
    Mailer.onEmailRead = function (emailId, request) {
        console.log("Mailer: Email has been read " + emailId);
    };

    /**
     * Called when the email has been sent
     * @param emailId
     * @param email
     */
    Mailer.onEmailSent = function (emailId, email) {
        console.log("Mailer: Email has been sent " + emailId);
    };

    /**
     * Called when an error occurred while sending the email
     * @param err
     * @param emailId
     */
    Mailer.onError = function (err, emailId) {
        console.error("Mailer: Error sending email " + emailId, err);
    };

    /**
     * Queues the email in the mailer task list
     * @param email
     * @return {any}
     */
    Mailer.queue = function (email) {
        check(email, Object);

        // Set default options
        email = _.extend({
            from: Mailer.config.from,
            bcc: Mailer.config.bcc,
            cc: Mailer.config.cc,
            replyTo: Mailer.config.replyTo,
            headers: Mailer.config.headers,
            priority: 2,
            sendAt: new Date()
        }, email);

        if (typeof email.from !== 'string') {
            throw new Meteor.Error(400, "From address is invalid");
        }
        if (typeof email.text !== 'string' && typeof email.html !== 'string') {
            throw new Meteor.Error(400, "Content is invalid");
        }
        if (typeof email.to !== 'string' && typeof email.bcc !== 'string' && typeof email.cc !== 'string') {
            throw new Meteor.Error(400, "Recipient address is invalid");
        }
        if (!(email.sendAt instanceof Date)) {
            throw new Meteor.Error(400, "Sending date is not a Date");
        }

        return Mailer.emails.insert(_.extend(email, {
            status: 'pending'
        }));
    };

    /**
     * Sends an email
     * @param emailId
     */
    Mailer.send = function (emailId) {
        check(emailId, String);

        var email = Mailer.emails.findOne(emailId);

        if (!email) {
            throw new Meteor.Error(404, "Email not found");
        }
        if (!_.contains(['delayed', 'failed', 'pending'], email.status)) {
            throw new Meteor.Error(400, "Cannot send email (invalid status)");
        }

        // Add an image that will mark the email as read when loaded
        if (email.html) {
            email.html += '<img src="' + Mailer.getReadLink(emailId) + '" style="display: none;">';
        }

        try {
            // Mark email as sending
            Mailer.emails.update(emailId, {
                $set: {
                    status: 'sending',
                    sendingAt: new Date()
                }
            });

            Email.send(email);

            // Mark email as sent
            Mailer.emails.update(emailId, {
                $set: {
                    status: 'sent',
                    sentAt: new Date()
                }
            });

            // Execute callback
            Mailer.onEmailSent(emailId, email);

        } catch (err) {
            // Mark email as failed
            Mailer.emails.update(emailId, {
                $set: {
                    status: 'failed',
                    failedAt: new Date(),
                    error: err
                }
            });

            // Execute callback
            Mailer.onError(err, emailId);
        }
    };

    /**
     * Starts the cron that sends emails
     */
    Mailer.start = function () {
        Meteor.setInterval(function () {
            // Fix long sending emails
            Mailer.emails.update({
                status: 'sending',
                sendingAt: {$lte: Date.now() - Mailer.config.maxTime}
            }, {
                $set: {status: 'delayed'}

            }, {multi: true});

            // Send failed and pending emails
            Mailer.emails.find({
                status: {$in: ['delayed', 'failed', 'pending']},
                sendAt: {$lte: new Date()}
            }, {
                sort: {
                    priority: 1,
                    sendAt: 1
                }
            }).forEach(function (email) {
                if (Mailer.config.async) {
                    Meteor.setTimeout(function () {
                        Mailer.send(email._id);
                    }, 0);
                } else {
                    Mailer.send(email._id);
                }
            });
        }, Mailer.config.interval);
    };
}
