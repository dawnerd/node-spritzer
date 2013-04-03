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
    var self = this;

    var sprite = {
      output_css: path.normalize([this.options.output_dir, item.name].join('/') + '.css'),
      normal: path.normalize([this.options.output_dir, item.name].join('/') + '.png'),
      retina: path.normalize([this.options.output_dir, item.name].join('/') + '@2x.png')
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
            image_meta.w = image_meta.width;
            image_meta.h = image_meta.height;
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
            image_meta.w = image_meta.width;
            image_meta.h = image_meta.height;
            images.retina.push(image_meta);
            callback();
          });
        },
      ],
      function() {
        cb();
      });
    }, function() {
      images.normal.sort(Bind(self.sort, self));
      images.retina.sort(Bind(self.sort, self));

      var normal_pack = Package.fit(images.normal);
      var retina_pack = Package.fit(images.retina);

      // Non retina
      ImageMagick.composite({
        images: images.normal,
        filepath: sprite.normal,
        width: normal_pack.w,
        height: normal_pack.h
      });

      if(item.allowRetina) {
        // Retina
        ImageMagick.composite({
          images: images.retina,
          filepath: sprite.retina,
          width: retina_pack.w,
          height: retina_pack.h
        });
      }


      done();
    });

    //console.log(sprite);
    //done();
  };

  /**
   * Sorts images based on both height and width.
   */
  Spritzer.prototype.sort = function(a, b) {
    var diff = this.compare(Math.max(b.width, b.height), Math.max(a.width, a.height));
    if (diff === 0) {
      diff = this.compare(Math.min(b.width, b.height), Math.min(a.width, a.height));
    }
    if (diff === 0) {
      diff = this.compare(b.height, a.height);
    }
    if (diff === 0) {
      diff = this.compare(b.width, a.width);
    }
    return diff;
  };

  /**
   * Basic compare. Port of Array.sort()
   */
  Spritzer.prototype.compare = function(a, b) {
    if (a > b) {
      return 1;
    }
    if (b > a) {
      return -1;
    }
    return 0;
  };

  module.exports = Spritzer;
}());