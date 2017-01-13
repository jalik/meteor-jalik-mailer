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


/**
 * Mailer configuration
 * @param options
 * @constructor
 */
export class Config {

    constructor(options) {
        // Set default options
        options = _.extend({
            from: null,
            bcc: null,
            cc: null,
            replyTo: null,
            headers: null,
            async: false,
            interval: 1000 * 60,
            maxEmailsPerTask: 0,
            maxSendingTime: 1000 * 10,
            priority: 2,
            processOnStart: true,
            retry: 1,
            webHook: 'mailer',
            hooksPath: 'mailer'
        }, options);

        // Check options
        if (typeof options.async !== 'boolean') {
            throw new TypeError("MailerConfig: async is not a boolean");
        }
        if (options.bcc && typeof options.bcc !== 'string' && !Array.isArray(options.bcc)) {
            throw new TypeError("MailerConfig: bcc is not a string or Array of strings");
        }
        if (options.cc && typeof options.cc !== 'string' && !Array.isArray(options.cc)) {
            throw new TypeError("MailerConfig: cc is not a string or Array of strings");
        }
        if (options.from && typeof options.from !== 'string') {
            throw new TypeError("MailerConfig: from is not a string");
        }
        if (typeof options.interval !== 'number') {
            throw new TypeError("MailerConfig: interval is not a number");
        }
        if (typeof options.maxEmailsPerTask !== 'number') {
            throw new TypeError("MailerConfig: maxEmailsPerTask is not a number");
        }
        if (typeof options.maxSendingTime !== 'number') {
            throw new TypeError("MailerConfig: maxSendingTime is not a number");
        }
        if (typeof options.priority !== 'number') {
            throw new TypeError("MailerConfig: priority is not a number");
        }
        if (typeof options.processOnStart !== 'boolean') {
            throw new TypeError("MailerConfig: processOnStart is not a boolean");
        }
        if (options.replyTo && typeof options.replyTo !== 'string' && !Array.isArray(options.replyTo)) {
            throw new TypeError("MailerConfig: replyTo is not a string or Array of strings");
        }
        if (typeof options.retry !== 'number') {
            throw new TypeError("MailerConfig: retry is not a number");
        }
        if (typeof options.webHook !== 'string') {
            throw new TypeError("MailerConfig: webHook is not a string");
        }

        /**
         * Send emails asynchronously
         * @type {boolean}
         */
        this.async = options.async;
        /**
         * Default Bcc address(es)
         * @type {string|Array}
         */
        this.bcc = options.bcc;
        /**
         * Default Cc address(es)
         * @type {string|Array}
         */
        this.cc = options.cc;
        /**
         * Default From address
         * @type {string}
         */
        this.from = options.from;
        /**
         * Default headers to send
         * @type {object|null}
         */
        this.headers = options.headers;
        /**
         * The mailer cron execution interval in milliseconds.
         * Example: a value of 60000 will send emails each 60 seconds.
         * @type {Number}
         */
        this.interval = parseInt(options.interval);
        /**
         * How many emails to send on each cron execution
         * @type {Number}
         */
        this.maxEmailsPerTask = parseInt(options.maxEmailsPerTask);
        /**
         * How much time in milliseconds to
         * @type {Number}
         */
        this.maxSendingTime = parseInt(options.maxSendingTime);
        /**
         * Default sending priority (lesser is more important, so 0 will ben sent before 99)
         * @type {Number}
         */
        this.priority = parseInt(options.priority);
        /**
         * Send emails when service starts
         * @type {Number}
         */
        this.processOnStart = options.processOnStart;
        /**
         * Default Reply-To address(es)
         * @type {string|Array}
         */
        this.replyTo = options.replyTo;
        /**
         * How many times the mailer should retry to send a mailing if it failed
         * @type {Number}
         */
        this.retry = parseInt(options.retry);
        /**
         * Relative path from the ROOT_URL where the mailer API should be accessible
         * @type {string}
         */
        this.webHook = options.webHook;
    }
}

export default Config;
