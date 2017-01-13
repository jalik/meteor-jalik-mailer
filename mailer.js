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
import {Config} from './mailer-config';
import {Emails as emails} from './mailer-collections';


export const Mailer = {

    /**
     * Configuration
     * @type {Config}
     */
    config: new Config(),

    /**
     * Collection of emails
     * @type {Mongo.Collection}
     */
    emails: emails,

    /**
     * Email statuses
     */
    status: {
        CANCELED: 'canceled',
        DELAYED: 'delayed',
        FAILED: 'failed',
        PENDING: 'pending',
        READ: 'read',
        SENDING: 'sending',
        SENT: 'sent'
    },

    /**
     * Checks if the email is valid
     * @param email
     * @throws {TypeError}
     */
    checkEmail(email) {
        if (typeof email !== 'object' || !email) {
            throw new TypeError("Mailer: email is not valid");
        }
        if (!email.bcc && !email.cc && !email.to) {
            throw new TypeError("MailerConfig: no recipient defined");
        }
        if (email.attachments && !Array.isArray(email.attachments)) {
            throw new TypeError("MailerConfig: attachments is not an Array");
        }
        if (email.bcc && typeof email.bcc !== 'string' && !Array.isArray(email.bcc)) {
            throw new TypeError("MailerConfig: bcc is not a string/Array");
        }
        if (email.cc && typeof email.cc !== 'string' && !Array.isArray(email.cc)) {
            throw new TypeError("MailerConfig: cc is not a string/Array");
        }
        if (typeof email.from !== 'string') {
            throw new TypeError("MailerConfig: from is not a string");
        }
        if (email.replyTo && typeof email.replyTo !== 'string' && !Array.isArray(email.replyTo)) {
            throw new TypeError("MailerConfig: replyTo is not a string/Array");
        }
        if (email.subject && typeof email.subject !== 'string') {
            throw new TypeError("MailerConfig: subject is not a string");
        }
        if (typeof email.text !== 'string' && typeof email.html !== 'string') {
            throw new TypeError("MailerConfig: email content is not defined, use text or html");
        }
        if (email.to && typeof email.to !== 'string' && !Array.isArray(email.to)) {
            throw new TypeError("MailerConfig: to is not a string/Array");
        }
    },

    /**
     * // TODO remove in next releases
     * Returns the URL to mark the email as read
     * @deprecated
     * @param emailId
     * @param redirect
     * @return {*}
     */
    getReadLink(emailId, redirect) {
        console.warn("Mailer: getReadLink() is DEPRECATED, use getReadUrl() instead");
        return this.getReadUrl(emailId, redirect);
    },

    /**
     * Returns the relative path to mark the email as read
     * @param emailId
     * @param redirect
     * @return {*}
     */
    getReadPath(emailId, redirect) {
        if (typeof emailId !== 'string') {
            throw new TypeError("Mailer: emailId is not a string");
        }
        if (redirect && typeof redirect !== 'string') {
            throw new TypeError("Mailer: redirect is not a string");
        }
        let path = `${this.config.webHook}/read?emailId=${emailId}`;

        if (redirect) {
            path += `&redirect=${encodeURIComponent(redirect)}`;
        }
        return path;
    },

    /**
     * Returns the absolute URL to mark the email as read
     * @param emailId
     * @param redirectUrl
     * @return {*}
     */
    getReadUrl(emailId, redirectUrl) {
        return Meteor.absoluteUrl(this.getReadPath(emailId, redirectUrl));
    },

    /**
     * Checks if the email has been opened
     * @param emailId
     * @return {boolean}
     */
    isEmailRead(emailId) {
        if (typeof emailId !== 'string') {
            throw new TypeError("Mailer: emailId is not a string");
        }
        return this.emails.find({
                _id: emailId,
                $or: [
                    {status: Mailer.status.READ},
                    {readAt: {$ne: null}}
                ]
            }).count() === 1;
    },

    /**
     * Checks if the email has been sent
     * @param emailId
     * @return {boolean}
     */
    isEmailSent(emailId) {
        if (typeof emailId !== 'string') {
            throw new TypeError("Mailer: emailId is not a string");
        }
        return this.emails.find({
                _id: emailId,
                $or: [
                    {status: Mailer.status.SENT},
                    {sentAt: {$ne: null}}
                ]
            }).count() === 1;
    },

    /**
     * Modifies links in text to detect when a link has been clicked inside an email
     * @param content
     * @param emailId
     * @returns {string}
     */
    replaceLinks(content, emailId) {
        const self = this;

        if (typeof content !== 'string') {
            throw new TypeError("Mailer: content is not a string");
        }
        if (typeof emailId !== 'string') {
            throw new TypeError("Mailer: emailId is not a string");
        }
        return content.replace(/https?:\/\/[^ "']+/gi, function (link) {
            return self.getReadUrl(emailId, link);
        })
    }
};

if (Meteor.isServer) {
    require('./mailer-hooks');
    require('./mailer-server');
}

export const Emails = emails;
export const MailerConfig = Config;
export default Mailer;
