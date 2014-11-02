'use strict';








exports = module.exports = function(services, app) {
    
    var service = new services.delete(app);
    
    
    
    
    /**
     * Validate before delete
     * @param   {AccountCollection}  document mongoose document
     * @returns {Boolean}
     */
    function validate(document) {

        if (!document) {
            service.notFound(service.gt.gettext('this right does not exists or is not linked to account or collection'));
            return false;
        }

        return true;
    }
    
    
    
    
    /**
     * Call the beneficiaries delete service
     * 
     * @param {int} id      Document mongoose ID
     * @return {Promise}
     */
    service.call = function(id) {
        
        
        service.models.Beneficiary.findById(id, function (err, document) {
            if (service.handleMongoError(err)) {
                
                if (!validate(document)) {
                    return;
                }
                
                document.remove(function(err) {
                    if (service.handleMongoError(err)) {
                        
                        if ('User' === document.ref) {
                            service.success(service.gt.gettext('The right has been removed from user account'));
                        } else {
                            service.success(service.gt.gettext('The right has been removed from the collection'));
                        }
                        
                        var beneficiary = document.toObject();
                        beneficiary.$outcome = service.outcome;
                        
                        service.deferred.resolve(beneficiary);
                    }
                });
            }
        });
        
        return service.deferred.promise;
    };
    
    
    return service;
};
