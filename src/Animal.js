'use strict';
/**
 * Animal class - straight out of the zoo.
 * @class Animal
 * @constructor
 * @param {String} [name='Vuvu'] Name the animal.
 */
export class Animal {
    constructor(name='Vuvu') {
        this.name = name;

        /**
         * How many legs the animal does have?
         * @property legs
         * @type Integer
         * @default 4
         */
        this.legs = 4;

        /**
         * @property {Integer} eyes
         * @default 2
         */
        this.eyes = 2;

        /**
         * @property {Integer} noses
         * @default 1
         */
        this.noses = 1;

        /**
         * @property {Integer} ears
         * @default 2
         */
        this.ears = 2;

        /**
         * @property mouths
         * @type Integer
         * @default 1
         */
        this.mouths = 1;
    }

    /**
     * Animal growls.
     * @method growl
     */
    growl() {
        console.log(`I have #{this.legs} legs.`);
    }

    /**
     * Animal howls.
     * @method howl
     */
    howl() {
        console.log('Wooohooooo.');
    }

    /**
     * Animal stops.
     * @method stops
     */
    stops() {
        console.log('Animal stopped.');
    }

    /**
     * Animal cries.
     * @method cries
     */
    cries() {
        console.log('Criiieeeh');
    }
}
