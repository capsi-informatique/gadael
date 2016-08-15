'use strict';

const gt = require('../gettext');
const util = require('util');
const Mail = require('../mail');


/**
 * Mail send to request owner when workflow succeed
 * This mail is for approval ony, requestcreated will be used instead if
 * an admin create a request for a user without approval
 *
 * @param {Object} app      Express
 * @param {Request} request
 * @returns {Promise}
 */
exports = module.exports = function getMail(app, request) {

    let mail = new Mail(app);

    let workflowCreation = request.getLastNonApprovalRequestLog();

    let requestLink = app.config.url +'/#/account/'+request.getUrlPathType()+'/'+ request._id;

    let intro;

    if ('accepted' === request.status.created) {
        mail.setSubject(util.format(gt.gettext('%s: request accepted'), app.config.company.name));
        intro = util.format(gt.gettext('Your %s has been accepted'), request.getDispType());
    }


    if ('accepted' === request.status.deleted) {
        mail.setSubject(util.format(gt.gettext('%s: request canceled'), app.config.company.name));
        intro = util.format(
            gt.gettext('As requested by %s, the %s request has been canceled'),
            workflowCreation.userCreated.name,
            request.getDispType()
        );
    }

    return request.getUser()
    .then(user => {
        mail.addTo(user);

        let log = request.getlastApprovalRequestLog();

        if ('wf_accept' !== log.action) {
            throw new Error('Unexpected last approval request log');
        }

        mail.setMailgenData({
            body: {
                name: request.user.name,
                intro: intro,
                action: {
                    instructions: gt.gettext('Consult the request actions history after login into the application'),
                    button: {
                        text: gt.gettext('View request'),
                        link: requestLink
                    }
                },
                outro: util.format(
                    gt.gettext('Workflow initiated by %s the %s'),
                    workflowCreation.userCreated.name,
                    workflowCreation.timeCreated.toLocaleString()
                )
            }
        });

        return mail;
    });


};