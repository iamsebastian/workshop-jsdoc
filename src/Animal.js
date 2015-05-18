'use strict';
/**
 * Animal class - straight out of the zoo.
 * @class Animal
 * @this Animal
 * @property {Integer} Animal.legs Count of legs.
 * @property {Function} Animal.howl Howling - see {@link Animal~howl}
 */
export class Animal /** lends Animal.prototype */ {
    /**
     * @constructor
     */
    constructor() /** lends Animal */ {
        this.legs = 4;
        /**
         * @member {Integer} Animal#eyes Count of eyes.
         */
        this.eyes = 2;

        /**
         * @member {Integer}
         */
        this.noses = 1;

        /**
         * @property {Integer} Animal.ears Animals ears.
         */
        this.ears = 2;

        /**
         * @name Animal.mouths
         * @type {Integer}
         */
        this.mouths = 1;
    }

    /**
     * Animal growls.
     * @method Animal~growl
     */
    growl() {
        console.log(`I have #{this.legs} legs.`);
    }

    /**
     * Animal howls.
     * @memberof Animal
     * @method ~howl
     */
    howl() {
        console.log('Wooohooooo.');
    }

    /**
     * Animal stops.
     */
    stops() {
        console.log('Animal stopped.');
    }

    /**
     * Animal cries.
     * @memberof Animal
     * @method cries
     */
    cries() {
        console.log('Criiieeeh');
    }
}
