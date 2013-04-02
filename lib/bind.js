/**
 * Binds a this to a set scope
 *
 * @author Troy Whiteley (@dawnerd)
 */

(function(){
  var Bind = function(callback, scope) {
    return function() {
      return callback.apply(scope, Array.prototype.slice.call(arguments));
    }
  };

  module.exports = Bind;
}());