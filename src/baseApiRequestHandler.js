//----------------------------------------------------------------------------------------------------------
var __class = require('node-class').class,
    ApiRequestReferrerInformation = rqr('modules/requestHandler/referrerInformation'),
    BaseRequestHandler = rqr('modules/requestHandler/baseRequestHandler'),
    chalk = require('chalk'),
    core = require('cr-api-core'),
    Response = rqr('app/models/response'),
    AccessMiddleWare = rqr('config/middlewares/accessMiddleWare');

//----------------------------------------------------------------------------------------------------------


/**
 * @class
 * @extends BaseRequestHandler
 */
var BaseApiRequestHandler = module.exports =  __class( "BaseApiRequestHandler",
/** @lends BaseApiRequestHandler */
{
    //------------------------------------------------------------------------------------------------------
    extends:['BaseRequestHandler'],
    //------------------------------------------------------------------------------------------------------

    /**
     * defines weather app and backend are allowed to use this route,
     * if accessed but not allowed for platform an error response will be sent
     */
    backendHasAccess:true,
    appHasAccess:true,

    /**
     * true if Backend needs user authentication
     */
    restrictBackendAccess: true, // TODO: change back to true

    /**
     * true if App needs session authentication
     */
    restrictAppAccess: true,

    /**
     * true if App session needs to be linked to a user
     */
    appUserRequired: false,

    /**
     * Instance of ApiRequestReferrerInformation containing the information about the referrer and
     * methods to access values
     */
    referrerInformation: null,

    /**
     * Specifies if a since date is needed on request.body.since,
     * handler is responding with error if true and since is missing
     */
    sinceValueIsMandatory: false,

    /**
     * since value as Date instance
     */
    since: new Date(0),

    /**
     * Backend User Roles that are permitted for this action
     */
    permittedRoles: ['super-admin', 'admin', 'editor'],

    /**
     * Default values to set relations to or use after authentication is handled
     */
    backendUser: null,
    appSession: null,
    brands: [],
    customers: [],

    /**
     * takes errors in form of strings that can occur despite sending a valid response (status 200)
     */
    errors: [],

    /**
     * Specifies if a customer or brand id is needed on request.body.filter,
     * handler is responding with error if true and customer / brand is missing
     */
    backendNeedsToSpecifyBrand: true,
    backendNeedsToSpecifyCustomer: false,

    /**
     * The date for putting in a response
     */
    responseTime: null,

    /**
     * sets the relationships that should be ignored when performing fetch requests
     */
    ignoreRelationShipsInFetches:[],
    //------------------------------------------------------------------------------------------------------


    /**
     * extended constructor / initializer method (automatically called)
     * @param req - the request object as delivered from express framework
     * @param res - the response object as delivered from express framework
     * @param [callback = undefined] - if this is a function ( function(err, res) )
     *                                 the performHandleRequest method will be called after setup using this
     *                                 callback
     */
    //------------------------------------------------------------------------------------------------------
    initialize: function( req, res, callback)
    //------------------------------------------------------------------------------------------------------
    {
        var opt = req.method === 'OPTIONS',
            url = req.url || '',
            //user = req.user,
            since = parseInt(req.param('since'), 10) || 0,
            noBackendTokenNeeded = !!url.match(
                /^\/users\/(login|register|forgetpassword|password-recovery)/);


        this.responseTime = new Date().getTime();

        this.__parent( req, res);

        if ( opt || noBackendTokenNeeded ) {
            this.restrictBackendAccess = false;
        }

        if ( this.sinceValueIsMandatory && ( typeof req.body.since !== 'number' ) ) {
            this.sendError(400, 'To give a since value is mandatory for this request' );
            return;
        }

        //if ( since !== null && core.stringUtil.stringIsEmpty(since) === false ) {
            this.since = new Date(since);
        //}

        this.setup();

        if ( typeof callback === 'function' ) {
            this.performHandleRequest(callback);
        }
    },

    /// SETTING UP

    //------------------------------------------------------------------------------------------------------
    setup: function()
    //------------------------------------------------------------------------------------------------------
    {
        var isMobileApp;
        this.parseReferrerInformation();
        isMobileApp = this.referrerInformation.isMobileApp() ||
            !core.stringUtil.stringIsEmpty(this.request.body.api_key) ||
            !core.stringUtil.stringIsEmpty(this.request.body.apiKey);

        if ( isMobileApp && !this.appHasAccess ) {
            this.sendError(401, 'This route can not be accessed by mobile app.');
            return;
        } else if ( !isMobileApp && !this.backendHasAccess ) {
            this.sendError(401, 'This route can not be accessed by editor tool.');
            return;
        }

        this.setupMiddleWares();
    },

    //------------------------------------------------------------------------------------------------------
    setupMiddleWares: function()
    //------------------------------------------------------------------------------------------------------
    {
        var isMobileApp;

        isMobileApp = this.referrerInformation.isMobileApp() ||
            !core.stringUtil.stringIsEmpty(this.request.body.api_key) ||
            !core.stringUtil.stringIsEmpty(this.request.body.apiKey);

        if ( isMobileApp ) {
            this.setupAppSessionPermissionCheck();
            if ( this.appUserRequired ) {
                this.setupAppUserPermissionCheck();
            }
        } else {
            this.setupBackendUserPermissionCheck();
        }
    },


    // ## RESPONSES

    /**
     * Send an error Response
     * @param responseCode - the code as delivered in the http status code
     * @param message - the error message
     * @param errorDomain - (optional) the error domain (default is the requested path)
     * @param errorCode - (optional) internal code for resolving the error on referrer side
     */
    //------------------------------------------------------------------------------------------------------
    sendError: function( responseCode, message, errorDomain, errorCode )
    //------------------------------------------------------------------------------------------------------
    {
        console.error(responseCode, message, errorDomain, errorCode);
        
        if ( this.responseIsSent === true ) { return; }
        var errorResponse = new Response(responseCode),
            code = errorCode || responseCode,
            domain = errorDomain || this.request.url;

        errorResponse.error = { domain: domain, code: code, message: message };

        this.responseIsSent = true;
        this.writeToResponse( responseCode, JSON.parse(errorResponse.getResponseString()));
    },

    /**
     * Convenience function for sending database error responses
     * @param err - the error as given from the database framework
     */
    //------------------------------------------------------------------------------------------------------
    sendDatabaseError: function( err)
    //------------------------------------------------------------------------------------------------------
    {
        console.trace(err);
        this.sendError(500, "Error in database handling.");
    },


    /**
     * called to send a normal response
     * @param code
     */
    //------------------------------------------------------------------------------------------------------
    sendResponse: function( code)
    //------------------------------------------------------------------------------------------------------
    {
        if ( this.responseIsSent === true ) { return; }
        var response = new Response( code), plainResponse, i, errorString;

        this.setResponseDataToResponse( response);

        plainResponse = this.makePlainResponseObject( response);

        if ( plainResponse === null || plainResponse === undefined ) {
            this.sendError("Fatal error in creating Response");
            return;
        }

        if ( plainResponse.response !== null ) {
            plainResponse.response = this.customizeResponseData( plainResponse.response);
        }

        if ( typeof this.responseTime === 'number') {
            plainResponse.date = this.responseTime;
        } else if ( this.responseTime instanceof Date ) {
            plainResponse.date = this.responseTime.getTime();
        }

        if ( this.errors.length > 0 ) {
            plainResponse.error = '';

            for( i = 0; i < this.errors.length; i++) {
                plainResponse.error += this.errors[i] + '\n';
            }

            plainResponse.error = plainResponse.error.trim();
        }

        plainResponse = this.customizeResponse(plainResponse);

        this.responseIsSent = true;
        this.writeToResponse( code, plainResponse);
    },


    //------------------------------------------------------------------------------------------------------
    writeToResponse: function( code, data)
    //------------------------------------------------------------------------------------------------------
    {
        this.response.status( code).json( data);
    },


    /**
     * To set the not parsed ( eg. ApiModel-Instances ) data to the response
     * @param response - Response class instance that will be returned
     */
    //------------------------------------------------------------------------------------------------------
    setResponseDataToResponse: function( response)
    //------------------------------------------------------------------------------------------------------
    {
    },


    /**
     * To alter / customize the plain response data override this method
     * @param data - the plan data as object that is to be altered
     * @return {Object | Array} - modified data
     */
    //------------------------------------------------------------------------------------------------------
    customizeResponseData: function( data)
    //------------------------------------------------------------------------------------------------------
    {
        return data;
    },


    /**
     * To alter / customize the plain response. override this method!
     * @param response - the plain response as object that is to be altered
     * @return {Object | Array} - modified data
     */
    //------------------------------------------------------------------------------------------------------
    customizeResponse: function( response)
    //------------------------------------------------------------------------------------------------------
    {
        return response;
    },


    // ## PARSING

    //------------------------------------------------------------------------------------------------------
    makePlainResponseObject: function( response)
    //------------------------------------------------------------------------------------------------------
    {
        return JSON.parse( response.getResponseString());
    },


    /**
     * Parses the request referrer information into on object that is stored on this.referrerInformation
     */
    //------------------------------------------------------------------------------------------------------
    parseReferrerInformation: function()
    //------------------------------------------------------------------------------------------------------
    {
        this.referrerInformation = new ApiRequestReferrerInformation(this.request);
    },


    // ## HELPER
    // TODO: remove this and use referrerInformation

    //------------------------------------------------------------------------------------------------------
    isMobileApp: function()
    //------------------------------------------------------------------------------------------------------
    {
        var isMobileApp;
        isMobileApp = this.referrerInformation.isMobileApp() ||
            !core.stringUtil.stringIsEmpty(this.request.body.api_key) ||
            !core.stringUtil.stringIsEmpty(this.request.body.apiKey);

        return isMobileApp;
    },


    // ## SETTING UP

    //------------------------------------------------------------------------------------------------------
    setupBackendUserPermissionCheck: function()
    //------------------------------------------------------------------------------------------------------
    {
        if ( this.restrictBackendAccess ) {
            this.useMiddleWare(this.backendPermissionMiddleWare);
        }

        this.useMiddleWare( this.filterCustomerAndBrandsMiddleWare);
    },


    //------------------------------------------------------------------------------------------------------
    setupAppSessionPermissionCheck: function()
    //------------------------------------------------------------------------------------------------------
    {
        if ( !this.restrictAppAccess ) { return; }

        this.useMiddleWare(this.appSessionPermissionMiddleWare);
    },


    //------------------------------------------------------------------------------------------------------
    setupAppUserPermissionCheck: function()
    //------------------------------------------------------------------------------------------------------
    {
        this.useMiddleWare(this.appUserPermissionCheckMiddleWare);
    },


    //## MIDDLE WARES

    /**
     * Check Backend permission to access this route or action
     */
    //------------------------------------------------------------------------------------------------------
    backendPermissionMiddleWare: function(req, res, next, handler)
    //------------------------------------------------------------------------------------------------------
    {
        var that = handler,
            userFetch = new core.ApiFetchRequest('BackendUser'),
            brandFetch = new core.ApiFetchRequest('Brand'),
            fetchQueue = new core.ApiFetchRequestQueue([userFetch, brandFetch]),
            user = that.referrerInformation.getAuthenticationKey();

        if ( user === null || user.email === null ) {
            return AccessMiddleWare.loginMiddleWare(req, res, next,{
                referrerInformation: handler.referrerInformation,
                restrictBackendAccess: handler.restrictBackendAccess,
                backendHasAccess: handler.backendHasAccess
            }, handler );
        }

        userFetch.where( '$self.email="'+user.email+'"');

        brandFetch.where( '$self.users.email="'+user.email+'"');

        brandFetch.setIgnoreRelations(['sessions']);

        fetchQueue.performRequests( function( err, result) {

            var backendUsers, brands;

            if ( err ) {
                that.sendError(500, 'Error in database handling');
            }

            backendUsers = result[userFetch.entityName];
            brands = result[brandFetch.entityName];

            if ( backendUsers.length < 1 ) {
                that.sendError(400, 'No user found for this key.');
                return;
            }

            if ( brands.length < 1 ) {
                that.sendError(400, 'No brand found for user.');
                return;
            }

            that.brands = brands;
            that.backendUser = backendUsers[0];

            AccessMiddleWare.loginMiddleWare(req, res, next, {
                referrerInformation: handler.referrerInformation,
                restrictBackendAccess: handler.restrictBackendAccess,
                backendHasAccess: handler.backendHasAccess
            });
        });
    },

    /**
     * Check Apps permission to access this route or action
     */
    //------------------------------------------------------------------------------------------------------
    appSessionPermissionMiddleWare: function(req, res, next, handler)
    //------------------------------------------------------------------------------------------------------
    {
        var that = handler,
            sessionFetch = new core.ApiFetchRequest('Session'),
            brandFetch = new core.ApiFetchRequest('Brand'),
            fetchQueue = new core.ApiFetchRequestQueue([sessionFetch, brandFetch]),
            apiKey = that.referrerInformation.getAuthenticationKey();

        if ( apiKey === null ) {
            that.sendError(401, 'No API key submitted.');
            return;
        }

        sessionFetch.where( '$self.apiKey="'+apiKey+'"');

        sessionFetch.setIgnoreRelations(['ugcObjects', 'likes']);

        brandFetch.where( '$self.sessions.apiKey="'+apiKey+'"');

        brandFetch.setIgnoreRelations(['sessions']);

        fetchQueue.performRequests( function( err, result) {

            var sessions, brands;

            if ( err ) {
                that.sendError(500, 'Error in database handling.');
            }

            sessions = fetchQueue.resultForRequest( sessionFetch);
            brands = fetchQueue.resultForRequest( brandFetch);

            if ( sessions.length < 1 ) {
                that.sendError(401, 'No user session found for this API key.');
                return;
            }

            if ( brands.length < 1 ) {
                that.sendError(401, 'No brand found for API key.');
                return;
            }

            that.brands = brands;
            that.appSession = sessions[0];

            next();
        });
    },


    //------------------------------------------------------------------------------------------------------
    appUserPermissionCheckMiddleWare: function(req, res, next, handler)
    //------------------------------------------------------------------------------------------------------
    {
        if (handler.appSession.getUser() === null) {
            return handler.sendError(403, 'You need to register to do this.');
        }

        next();
    },


    /**
     * Resolving the requests filter parameter and fetching its values if needed,
     * also handling missing parameters in request
     */
    //------------------------------------------------------------------------------------------------------
    filterCustomerAndBrandsMiddleWare: function(req, res, next, handler)
    //------------------------------------------------------------------------------------------------------
    {
        var filter = req.body.filter || null,
            brandId, customerId, brand, customer,
            brandFetch,
            customerFetch,
            fetchQueue = new core.ApiFetchRequestQueue();

        if ( ! handler.backendNeedsToSpecifyCustomer && ! handler.backendNeedsToSpecifyBrand ) {
            next();
            return;
        }

        // If a brand is specified, customer id can be ignored, because it comes with the brand
        if ( handler.backendNeedsToSpecifyBrand ) { handler.backendNeedsToSpecifyCustomer = false; }

        if ( filter === null &&
            ( handler.backendNeedsToSpecifyBrand || handler.backendNeedsToSpecifyCustomer ) )
        {
            handler.sendError(400, 'No filter set but needed for this request.');
            return;
        }

        brandId = filter.brand || null;
        customerId = filter.customer || null;

        if ( handler.backendNeedsToSpecifyBrand  ) {
            if (brandId === null) {
                handler.sendError(400, 'No brand id specified on filter.brand.');
                return;
            }

            brand = core.ApiModel.findIdInArray( brandId, handler.brands);
            if ( brand !== null ) {
                handler.brands = [ brand ];
            } else {
                brandFetch = new core.ApiFetchRequest('Brand').fetchId(brandId);
                brandFetch.setIgnoreRelations(['sessions']);
                fetchQueue.addRequest( brandFetch);
            }
        }

        if ( handler.backendNeedsToSpecifyCustomer ) {
            if (customerId === null) {
                handler.sendError(400, 'No customer id specified on filter.customer.');
                return;
            }

            customer = core.ApiModel.findIdInArray( customerId, handler.customers);
            if ( customer !== null ) {
                handler.customers = [ customer ];
            } else {
                customerFetch = new core.ApiFetchRequest('Customer').fetchId(customerId);
                fetchQueue.addRequest( customerFetch);
            }
        }

        if ( fetchQueue.requests.length <= 0 ) {
            next();
            return;
        }

        fetchQueue.performRequests( function(err, result){
            var brands, customers;

            if ( err ) {
                handler.sendDatabaseError(err);
                return;
            }

            brands = fetchQueue.resultForRequest( brandFetch);

            customers = fetchQueue.resultForRequest( customerFetch);

            if ( handler.backendNeedsToSpecifyBrand ) {
                if ( brands.length <= 0 ) {
                    handler.sendError(400, 'Brand not found for id '+brandId);
                    return;
                }
                handler.brands = brands;
            }

            if ( handler.backendNeedsToSpecifyCustomer ) {
                if ( customers.length <= 0 ) {
                    handler.sendError(400, 'Customer not found for id '+customerId);
                    return;
                }
                handler.customers = customers;
            }

            next();
        });
    },


    /**
     * Overridden
     */
    //------------------------------------------------------------------------------------------------------
    handleRequest: function( callback)
    //------------------------------------------------------------------------------------------------------
    {
        this.sendResponse( 200);
        //this.__parent( callback);
    }
});

