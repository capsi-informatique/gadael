'use strict';


describe('request workperiod recover account rest service', function() {


    var server,
        userAdmin,      // create the account, the manager
        userAccount,    // create the request
        userManager,    // should be assigned to approval
        userStranger,   // another user

        right1,

        department,     // department associated to userManager
        collection,     // user account collection, contain right1 & 2

        request1;


    beforeEach(function(done) {
        var helpers = require('../mockServer');

        helpers.mockServer('accountRequestWorkperiodRecover', function(_mockServer) {
            server = _mockServer;
            done();
        });
    });


    it('verify the mock server', function(done) {
        expect(server.app).toBeDefined();
        done();
    });


    it('request list of current requests as anonymous', function(done) {
        server.get('/rest/account/requests', {}, function(res) {
            expect(res.statusCode).toEqual(401);
            done();
        });
    });


    // admin actions


    it('Create admin session needed for prerequisits', function(done) {
        server.createAdminSession().then(function(user) {
            userAdmin = user;
            expect(userAdmin.roles.admin).toBeDefined();
            done();
        });
    });


    it('Create a collection', function(done) {
        server.post('/rest/admin/collections', {
            name: 'Test collection',
            attendance: 100
        }, function(res, body) {
            expect(res.statusCode).toEqual(200);
            collection = body;
            delete collection.$outcome;
            done();
        });
    });


    it('create Right 1', function(done) {
        server.post('/rest/admin/rights', {
            name: 'Right 1',
            quantity: 25,
            quantity_unit: 'D',
            rules: [{
                type: 'request_period',
                'title': 'Request period must be in the renewal period'
            }]
        }, function(res, body) {
            expect(res.statusCode).toEqual(200);
            right1 = body;
            expect(right1._id).toBeDefined();
            done();
        });
    });

    it('link the right1 to collection', function(done) {
        server.post('/rest/admin/beneficiaries', {
            ref: 'RightCollection',
            document: collection._id,
            right: right1
        }, function(res, body) {
            expect(res.statusCode).toEqual(200);
            done();
        });
    });


    it('create renewal 1', function(done) {
        server.post('/rest/admin/rightrenewals', {
            right: right1._id,
            start: new Date(2015,1,1).toJSON(),
            finish: new Date(2016,1,1).toJSON()
        }, function(res, body) {
            expect(res.statusCode).toEqual(200);
            right1.renewal = body;
            done();
        });
    });





    it('create a department', function(done) {
        server.post('/rest/admin/departments', {
            name: 'Test entity'
        }, function(res, body) {
            expect(res.statusCode).toEqual(200);
            department = body;
            done();
        });
    });


    it('create the user account', function(done) {
        server.createUserAccount(department)
        .then(function(account) {
            userAccount = account;
            done();

        });

    });


    it('create the stranger account', function(done) {
        server.createUserStranger(department)
        .then(function(account) {
            userStranger = account;
            done();
        });

    });


    it('link user to collection', function(done) {
        server.post('/rest/admin/accountcollections', {
            user: userAccount.user._id,
            rightCollection: collection,
            from: new Date(2014,1,1).toJSON()
        }, function(res, body) {
            expect(res.statusCode).toEqual(200);
            done();
        });
    });


    it('create the manager user', function(done) {
        server.createUserManager(department, department)
        .then(function(manager) {
            userManager = manager;
            expect(userManager.user.roles.manager.department.length).toEqual(1);
            done();
        });

    });



    it('logout', function(done) {
        server.get('/rest/logout', {}, function(res) {
            expect(res.statusCode).toEqual(200);
            done();
        });
    });


    // account session part


    it('Authenticate user account session', function(done) {
        expect(userAccount.user.roles.account).toBeDefined();
        server.authenticateAccount(userAccount).then(function() {
            done();
        });

    });


    it('make sure to be in the department', function(done) {
        server.get('/rest/user', {}, function(res, body) {
            expect(res.statusCode).toEqual(200);
            if (body.department) {
                expect(body.department._id).toEqual(department._id);
            }
            done();
        });
    });


    it('request list of current requests as account first', function(done) {
        server.get('/rest/account/requests', {}, function(res, body) {
            expect(res.statusCode).toEqual(200);
            expect(body.length).toEqual(0);
            done();
        });
    });


    it('Create workperiod recover request', function(done) {


        server.post('/rest/account/requests', {
                events: [{
                    dtstart: new Date(2015,1,1, 19).toJSON(),
                    dtend: new Date(2015,1,1, 22).toJSON()
                }],
                workperiod_recover: [{
                    quantity: 3,
                    right: {
                        name: 'User input for recovery',
                        quantity_unit:'H'
                    }
                }]
            },
            function(res, body) {
            expect(res.statusCode).toEqual(200);

            expect(body._id).toBeDefined();
            expect(body.workperiod_recover).toBeDefined();
            if (body.workperiod_recover) {
                expect(body.user.id).toEqual(userAccount.user._id.toString());
                expect(body.user.name).toBeDefined();
                expect(body.approvalSteps.length).toEqual(1);
                expect(body.requestLog.length).toEqual(1);
                expect(body.events.length).toEqual(1);

                expect(body.workperiod_recover[0].quantity).toEqual(3);
                expect(body.workperiod_recover[0].gainedQuantity).toEqual(0); // because not confimed
                expect(body.workperiod_recover[0].right.id).toEqual(null); // created after approval
                expect(body.workperiod_recover[0].right.name).toBeDefined();
                expect(body.workperiod_recover[0].right.quantity_unit).toEqual('H');
            }
            request1 = body;
            done();
        });
    });


    it('request list of current requests as account', function(done) {
        server.get('/rest/account/requests', {}, function(res, body) {
            expect(res.statusCode).toEqual(200);
            expect(body.length).toEqual(1);
            if (body[0]) {
                expect(body[0].events[0].dtstart).toBeDefined();
                expect(body[0].events[0].dtend).toBeDefined();
            }
            done();
        });
    });



    it('get one request', function(done) {
        server.get('/rest/account/requests/'+request1._id, {}, function(res, body) {
            expect(res.statusCode).toEqual(200);
            expect(body.absence).toBeDefined();
            if (body.absence) {
                expect(body.absence.distribution).toBeDefined();
                expect(body._id).toEqual(request1._id);
                expect(body.workperiod_recover[0].gainedQuantity).toEqual(0);

            }
            done();
        });
    });


    it('update request recovery period', function(done) {



        server.put('/rest/account/requests/'+request1._id, {
                events: [{
                    dtstart: new Date(2015,1,1, 19).toJSON(),
                    dtend: new Date(2015,1,1, 23).toJSON()
                }],
                workperiod_recover: [{
                    quantity: 4,
                    right: {
                        name: 'User input for recovery',
                        quantity_unit:'H'
                    }
                }]
            }, function(res, body) {
            expect(res.statusCode).toEqual(200);
            expect(body._id).toBeDefined();
            expect(body.requestLog).toBeDefined();
            if (body.requestLog) {
                expect(body.requestLog.length).toEqual(2);

                expect(body.workperiod_recover[0].quantity).toEqual(4);
                expect(body.workperiod_recover[0].gainedQuantity).toEqual(0); // because not confimed
                expect(body.workperiod_recover[0].right.id).toEqual(null); // created after approval
                expect(body.workperiod_recover[0].right.name).toBeDefined();
                expect(body.workperiod_recover[0].right.quantity_unit).toEqual('H');
            }
            done();
        });
    });


    /*

    it('forbid creation of request on a work period', function(done) {


    });

    */


    it('logout', function(done) {
        server.get('/rest/logout', {}, function(res) {
            expect(res.statusCode).toEqual(200);
            done();
        });
    });


    // stranger part


    it('Authenticate user stranger session', function(done) {
        expect(userStranger.user.roles.account).toBeDefined();
        server.authenticateAccount(userStranger).then(function() {
            done();
        });

    });


    it('request list of current requests as account', function(done) {
        server.get('/rest/account/requests', {}, function(res, body) {
            expect(res.statusCode).toEqual(200);
            expect(body.length).toEqual(0);
            done();
        });
    });


    it('try to get unaccessible request', function(done) {
        server.get('/rest/account/requests/'+request1._id, {}, function(res, body) {
            expect(res.statusCode).toEqual(404);
            expect(body.$outcome.status).toBeFalsy();
            done();
        });
    });


    it('try to delete a request', function(done) {
        server.delete('/rest/account/requests/'+request1._id, function(res, body) {
            expect(res.statusCode).toEqual(403);
            done();
        });
    });


    it('logout', function(done) {
        server.get('/rest/logout', {}, function(res) {
            expect(res.statusCode).toEqual(200);
            done();
        });
    });


    // login as manager (approver)


    it('Authenticate user manager session', function(done) {
        expect(userManager.user.roles.manager).toBeDefined();
        server.authenticateAccount(userManager).then(function() {
            done();
        });

    });


    it('list waiting requests', function(done) {
        server.get('/rest/manager/waitingrequests', {}, function(res, body) {
            expect(res.statusCode).toEqual(200);
            expect(body.length).toEqual(1);
            done();
        });
    });


    var approvalStep1;

    it('get request 1', function(done) {
        server.get('/rest/manager/waitingrequests/'+request1._id, {}, function(res, body) {
            expect(res.statusCode).toEqual(200);
            expect(body.approvalSteps).toBeDefined();
            if (body.approvalSteps) {
                expect(body.approvalSteps.length).toEqual(1);
                approvalStep1 = body.approvalSteps[0];
            }
            done();
        });
    });


    it('accept request 1 approval step', function(done) {
        server.put('/rest/manager/waitingrequests/'+request1._id, {
            approvalStep: approvalStep1._id,
            action: 'wf_accept'
        }, function(res, body) {
            expect(res.statusCode).toEqual(200);
            var lastLog = body.requestLog[body.requestLog.length -1];
            expect(lastLog.action).toEqual('wf_end');
            done();
        });
    });



    it('logout', function(done) {
        server.get('/rest/logout', {}, function(res) {
            expect(res.statusCode).toEqual(200);
            done();
        });
    });


    // get a new author session

    it('Authenticate user account session', function(done) {
        expect(userAccount.user.roles.account).toBeDefined();
        server.authenticateAccount(userAccount).then(function() {
            done();
        });

    });


    it('delete a request', function(done) {
        server.delete('/rest/account/requests/'+request1._id, function(res, body) {
            expect(res.statusCode).toEqual(200);
            done();
        });
    });


    it('request list of current requests as account', function(done) {
        server.get('/rest/account/requests', {}, function(res, body) {
            expect(res.statusCode).toEqual(200);
            expect(body.length).toEqual(1);
            expect(body[0]).toBeDefined();
            if (body[0] && body[0].status) {
                expect(body[0].status.deleted).toEqual('waiting');
            }
            done();
        });
    });




    it('logout', function(done) {
        server.get('/rest/logout', {}, function(res) {
            expect(res.statusCode).toEqual(200);
            done();
        });
    });


    it('close the mock server', function(done) {
        server.close(done);
    });


});
