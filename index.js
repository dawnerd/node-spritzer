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

    var images = {
      normal: [],
      retina: []
    }

    async.each(item.images, function(image, cb) {
      async.parallel([
        // Normal images
        function(callback) {
          if(!image.src) {
            console.error('Skipping empty image'.yellow);
            callback();
            return;
          }

          ImageMagick.identify(image.src, function(image_meta) {
            image_meta.selector = image.selector;
            images.normal.push(image_meta);
            callback();
          });
        },

        // Retina images
        function(callback) {
          if(!item.allowRetina) {
            callback();
            return;
          }

          if(!image.srcRetina) {
            console.error('Skipping empty image'.yellow);
            callback();
            return;
          }

          ImageMagick.identify(image.srcRetina, function(image_meta) {
            image_meta.selector = image.selector;
            images.retina.push(image_meta);
            callback();
          });
        },
      ],
      function() {
        
        
        cb();
      });
    }, function() {
      done();
    });

    //console.log(sprite);
    //done();
  };

  module.exports = Spritzer;
}());