import {check} from 'meteor/check';
import {Mongo} from 'meteor/mongo';

export const Mailer = {

    /**
     * Collection of email tasks
     * @type {Mongo.Collection}
     */
    emails: new Mongo.Collection('jalik-mailerEmails'),

    /**
     * Returns the URL to mark the email as read
     * @param emailId
     * @param redirect
     * @return {*}
     */
    getReadLink: function (emailId, redirect) {
        let url = Meteor.absoluteUrl(Mailer.config.webHook + '/read?emailId=' + emailId);
        redirect && (url += '&redirect=' + encodeURIComponent(redirect));
        return url;
    },

    /**
     * Checks if the email has been opened
     * @param emailId
     * @return {boolean}
     */
    isEmailRead: function (emailId) {
        check(emailId, String);

        return Mailer.emails.find({
                _id: emailId,
                $or: [
                    {status: 'read'},
                    {readAt: {$ne: null}}
                ]
            }).count() > 0;
    },

    /**
     * Checks if the email has been sent
     * @param emailId
     * @return {boolean}
     */
    isEmailSent: function (emailId) {
        check(emailId, String);

        return Mailer.emails.find({
                _id: emailId,
                $or: [
                    {status: 'sent'},
                    {sentAt: {$ne: null}}
                ]
            }).count() > 0;
    }
};
