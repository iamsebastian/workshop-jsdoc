var __class = require('node-class').class,
    chalk = require('chalk');

/**
 * @class
 */
var BaseRequestHandler = module.exports = __class('BaseRequestHandler',
// TODO TOREAD: r.habermann
// this @lends needs to placed directly one line before the object literal,
// like you can see one line below. Otherwise, jsdoc can not inherhit the properties
// of the class as members of the class.
/** @lends BaseRequestHandler */
{

    /**
     * the request as delivered from express framework
     * @type {http.clientRequest}
     * @see {@link https://nodejs.org/api/http.html#http_class_http_clientrequest}
     */
    request: null,

    /**
     * the response as delivered from express framework
     * @type {http.serverResponse}
     */
    response: null,

    /**
     * functions of type function(req, res, next, handler) that will be called as middle wares
     * @type {Array}
     */
    middleWares: [],

    /**
     * If true no further handling will be done because the response is already sent
     * @type {Bool}
     */
    responseIsSent: false,
    //------------------------------------------------------------------------------------------------------


    //------------------------------------------------------------------------------------------------------
    /**
     * @constructs
     * @param req Object Node's request object.
     * @param res Object Node's response object.
     */
    initialize: function( req, res) {
        this.request = req;
        this.response = res;
    },


    /**
     * @memberof
     * Log from this prototype.
     */
    log: function log() {

        console.log.call(console, timeStamp(), chalk.blue(this.$class), chalk.green(Array.prototype.slice.call(arguments)));

    },


    logError: function logError() {

        console.error.call(console, timeStamp(), chalk.red(this.$class), chalk.yellow(Array.prototype.slice.call(arguments)));

    },


    logWarn: function logWarn() {

        console.warn.call(console, timeStamp(), chalk.yellow(this.$class), chalk.white(Array.prototype.slice.call(arguments)));

    },


    /**
     * Add middle ware
     *
     * @param middleWare - function to be called before handler function.
     *                     ( function( req, res, next, handler))
     */
    //------------------------------------------------------------------------------------------------------
    useMiddleWare: function( middleWare)
    //------------------------------------------------------------------------------------------------------
    {
        if ( typeof middleWare !== 'function' ) { return; }
        this.middleWares.push( middleWare);
    },


    /**
     * To be called from outside (user of class) when setup is finished
     *
     * @param callback - callback that should be called when handling is done
     *                  ( function( req, res, handler) )
     */
    //------------------------------------------------------------------------------------------------------
    performHandleRequest: function( callback)
    //------------------------------------------------------------------------------------------------------
    {
        var that = this, /*startProcess = -1, endProcess = 0, currentMiddleWareName = null,*/

            middleWares = [].concat(this.middleWares), name,

            next = function() {

                /*if ( startProcess > 0 && typeof currentMiddleWareName === 'string') {
                    endProcess = (new Date()).getTime();
                    console.log('Process duration ('+currentMiddleWareName+'):' + (endProcess - startProcess));
                    startProcess = -1;
                }*/

                if ( that.responseIsSent ) {
                    console.log("Response has already been sent in "+that.$class);
                    return;
                }
                var middleWare;

                if ( middleWares.length < 1 ) {
                    if ( typeof callback === 'function' ) {
                        that.handleRequest(callback);
                    }
                    return;
                }

                middleWare = middleWares.splice(0,1)[0];

                if ( typeof middleWare !== 'function' ) {
                    next();
                    return;
                }

                /*currentMiddleWareName = middleWare.toString();

                startProcess = (new Date()).getTime();*/

                /*
                Log middleware name -----------------------------------
                 */

                name = 'unknwon';

                for(name in that.__proto__) {
                    if ( that.__proto__.hasOwnProperty(name) ) {
                        if ( that.__proto__[name] === middleWare ) {
                            break;
                        }
                    }
                }

                console.log('middleware: '+name);

                /*
                 End log middleware name ------------------------------
                 */

                middleWare( that.request, that.response, next, that);
            }
        ;
        next();
    },


    /**
     * To be overridden by inheriting classes
     *
     * @param callback - callback that should be called when handling is done
     *                  ( function( req, res, handler) )
     */
    //------------------------------------------------------------------------------------------------------
    handleRequest: function( callback)
    //------------------------------------------------------------------------------------------------------
    {
        if ( typeof callback === 'function' ) {
            callback(this.request, this.response, this);
        } else {
            console.log('WARNING: unhandled response');
        }
    }
});


