import {_} from 'meteor/underscore';
import {check} from 'meteor/check';
import {Meteor} from 'meteor/meteor';
import {WebApp} from 'meteor/webapp';

import {Mailer} from './mailer';
import {events} from './mailer-server';

WebApp.connectHandlers.use(function (req, res, next) {
    let emailId = req.query && req.query.emailId;
    let endPoint = Mailer.getReadLink(emailId).replace(Meteor.absoluteUrl(), '');

    if (emailId && req.url.indexOf(endPoint) !== -1) {
        // Mark the email as read
        let result = Mailer.emails.update({
            _id: emailId,
            status: 'sent'
        }, {
            $set: {
                status: 'read',
                readAt: new Date()
            }
        });

        if (result) {
            // Execute callback
            events.onEmailRead.call(Mailer, emailId, req);
        }

        let redirect = req.query && req.query.redirect;

        if (redirect) {
            res.writeHead(301, {Location: redirect});
            res.end();

        } else {
            // Return a 1x1 transparent image
            var img = new Buffer([
                0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00,
                0x80, 0x00, 0x00, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x2c,
                0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02,
                0x02, 0x44, 0x01, 0x00, 0x3b]);
            res.writeHead(200, {'Content-Type': 'image/gif'});
            res.end(img, 'binary');
        }

    } else {
        next();
    }
});
