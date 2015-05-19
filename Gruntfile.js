'use strict';

module.exports = function(grunt) {

    // Project configuration.
    grunt.initConfig({
        jsdoc : {
            dist : {
                src: ['src/*.js'],
                options: {
                    destination: 'doc',
                    // template : 'node_modules/grunt-jsdoc/node_modules/ink-docstrap/template',
                    template : './node_modules/ts2jsdoc/template',
                    configure : 'config/jsdoc.conf.json'
                }
            }
        }
    });

    // Load the plugin that provides the "jsdoc" task.
    grunt.loadNpmTasks('grunt-jsdoc');

    // Default task(s).
    grunt.registerTask('default', ['jsdoc']);

};
