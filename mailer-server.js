/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2017 Karl STEIN
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import {_} from 'meteor/underscore';
import {Email} from 'meteor/email';
import {Meteor} from 'meteor/meteor';
import {HookHelper} from 'meteor/jalik:hook-helper';
import {Mailer} from './mailer';
import {Emails} from './mailer-collections';


let sending = false;
let timers = {};

/**
 * Mailer events
 */
Mailer.events = {
    emailDelayed: new HookHelper(),
    emailFailed: new HookHelper(),
    emailQueued: new HookHelper(),
    emailRead: new HookHelper(),
    emailSent: new HookHelper(),
    error: new HookHelper(),
    send: new HookHelper(),
    started: new HookHelper(),
    stopped: new HookHelper()
};

/**
 * Cancels the email
 * @param emailId
 * @returns {boolean}
 */
Mailer.cancelEmail = function (emailId) {
    if (typeof emailId !== 'string') {
        throw new TypeError("Mailer: emailId is not a string");
    }
    return Emails.update({
            _id: emailId,
            status: {$in: [Mailer.status.DELAYED, Mailer.status.FAILED, Mailer.status.PENDING]}
        }, {
            $set: {
                status: Mailer.status.CANCELED,
                canceledAt: new Date()
            }
        }) === 1;
};

/**
 * Checks if the mailer is sending emails
 * @return {boolean}
 */
Mailer.isSending = function () {
    return sending;
};

/**
 * Checks if the mailer service is started
 * @return {boolean}
 */
Mailer.isStarted = function () {
    return !!timers.start1 || !!timers.start2;
};

/**
 * Called when an email is delayed
 * @param callback
 */
Mailer.onEmailDelayed = function (callback) {
    this.events.emailDelayed.add(callback);
};

/**
 * Called when an email failed sending
 * @param callback
 */
Mailer.onEmailFailed = function (callback) {
    this.events.emailFailed.add(callback);
};

/**
 * Called when an email has been queued
 * @param callback
 */
Mailer.onEmailQueued = function (callback) {
    this.events.emailQueued.add(callback);
};

/**
 * Called when an email has been read
 * @param callback
 */
Mailer.onEmailRead = function (callback) {
    this.events.emailRead.add(callback);
};

/**
 * Called when an email has been sent
 * @param callback
 */
Mailer.onEmailSent = function (callback) {
    this.events.emailSent.add(callback);
};

/**
 * Called when an error occurred while sending the email
 * @param callback
 */
Mailer.onError = function (callback) {
    this.events.error.add(callback);
};

/**
 * Called before sending an email
 * @param callback
 */
Mailer.onSend = function (callback) {
    this.events.send.add(callback);
};

/**
 * Called when the service is started
 * @param callback
 */
Mailer.onStarted = function (callback) {
    this.events.started.add(callback);
};

/**
 * Called when the service is stopped
 * @param callback
 */
Mailer.onStopped = function (callback) {
    this.events.stopped.add(callback);
};

/**
 * Postpone emails that take too much time to send
 * @returns {*}
 */
Mailer.postponeSendingEmails = function () {
    const self = this;
    const minDate = new Date(Date.now() - self.config.maxSendingTime);
    return Emails.update({
            status: Mailer.status.SENDING,
            sendingAt: {$lte: minDate}
        },
        {
            $set: {
                status: Mailer.status.DELAYED,
                delayedAt: new Date()
            }
        },
        {multi: true}
    );
};

/**
 * Sends the email in the queue
 * @param emailId
 */
