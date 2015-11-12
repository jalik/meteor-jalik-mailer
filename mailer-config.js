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
        interval: 1000 * 60,
        maxTime: 1000 * 30,
        priority: 2
    }, options);

    // Check options
    if (typeof options.interval !== 'number') {
        throw new Meteor.Error('interval is not a number');
    }
    if (typeof options.maxTime !== 'number') {
        throw new Meteor.Error('maxTime is not a number');
    }
    if (typeof options.priority !== 'number') {
        throw new Meteor.Error('priority is not a number');
    }

    // Public attributes
    this.from = options.from;
    this.bcc = options.bcc;
    this.cc = options.cc;
    this.replyTo = options.replyTo;
    this.headers = options.headers;
    this.interval = parseInt(options.interval);
    this.maxTime = parseInt(options.maxTime);
    this.priority = parseInt(options.priority);
};

/**
 * Global configuration
 * @type {Mailer.Config}
 */
Mailer.config = new Mailer.Config();
