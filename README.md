# jalik-mailer

Mailer is a Meteor package that provides a simple way to send emails using a prioritized queue system.
It was built to never miss an email sending even if the server is restarted.

[![Donate](https://img.shields.io/badge/Donate-PayPal-green.svg)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=SS78MUMW8AH4N)

## Installation

To install the package, execute this command in the root of your project :
```
meteor add jalik:mailer
```

If later you want to remove the package :
```
meteor remove jalik:mailer
```

## Configuration

All settings are accessible from the `Mailer.config` object which is an instance of `MailerConfig` with default settings.

```js
import {Mailer} from 'meteor/jalik:mailer';

// default from address to use
Mailer.config.from = 'me@mail.com';
// send emails asynchronously
Mailer.config.async = true;
// send emails every 60 seconds
Mailer.config.interval = 1000 * 60;
// send max 5 emails per task (in this example a task is run every 60 seconds) /  (0 to disable)
Mailer.config.maxEmailsPerTask = 5;
// max time before considering that a sending email has failed
Mailer.config.maxSendingTime = 1000 * 30;
// default priority (ex= 1 is more important than 5)
Mailer.config.priority = 2;
// Send email when service starts
Mailer.config.processOnStart = true;
// number of time to retry when email sending failed (0 to disable)
Mailer.config.retry = 1;
// web hook path used to mark emails as read
Mailer.config.webHook = 'mailer';
```

## Starting the service

To start the mail service, use `Mailer.start()`.

```js
import {Mailer} from 'meteor/jalik:mailer';
import {Meteor} from 'meteor/meteor';

if (Meteor.isServer) {
    Meteor.startup(function () {
        Mailer.start();
    });
}
```

## Stopping the service

To stop the mail service, use `Mailer.stop()`.

```js
import {Mailer} from 'meteor/jalik:mailer';
import {Meteor} from 'meteor/meteor';

if (Meteor.isServer) {
    Meteor.startup(function () {
        Mailer.start();
        //...
        Mailer.stop();
    });
}
```

## Restarting the service

To restart the mail service, use `Mailer.restart()`.

```js
import {Mailer} from 'meteor/jalik:mailer';
import {Meteor} from 'meteor/meteor';

if (Meteor.isServer) {
    Meteor.startup(function () {
        Mailer.start();
        //...
        Mailer.restart();
    });
}
```

## Sending emails

To send an email, use `Mailer.send(email)`, the content of the email can be raw text if you pass the `text` option and/or HTML if you pass `html`.
The email object is the same as in the Meteor documentation : https://docs.meteor.com/api/email.html since `Mailer` is a smart version of the `Email` package.
Sending an email will put it in the queue and send it just after.

```js
import {Mailer} from 'meteor/jalik:mailer';

Mailer.send({
    from: 'test@mailer.com',
    bcc: ['bcc@example.com'],
    cc: ['cc1@example.com','cc2@example.com'],
    to: 'you@example.com',
    subject: 'Test email',
    text: "Mailer Test",
    html: "<h1>Mailer Test</h1>",
    // Optional: tells the mailer when to send the email
    sendAt: new Date(Date.now() + 1000*60*60)
});
```

## Adding emails to queue

To send an email that is not urgent, use `Mailer.queue(email)`.
You can manage the order of the queue by setting the priority (ex: 0 will be sent before 99).


```js
import {Mailer} from 'meteor/jalik:mailer';

Mailer.queue({
    from: 'test@mailer.com',
    to: 'you@example.com',
    subject: 'Test email',
    text: "Mailer Test",
    // Optional: this tells the mailer to send this email before emails with priority more than 2
    priority: 2
});
```

## Handling errors

Sometimes errors can happen, in that case the Mailer will simply change the status of the email to **failed** and will retry to send it on the next execution.
But if you want to do more things you can overwrite the `Mailer.onError` callback.

```js
import {Mailer} from 'meteor/jalik:mailer';

Mailer.onError = function(err, emailId) {
    console.error(err);
};
```

## Handling events

You can hook to mailer events by using the following methods.

```js
import {Mailer} from 'meteor/jalik:mailer';

Mailer.onEmailDelayed = function(emailId, email) {
    console.log(`The email ${emailId} has been delayed`);
};
Mailer.onEmailFailed = function(emailId, email) {
    console.log(`The email ${emailId} has failed sending`);
};
Mailer.onEmailQueued = function(emailId, email) {
    console.log(`The email ${emailId} has been added to queue`);
};
Mailer.onEmailRead = function(emailId, httpRequest) {
    console.log(`The email ${emailId} has been read`);
};
Mailer.onEmailSent = function(emailId, email) {
    console.log(`The email ${emailId} has been sent`);
};
Mailer.onSend = function(emailId, email) {
    console.log(`Sending email ${emailId}`);
};
```

## Fetching emails

All emails are stored in a `Mongo.Collection`, accessible in `Mailer.emails`.

```js
let count = 0;

import {Mailer} from 'meteor/jalik:mailer';
count = Mailer.emails.find({status: Mailer.status.PENDING}).count();
// OR
import {Emails} from 'meteor/jalik:mailer';
count = Emails.find({status: Mailer.status.PENDING}).count();
```

## Email status

Each email have a `status` attribute that can be one of the following :
* `pending` : the email has been added to the queue and is waiting to be sent
* `canceled` : the email has been canceled
* `failed` : an error occurred while sending the email, it will be sent on the next execution
* `delayed` : the email will be sent on the next execution because it took too much time to be sent
* `sending` : the email is currently sending
* `sent` : the email has been sent
* `read` : the email has been read (note that it works only with html emails using an embedded img tag)

**NOTE: statuses are available through `Mailer.status`.**

## Changelog

### v0.4.0
**WARNING, there are breaking changes in this version, please see below.**

- Deprecates method `Mailer.getReadLink()`, use instead `Mailer.getReadUrl()`
- Deprecates method `Mailer.sendEmail()`, use instead `Mailer.processEmail()`
- Renames class `Mailer.Config` to `MailerConfig`

These are the new things :
- Uses ES6 module `import` and `export` syntax
- Adds `Mailer.status` containing all email statuses
- Adds config `Mailer.config.processOnStart = true` to send emails when service starts
- Adds method `Mailer.cancelEmail(emailId)`
- Adds method `Mailer.checkEmail(email)`
- Adds method `Mailer.getReadPath(emailId, redirect)`
- Adds method `Mailer.getReadUrl(emailId, redirect)`
- Adds method `Mailer.isStarted()`
- Adds method `Mailer.onStarted(callback)`
- Adds method `Mailer.onStopped(callback)`
- Adds method `Mailer.processEmail()`
- Adds method `Mailer.replaceLinks(content, emailId)`
- Adds method `Mailer.restart()`
- Adds method `Mailer.stop()`
- Adds unit tests
- Throws more detailed errors

## License

This project is released under the [MIT License](http://www.opensource.org/licenses/MIT).
