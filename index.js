/**
 * node-spritzer
 * A simple image spriter for nodejs
 * 
 * @author Troy Whiteley (@dawnerd)
 * @version 0.4.2
 * @license MIT
 * @url https://github.com/dawnerd/node-spritzer
 *
 * For documentation please refer to README.md
 */

(function(){
  var colors = require('colors');
  var async = require('async');
  var path = require('path');
  var fs = require('fs');
  var Packer = require('./lib/packer');
  var ImageMagick = require('./lib/imagemagick');
  var Bind = require('./lib/bind');

  // Get packer ready
  var Package = new Packer();

  /**
   * Spriter class
   * @param {Object} options Options
   */
  var Spritzer = function(options, finished) {
    this.options = options || {};

    // Load json config
    if(!this.options.config) {
      console.error('Fail:'.bold.red, 'Please specify a config file.'.red);
      process.exit(1);
    }

    if(!this.options.basePath) this.options.basePath = '';

    this.config = require(this.options.config);

    async.each(this.config, Bind(this.generateSprite, this), finished);
  };

  /**
   * Generates a single sprite sheet
   * @param  {Object}   item A single sprite config item
   * @param  {Function} done Callback that has to be called once everything is done.
   */
  Spritzer.prototype.generateSprite = function(item, done) {
    var self = this;

    var rand = +new Date();

    var sprite = {
      output_css: path.normalize([this.options.basePath, this.options.output_dir, item.name].join('/') + '.css'),
      normal: path.normalize([this.options.basePath, this.options.output_dir, item.name].join('/') + rand + '.png'),
      normal_css: path.normalize([this.options.output_dir, item.name].join('/') + rand +  '.png'),
      retina: path.normalize([this.options.basePath, this.options.output_dir, item.name].join('/') + rand + '@2x.png'),
      retina_css: path.normalize([this.options.output_dir, item.name].join('/') + rand + '@2x.png')
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
        width: normal_pack.width,
        height: normal_pack.height
      });

      if(item.allowRetina) {
        // Retina
        ImageMagick.composite({
          images: images.retina,
          filepath: sprite.retina,
          width: retina_pack.width,
          height: retina_pack.height
        });
      }

      var css = self.generateStyles({
        images: images,
        sprite: sprite,
        normal_pack: normal_pack,
        retina_pack: retina_pack
      });

      fs.writeFile(sprite.output_css, css, function (err) {
        if (err) {
          console.error(err + "".bold.red);
        } else {
          console.log('Generated: '.bold.green, sprite.output_css.green);
        }
        done();
      });
    });

  };

  /**
   * Generates css for each sprite
   */
  Spritzer.prototype.generateStyles = function(options) {
    var images = options.images;
    var sprite = options.sprite;
    var normal = options.normal_pack;
    var retina = options.retina_pack;

    var output = [];

    for(var i = 0, c = images.normal.length, image; i < c; i++) {
      image = images.normal[i];

      output.push(image.selector + " {");
      output.push("  background-image: url(" + sprite.normal_css + ");");
      output.push("  background-size: " + normal.width + "px " + normal.height + "px;");
      output.push("  background-position: " + image.x * -1 + "px " + image.y * -1 + "px;");
      output.push("  height: " + image.h + "px;");
      output.push("  width: " + image.w + "px;");
      output.push("}");
    }

    if(images.retina.length) {
      output.push("@media (min--moz-device-pixel-ratio: 2), (-o-min-device-pixel-ratio: 2/1), (-webkit-min-device-pixel-ratio: 2), (min-device-pixel-ratio: 2) {");
      for(var i = 0, c = images.retina.length, image; i < c; i++) {
        image = images.retina[i];

        output.push("  " + image.selector + " {");
        output.push("    background-image: url(" + sprite.retina_css + ");");
        output.push("    background-size: " + normal.width * -1 / 2 + "px " + normal.height *-1 / 2 + "px;");
        output.push("    background-position: " + image.x / 2 + "px " + image.y / 2 + "px;");
        output.push("    height: " + image.height / 2 + "px;");
        output.push("    width: " + image.width / 2 + "px;");
        output.push("  }");
      }
      output.push("}");
    }

    return output.join("\n");
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