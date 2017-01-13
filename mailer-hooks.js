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

import {WebApp} from 'meteor/webapp';
import {Mailer} from './mailer';
import {Emails} from './mailer-collections';


// Execute callbacks when an email is queued
Emails.after.insert(function (userId, doc) {
    if (doc.status === Mailer.status.PENDING) {
        Mailer.events.emailQueued.call(Mailer, doc._id, doc);
    }
});

// Execute callbacks when the status of an email changed
Emails.after.update(function (userId, doc, fields, mod) {
    if (mod && mod.$set) {
        const $set = mod.$set;

        switch ($set.status) {
            case Mailer.status.DELAYED:
                Mailer.events.emailDelayed.call(Mailer, doc._id, doc);
                break;

            case Mailer.status.FAILED:
                // This event is called in Mailer.processEmail()
                // Mailer.events.emailFailed.call(Mailer, doc._id, doc);
                break;

            case Mailer.status.READ:
                // This event is called in the mailer-hooks
                // Mailer.events.emailRead.call(Mailer, doc._id, doc);
                break;

            case Mailer.status.SENT:
                Mailer.events.emailSent.call(Mailer, doc._id, doc);
                break;
        }
    }
});


WebApp.connectHandlers.use(function (req, res, next) {
    // Check if emailId is set
    if (req.query && req.query['emailId'] !== undefined) {
        let emailId = req.query.emailId;
        let readPath = Mailer.getReadPath(emailId);

        if (req.url.indexOf(readPath) !== -1) {
            // Mark the email as read
            let result = Mailer.emails.update({
                _id: emailId,
                status: Mailer.status.SENT
            }, {
                $set: {
                    status: Mailer.status.READ,
                    readAt: new Date()
                }
            });

            if (result) {
                // Execute callback
                Mailer.events.emailRead.call(Mailer, emailId, req);
            }

            let redirect = req.query && req.query.redirect;

            if (redirect) {
                res.writeHead(301, {Location: redirect});
                res.end();
            }
            else {
                // Return a 1x1 transparent image
                const img = new Buffer([
                    0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00,
                    0x80, 0x00, 0x00, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x2c,
                    0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02,
                    0x02, 0x44, 0x01, 0x00, 0x3b]);
                res.writeHead(200, {'Content-Type': 'image/gif'});
                res.end(img, 'binary');
            }
        }
    }
    else {
        next();
    }
});
