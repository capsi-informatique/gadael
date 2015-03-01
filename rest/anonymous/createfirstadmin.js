'use strict';

var ctrlFactory = require('restitute').controller;


/**
 * a GET on anonymous/createfirstadmin return a boolean
 * test if the first admin can be created or not
 */
function getController() {
    ctrlFactory.get.call(this, '/rest/anonymous/createfirstadmin');

    var controller = this;

    this.controllerAction = function() {
        var service = controller.service('admin/users/list');
        var promise = service.getResultPromise({}); // no parameters, no pagination

        promise.then(function(users) {
            var createFirstAdminAllowed = (0 === users.length);
            controller.res.statusCode = service.httpstatus;
            controller.res.end(JSON.stringify(createFirstAdminAllowed));
        }).catch(function(err) {
            controller.res.statusCode = service.httpstatus;
            controller.res.end(JSON.stringify({ $outcome: service.outcome }));
        });
    };
}
getController.prototype = new ctrlFactory.get();


function save() {
    this.jsonService(this.service('admin/users/save'));
}

/**
 * A POST on anonymous/createfirstadmin create the first admin
 *
 */
function createController() {
    ctrlFactory.create.call(this, '/rest/anonymous/createfirstadmin');
    this.controllerAction = save;
}
createController.prototype = new ctrlFactory.create();



exports = module.exports = {
    get: getController,
    create: createController
};
