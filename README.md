# Mailer

Mailer is a Meteor package that provides a simple way to send emails using queue,
emails are saved in a mongo collection so you can have emails status,
status is used to handles errors and re-send emails until they succeed.
Mailer will never miss an email even if the server is restarted because it keeps track of the emails status.

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

You can define default values in the config.

```js
Mailer.config = new Mailer.Config({
    from: 'me@mailer.com', // default from address
    interval: 1000 * 60, // delay for each batch
    maxTime: 1000 * 30, // max time before considering that a sending email has failed
    priority: 2 // default priority
});
```

## Start the service

To start the service, just call `Mailer.start()`, it will start a timer that is executed using the **interval** value in milliseconds,
on each call, the mailer will fetch failed, delayed and pending emails to send them.

```js
if (Meteor.isServer) {
    Meteor.startup(function () {
        Mailer.config = new Mailer.Config({
            interval: 1000 * 60,
            maxTime: 1000 * 30
        });
        Mailer.start();
    });
}
```

## Send emails

To send an email, you have to add it to the queue using `Mailer.queue(email)`.
The email object is the same as described in the Meteor documentation, but with extra options.
You can set the priority of the email (default is 2), you are free to use the value you want, low number means higher priority and high number means low priority.
You can set the sending date using **sendAt** (default is the current date), the value must be a **Date**.

```js
Mailer.queue({
    from: 'test@mailer.com',
    to: 'you@example.com',
    subject: 'Test email',
    text: 'Mailer Service Test',
    priority: 2,
    sendAt: new Date()
});
```

## The emails collection

If needed, you can access the emails collection via `Mailer.emails`.
