# Mailer

Mailer is a Meteor package that provides a simple way to send emails using a prioritized queue system.
It was built to never miss an email sending even when the server is restarted.

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

All settings are defined using the `Mailer.Config` object.

```js
Mailer.config = new Mailer.Config({
    // default from address to use
    from: 'me@mailer.com',
    // send emails asynchronously
    async: true,
    // send emails every 60 seconds
    interval: 1000 * 60,
    // send max 5 emails per task (in this example a task is run every 60 seconds) /  (0 to disable)
    maxEmailsPerTask: 5,
    // max time before considering that a sending email has failed
    maxSendingTime: 1000 * 30,
    // default priority (ex: 1 is more important than 5)
    priority: 2,
    // number of time to retry when email sending failed (0 to disable)
    retry: 1,
    // web hook path used to mark emails as read
    webHook: 'mailer'
});
```

## Starting the service

To start the service, just call `Mailer.start()`, it will start a timer that is executed using the **interval** value in milliseconds,
on each call, the mailer will fetch failed, delayed and pending emails to send them.

```js
if (Meteor.isServer) {
    // Set the mailer config
    Mailer.config = new Mailer.Config({
        interval: 1000 * 60,
        maxSendingTime: 1000 * 30
    });
    Meteor.startup(function () {
        Mailer.start();
    });
}
```

## Sending emails

To send an email, use `Mailer.send(email)`.

```js
Mailer.send({
    from: 'test@mailer.com',
    to: 'you@example.com',
    subject: 'Test email',
    text: 'Mailer Service Test'
});
```

You can specify a date in the future to send the email using the `sendAt` option.

```js
Mailer.send({
    sendAt: laterDate,
    from: 'test@mailer.com',
    to: 'you@example.com',
    subject: 'Test email',
    text: 'Mailer Service Test'
});
```

## Queuing emails

To send an email using a queue so it's send in a batch, you have to add it to the queue using `Mailer.queue(email)`.
The email object is the same as described in the Meteor documentation, but with extra options.
You can set the priority of the email (default is 2), you are free to use the value you want, low number means higher priority and high number means low priority.
You can set the sending date using **queuedAt** (default is the current date), the value must be a **Date**.

```js
Mailer.queue({
    from: 'test@mailer.com',
    to: 'you@example.com',
    subject: 'Test email',
    text: 'Mailer Service Test',
    priority: 2,
    queuedAt: new Date()
});
```

## Handling errors

Sometimes errors can happen, in that case the Mailer will simply change the status of the email to **failed** and will retry to send it on the next execution.
But if you want to do more things you can overwrite the `Mailer.onError` callback.

```js
Mailer.onError = function(err, emailId) {
    console.error(err);
};
```

## Events

Some events are hooked so you can execute code when the event occurs.

```js
Mailer.onEmailFailed = function(emailId, email) {
    console.log('The email ' + emailId + ' has failed sending');
};
Mailer.onEmailQueued = function(emailId, email) {
    console.log('The email ' + emailId + ' has been queued');
};
Mailer.onEmailRead = function(emailId, httpRequest) {
    console.log('The email ' + emailId + ' has been read');
};
Mailer.onEmailSent = function(emailId, email) {
    console.log('The email ' + emailId + ' has been sent');
};
Mailer.onSend = function(emailId, email) {
    console.log('Sending email ' + emailId);
};
```

## Fetching emails

The emails collection is accessible in `Mailer.emails`.

```js
// Get all pending emails
var emails = Mailer.emails.find({status: 'pending'});
```

## Status

Here are the different status an email can have :
* pending : the email has been added to the queue and is waiting to be sent
* sending : the email is currently sending
* sent : the email has been sent
* read : the email has been read (note that it works only with html emails using an embedded img tag)
* failed : an error occurred while sending the email, it will be sent on the next execution
* delayed : the email will be sent on the next execution because it took too much time to be sent
