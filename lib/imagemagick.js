var ImageMagick, async, exec, path;

exec = require('child_process').exec;

async = require('async');

path = require('path');

ImageMagick = (function() {

  function ImageMagick() {}

  ImageMagick.prototype.identify = function(filepath, callback) {
    return this.exec("identify " + filepath, function(error, stdout, stderr) {
      var dims, ext, filename, h, image, name, parts, w;
      if (error || stderr) {
        throw "Error in identify (" + filepath + "): " + (error || stderr);
      }
      parts = stdout.split(" ");
      dims = parts[2].split("x");
      w = parseInt(dims[0]);
      h = parseInt(dims[1]);
      ext = path.extname(filepath);
      name = path.basename(filepath, ext);
      filename = name + ext;
      image = {
        width: w,
        height: h,
        filename: filename,
        name: name,
        path: filepath
      };
      return callback(image);
    });
  };

  ImageMagick.prototype.composite = function(options, callback) {
    var command;
    var _this = this;

    var filepath = options.filepath;
    var images = options.images;
    var width = options.width;
    var height = options.height;
    var downsampling = options.downsampling;

    console.log('Writing images to sprite sheet...');
    command = "convert -size " + width + "x" + height + " canvas:transparent -alpha transparent " + filepath;
    return this.exec(command, function(error, stdout, stderr) {
      var compose;
      if (error || stderr) {
        throw "Error in creating canvas (" + filepath + "): " + (error || stderr);
      }
      compose = function(image, next) {
        console.log("Composing " + image.path);
        return _this.composeImage(filepath, image, downsampling, next);
      };
      return async.forEachSeries(images, compose, callback);
    });
  };

  ImageMagick.prototype.exec = function(command, callback) {
    return exec(command, callback);
  };

  ImageMagick.prototype.composeImage = function(filepath, image, downsampling, callback) {
    var command;
    command = "composite -geometry " + image.width + "x" + image.height + "+" + image.cssx + "+" + image.cssy;
    if (downsampling) {
      command += " -filter" + downsampling;
    }
    command += " " + image.path + " " + filepath + " " + filepath + ".tmp && mv " + filepath + ".tmp " + filepath;
    return exec(command, function(error, stdout, stderr) {
      if (error || stderr) {
        throw "Error in composite (" + filepath + "): " + (error || stderr);
      }
      return callback();
    });
  };

  return ImageMagick;

})();

module.exports = new ImageMagick();