(function () {
  var OOP = {};
  self.OOP = OOP;
  var isNumber = function (obj) {
    return !!(obj === 0 || (obj && obj.toExponential && obj.toFixed));
  };
  var breaker = {};
  var each = function (obj, iterator, context) {
    if (obj == null) return;
    if (Array.prototype.nativeForEach && obj.forEach === Array.prototype.nativeForEach) {
      obj.forEach(iterator, context);
    } else if (isNumber(obj.length)) {
      for (var i = 0, l = obj.length; i < l; i++) {
        if (breaker === iterator.call(context, obj[i], i, obj)) return;
      }
    } else {
      for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
          if (breaker === iterator.call(context, obj[key], key, obj)) return;
        }
      }
    }
  };
  var extend = function (obj) {
    each(Array.prototype.slice.call(arguments, 1), function (source) {
      for (var prop in source) obj[prop] = source[prop];
    });
    return obj;
  };
  OOP.Extend = extend;
  /**
   * 供继承使用
   */
  var ctor = function () {};
  /**
   * OOP继承
   */
  OOP.Class = function (parent, protoProps, staticProps) {
    var child;
    // 使用子类自定义构造函数，否则调用父类构造函数。
    if (protoProps && protoProps.hasOwnProperty('constructor')) {
      child = protoProps.constructor;
    } else {
      child = function () {
        return parent.apply(this, arguments);
      };
    }
    extend(child, parent);
    // 建立原型链时不调用父类构造函数。
    ctor.prototype = parent.prototype;
    child.prototype = new ctor();
    if (protoProps) extend(child.prototype, protoProps);
    if (staticProps) extend(child, staticProps);
    child.prototype.constructor = child;
    child.__super__ = parent.prototype;
    return child;
  };
})();

self.Class = OOP.Class;
self.Extend = OOP.Extend;
self.ObjectClass = function () {};
self.ObjectClass.prototype = {
  constructor: function () {},
  equals: function (that) {
    return this === that;
  },
};
