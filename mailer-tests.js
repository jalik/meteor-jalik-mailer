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

import {Meteor} from 'meteor/meteor';
import {Mailer} from 'meteor/jalik:mailer';
import {MailerConfig} from 'meteor/jalik:mailer';
import {Emails} from 'meteor/jalik:mailer';
import {chai} from 'meteor/practicalmeteor:chai';


describe('Mailer', function () {
    const email = {
        from: 'contact@mail.com',
        to: 'test@mail.com',
        subject: "This is a test",
        text: "Test",
        html: "Test"
    };

    if (Meteor.isServer) {

        it(`should have a default configuration`, function () {
            chai.assert.equal(Mailer.config instanceof MailerConfig, true);
        });

        before(function () {
            // Clear database
            Emails.remove({});
            // Set config
            Mailer.config.interval = 10000;
            Mailer.config.retry = 3;
        });

        describe(`start()`, function () {
            it(`should start the service`, function () {
                Mailer.start();
                chai.assert.equal(Mailer.isStarted(), true);
            });
        });

        describe(`stop()`, function () {
            it(`should stop the service`, function () {
                Mailer.stop();
                chai.assert.equal(Mailer.isStarted(), false);
            });
        });

        describe(`restart()`, function () {
            it(`should restart the service`, function () {
                Mailer.restart();
                chai.assert.equal(Mailer.isStarted(), true);
            });
        });

        describe(`queue(${email})`, function () {
            it(`should insert the email in queue with the "pending" status`, function () {
                Mailer.queue(email);
                email.status = Mailer.status.PENDING;
                chai.assert.equal(Emails.find(email).count(), 1);
            });
        });

        describe(`cancel(${email})`, function () {
            it(`should change the email status to "canceled"`, function () {
                let emailId = Mailer.queue(email);
                Mailer.cancelEmail(emailId);
                chai.assert.equal(Emails.find({_id: emailId, status: Mailer.status.CANCELED}).count(), 1);
            });
        });
    }
});
