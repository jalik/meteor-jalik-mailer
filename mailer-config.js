/**
 * Mailer configuration
 * @param options
 * @constructor
 */
Mailer.Config = function (options) {
    // Set default options
    options = _.extend({
        from: null,
        bcc: null,
        cc: null,
        replyTo: null,
        headers: null,
        async: false,
        interval: 1000 * 60,
        maxSendingTime: 1000 * 30,
        priority: 2,
        webHook: 'mailer'
    }, options);

    // Check options
    if (typeof options.async !== 'boolean') {
        throw new Meteor.Error('async is not a boolean');
    }
    if (typeof options.interval !== 'number') {
        throw new Meteor.Error('interval is not a number');
    }
    if (typeof options.maxSendingTime !== 'number') {
        throw new Meteor.Error('maxSendingTime is not a number');
    }
    if (typeof options.priority !== 'number') {
        throw new Meteor.Error('priority is not a number');
    }
    if (typeof options.webHook !== 'string') {
        throw new Meteor.Error('webHook is not a string');
    }

    // Public attributes
    this.from = options.from;
    this.bcc = options.bcc;
    this.cc = options.cc;
    this.replyTo = options.replyTo;
    this.headers = options.headers;
    this.async = options.async === true;
    this.interval = parseInt(options.interval);
    this.maxSendingTime = parseInt(options.maxSendingTime);
    this.priority = parseInt(options.priority);
    this.webHook = options.webHook;
};

/**
 * Global configuration
 * @type {Mailer.Config}
 */
Mailer.config = new Mailer.Config();
