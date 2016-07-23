import {_} from 'meteor/underscore';
import {check} from 'meteor/check';
import {CallbackHelper} from 'meteor/jalik:callback-helper';
import {Email} from 'meteor/email';
import {Meteor} from 'meteor/meteor';

import {Mailer} from './mailer';

let sending = false;

export var events = {
    onEmailFailed: new CallbackHelper(),
    onEmailQueued: new CallbackHelper(),
    onEmailRead: new CallbackHelper(),
    onEmailSent: new CallbackHelper(),
    onError: new CallbackHelper(),
    onSend: new CallbackHelper()
};

// Set collection indexes
Mailer.emails._ensureIndex({
    status: 1,
    queuedAt: 1,
    sendingAt: 1,
    sendAt: 1,
    sentAt: 1
});

Mailer.emails.after.insert(function (userId, doc) {
    if (doc.status === 'pending') {
        events.onEmailQueued.call(Mailer, doc._id, doc);
    }
});

Mailer.emails.after.update(function (userId, doc, fields, mod) {
    if (mod && mod.$set) {
        let $set = mod.$set;

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
 * Checks if the mailer is sending emails
 * @return {boolean}
 */
Mailer.isSending = function () {
    return sending;
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
 * Called before sending an email
 * @param callback
 */
Mailer.onSend = function (callback) {
    events.onSend.add(callback);
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
    if (typeof email.priority !== 'number') {
        throw new Meteor.Error(400, "Priority is not a number");
    }

    email.queuedAt = new Date();
    email.status = 'pending';

    return Mailer.emails.insert(email);
};

/**
 * Sends an email now
 * @param email
 * @return {*}
 */
Mailer.send = function (email) {
    let emailId = this.queue(email);
    return emailId && this.sendEmail(emailId);
};

/**
 * Sends an existing email
 * @param emailId
 */
Mailer.sendEmail = function (emailId) {
    check(emailId, String);

    let email = Mailer.emails.findOne(emailId);

    if (!email) {
        throw new Meteor.Error(404, "Email not found");
    }
    if (!_.contains(['delayed', 'failed', 'pending'], email.status)) {
        throw new Meteor.Error(400, "Cannot send email (" + email.status + ")");
    }

    // Mark the mailer as sending emails
    sending = true;

    try {

        function replaceLinks(content) {
            return content.replace(/https?:\/\/[^ "']+/gi, function (url) {
                return Mailer.getReadLink(emailId, url);
            });
        }

        // Allow some processing before sending
        events.onSend.call(Mailer, email);

        // Add an image that will mark the email as read when loaded
        if (email.html) {
            email.html += '<img src="' + Mailer.getReadLink(emailId) + '" width="1px" height="1px" style="display: none;">';
            email.html = replaceLinks(email.html);
        }
        else if (email.text) {
            email.text = replaceLinks(email.text);
        }

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
            $inc: {errors: 1},
            $set: {
                status: 'failed',
                failedAt: new Date(),
                error: err
            }
        });

        // Execute callback
        events.onError.call(Mailer, err, emailId);
    }

    // Finish sending emails
    sending = false;
};

/**
 * Starts the cron that sends emails
 */
Mailer.start = function () {
    Meteor.setInterval(function () {
        // Fix long sending emails
        Mailer.emails.update({
                status: 'sending',
                sendingAt: {$lte: new Date(Date.now() - Mailer.config.maxSendingTime)}
            },
            {$set: {status: 'delayed'}},
            {multi: true});
    }, Mailer.config.maxSendingTime);

    Meteor.setInterval(function () {
        // Do not start task if the mailer is sending emails
        if (!sending) {
            let now = new Date();
            let count = 0;

            // Send failed and pending emails
            Mailer.emails.find({
                status: {$in: ['delayed', 'failed', 'pending']},
                queuedAt: {$lte: now},
                $or: [
                    {sendAt: {$exists: false}},
                    {sendAt: {$lte: now}}
                ]
            }, {
                fields: {_id: 1, errors: 1},
                sort: {
                    priority: 1,
                    sendAt: 1,
                    queuedAt: 1
                },
                limit: Mailer.config.maxEmailsPerTask
            }).forEach(function (email) {
                if (!email.errors || email.errors <= Mailer.config.retry) {
                    count += 1;

                    if (Mailer.config.async) {
                        Meteor.setTimeout(function () {
                            Mailer.sendEmail(email._id);
                        }, 0);
                    } else {
                        Mailer.sendEmail(email._id);
                    }
                }
            });
        }
    }, Mailer.config.interval);
};
