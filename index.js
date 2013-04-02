/**
 * node-spritzer
 * A simple image spriter for nodejs
 * 
 * @author Troy Whiteley (@dawnerd)
 * @version 0.0.0
 * @license MIT
 * @url https://github.com/dawnerd/node-spritzer
 *
 * For documentation please refer to README.md
 */

(function(){
  var colors = require('colors');
  var async = require('async');
  var path = require('path');
  var Packer = require('./lib/packer');
  var ImageMagick = require('./lib/ImageMagick');
  var Bind = require('./lib/bind');

  // Get packer ready
  var Package = new Packer();

  /**
   * Spriter class
   * @param {Object} options Options
   */
  var Spritzer = function(options) {
    this.options = options || {};

    // Load json config
    if(!this.options.config) {
      console.error('Fail:'.bold.red, 'Please specify a config file.'.red);
      process.exit(1);
    }

    this.config = require(this.options.config);

    async.each(this.config, Bind(this.generateSprite, this));
  };

  /**
   * Generates a single sprite sheet
   * @param  {Object}   item A single sprite config item
   * @param  {Function} done Callback that has to be called once everything is done.
   */
  Spritzer.prototype.generateSprite = function(item, done) {
    var sprite = {
      output_css: path.normalize([this.options.output_dir, item.name].join('/') + '.css'),
      output_sprite: path.normalize([this.options.output_dir, item.name].join('/') + '.png')
    };

    console.log(sprite);
    done();
  };

  module.exports = Spritzer;
}());