Mailer.processEmail = function (emailId) {
    const self = this;

    if (typeof emailId !== 'string') {
        throw new TypeError("Mailer: emailId is not a string");
    }

    let email = Emails.findOne({_id: emailId});
    if (!email) {
        throw new Meteor.Error('email-not-found', `Email "${emailId}" not found`);
    }
    // Avoid sending an email that have been sent or read
    if (_.contains([Mailer.status.SENT, Mailer.status.READ], email.status)) {
        throw new Meteor.Error('email-status-invalid', `Cannot send email "${emailId}" with status "${email.status}"`);
    }

    // Mark the mailer as sending emails
    sending = true;

    try {
        // Allow some processing before sending
        self.events.send.call(self, email);

        // Add an image that will mark the email as read when loaded
        if (email.html) {
            email.html += `<img src="${self.getReadUrl(emailId)}" width="1px" height="1px" style="display: none;">`;
            email.html = self.replaceLinks(email.html, emailId);
        }
        else if (email.text) {
            email.text = self.replaceLinks(email.text, emailId);
        }

        // Mark email as sending
        Emails.update({_id: emailId}, {
            $set: {
                status: Mailer.status.SENDING,
                sendingAt: new Date()
            }
        });

        // Really send the email
        Email.send(email);

        // Mark email as sent
        Emails.update({_id: emailId}, {
            $set: {
                status: Mailer.status.SENT,
                sentAt: new Date()
            },
            $unset: {
                sendingAt: null
            }
        });
    }
    catch (err) {
        // Display error in console
        if (err instanceof Meteor.Error) {
            console.error(err.stack);
        } else {
            console.error(err.message);
        }

        // Mark email as failed
        Emails.update({_id: emailId}, {
            $inc: {errors: 1},
            $set: {
                status: Mailer.status.FAILED,
                failedAt: new Date(),
                error: err
            }
        });

        // Add error to the email
        email.error = err;

        // Execute callback
        self.events.emailFailed.call(self, emailId, email);
        self.events.error.call(self, err, emailId, email);
    }
    finally {
        // Finish sending emails
        sending = false;
    }
};

/**
 * Processes the queue
 */
Mailer.processQueue = function () {
    const self = this;

    // Ignore if the mailer is sending emails
    if (!self.isSending()) {
        let now = new Date();
        let count = 0;

        // Find emails to send
        Emails.find({
            status: {$nin: [Mailer.status.CANCELED, Mailer.status.SENT, Mailer.status.READ]},
            $and: [
                {
                    $or: [
                        {errors: null},
                        {errors: {$lt: self.config.retry}}
                    ]
                }
            ],
            $or: [
                // Emails that have not been sent yet
                {sentAt: null},
                // Emails that can be sent now
                {sendAt: {$lte: now}}
            ]
        }, {
            fields: {_id: 1, errors: 1},
            limit: self.config.maxEmailsPerTask,
            sort: {
                priority: 1,
                sendAt: 1,
                queuedAt: 1
            }
        }).forEach(function (email) {
            count += 1;

            if (self.config.async) {
                Meteor.defer(function () {
                    self.processEmail(email._id);
                });
            } else {
                self.processEmail(email._id);
            }
        });
    }
};

/**
 * Adds the email to the queue
 * @param email
 * @return {*}
 */
Mailer.queue = function (email) {
    const self = this;

    // Set default options
    email = _.extend({
        from: self.config.from,
        bcc: self.config.bcc,
        cc: self.config.cc,
        replyTo: self.config.replyTo,
        headers: self.config.headers,
        priority: 2
    }, email);

    // Check if email is valid
    self.checkEmail(email);

    // Check priority
    if (typeof email.priority !== 'number') {
        throw new TypeError("Mailer: priority is not a number");
    }

    // Add extra info
    email.status = Mailer.status.PENDING;
    email.queuedAt = new Date();

    return Emails.insert(email);
};

/**
 * Restarts the service
 */
Mailer.restart = function () {
    this.stop();
    this.start();
};

/**
 * Sends the email
 * @param email
 * @return {*}
 */
Mailer.send = function (email) {
    this.checkEmail(email);
    return this.processEmail(this.queue(email));
};

/**
 * TODO remove in next releases
 * Sends an existing email
 * DEPRECATED use Mailer.processEmail(emailId) instead
 * @see Mailer.processEmail()
 * @deprecated
 * @param emailId
 */
Mailer.sendEmail = function (emailId) {
    console.warn("Mailer.sendEmail() has been DEPRECATED, use Mailer.processEmail() instead !");
    this.processEmail(emailId);
};

/**
 * Starts the service
 */
Mailer.start = function () {
    const self = this;

    // Send emails
    if (self.config.processOnStart) {
        self.processQueue();
    }

    // Delay emails that take too much time to send
    timers.start1 = Meteor.setInterval(function () {
        self.postponeSendingEmails();
    }, self.config.maxSendingTime);

    // Processes the emails queue
    timers.start2 = Meteor.setInterval(function () {
        self.processQueue();
    }, self.config.interval);
};

/**
 * Stops the service
 */
Mailer.stop = function () {
    Meteor.clearInterval(timers.start1);
    Meteor.clearInterval(timers.start2);
    timers.start1 = false;
    timers.start2 = false;
};
