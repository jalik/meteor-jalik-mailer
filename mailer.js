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
 * Collection of email tasks
 * @type {Mongo.Collection}
 */
Mailer.emails = new Mongo.Collection('jalik-mailerEmails');


if (Meteor.isServer) {

    events = {
        onEmailFailed: new CallbackHelper(),
        onEmailQueued: new CallbackHelper(),
        onEmailRead: new CallbackHelper(),
        onEmailSent: new CallbackHelper(),
        onError: new CallbackHelper()
    };

    Mailer.emails.after.insert(function (userId, doc) {
        events.onEmailQueued.call(Mailer, doc._id, doc);
    });

    Mailer.emails.after.update(function (userId, doc, fields, mod) {
        if (mod && mod.$set) {
            var $set = mod.$set;

            switch ($set.status) {
                case 'failed':
                    events.onEmailFailed.call(Mailer, doc._id, doc);
                    break;

                case 'pending':
                    events.onEmailQueued.call(Mailer, doc._id, doc);
                    break;

                case 'sent':
                    events.onEmailSent.call(Mailer, doc._id, doc);
                    break;
            }
        }
    });

    /**
     * Returns the URL to mark the email as read
     * @param emailId
     * @param redirect
     * @return {*}
     */
    Mailer.getReadLink = function (emailId, redirect) {
        var url = Meteor.absoluteUrl(Mailer.config.webHook + '/read?emailId=' + emailId);
        redirect && (url += '&redirect=' + encodeURIComponent(redirect));
        return url;
    };

    /**
     * Called when an email failed sending
     * @param callback
     */
    Mailer.onEmailFailed = function (callback) {
        events.onEmailFailed.add(callback);
    };

    /**
     * Called when an email has been queued
     * @param callback
     */
    Mailer.onEmailQueued = function (callback) {
        events.onEmailQueued.add(callback);
    };

    /**
     * Called when an email has been read
     * @param callback
     */
    Mailer.onEmailRead = function (callback) {
        events.onEmailRead.add(callback);
    };

    /**
     * Called when an email has been sent
     * @param callback
     */
    Mailer.onEmailSent = function (callback) {
        events.onEmailSent.add(callback);
    };

    /**
     * Called when an error occurred while sending the email
     * @param callback
     */
    Mailer.onError = function (callback) {
        events.onError.add(callback);
    };

    /**
     * Queues the email in the mailer task list
     * @param email
     * @return {*}
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
            priority: 2
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
        if (typeof email.priority !== "number") {
            throw new Meteor.Error(400, "Priority is not a number");
        }

        email.queuedAt = new Date();

        return Mailer.emails.insert(_.extend(email, {status: 'pending'}));
    };

    /**
     * Sends an email now
     * @param email
     * @return {*}
     */
    Mailer.send = function (email) {
        var emailId = this.queue(email);
        return emailId && this.sendEmail(emailId);
    };

    /**
     * Sends an existing email
     * @param emailId
     */
    Mailer.sendEmail = function (emailId) {
        check(emailId, String);

        var email = Mailer.emails.findOne(emailId);

        if (!email) {
            throw new Meteor.Error(404, "Email not found");
        }
        if (!_.contains(['delayed', 'failed', 'pending'], email.status)) {
            throw new Meteor.Error(400, "Cannot send email (" + email.status + ")");
        }

        function replaceLinks(content) {
            return content.replace(/https?:\/\/[^ "']+/gi, function (url) {
                return Mailer.getReadLink(emailId, url);
            });
        }

        // Add an image that will mark the email as read when loaded
        if (email.html) {
            email.html += '<img src="' + Mailer.getReadLink(emailId) + '" width="1px" height="1px" style="display: none;">';
            email.html = replaceLinks(email.html);
        }
        else if (email.text) {
            email.text = replaceLinks(email.text);
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
            events.onError.call(Mailer, err, emailId);
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
                queuedAt: {$lte: new Date()}
            }, {
                sort: {
                    priority: 1,
                    queuedAt: 1
                }
            }).forEach(function (email) {
                if (Mailer.config.async) {
                    Meteor.setTimeout(function () {
                        Mailer.sendEmail(email._id);
                    }, 0);
                } else {
                    Mailer.sendEmail(email._id);
                }
            });
        }, Mailer.config.interval);
    };
}
