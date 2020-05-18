(function() {
	var OOP = {};
	window.OOP = OOP;
	var isNumber = function(obj) {
		return !!(obj === 0 || (obj && obj.toExponential && obj.toFixed));
	};
	var breaker = {};
	var each = function(obj, iterator, context) {
		if (obj == null)
			return;
		if (Array.prototype.nativeForEach
				&& obj.forEach === Array.prototype.nativeForEach) {
			obj.forEach(iterator, context);
		} else if (isNumber(obj.length)) {
			for ( var i = 0, l = obj.length; i < l; i++) {
				if (breaker === iterator.call(context, obj[i], i, obj))
					return;
			}
		} else {
			for ( var key in obj) {
				if (obj.hasOwnProperty(key)) {
					if (breaker === iterator.call(context, obj[key], key, obj))
						return;
				}
			}
		}
	};
	var extend = function(obj) {
		each(Array.prototype.slice.call(arguments, 1), function(source) {
			for ( var prop in source)
				obj[prop] = source[prop];
		});
		return obj;
	};
	OOP.Extend=extend;
	/**
	 * 供继承使用
	 */
	var ctor = function() {
	};
	/**
	 * OOP继承
	 */
	OOP.Class = function(parent, protoProps, staticProps) {
		var child;
		// The constructor function for the new subclass is either defined by
		// you
		// (the "constructor" property in your `extend` definition), or
		// defaulted
		if (protoProps && protoProps.hasOwnProperty('constructor')) {
			child = protoProps.constructor;
		} else {
			child = function() {
				return parent.apply(this, arguments);
			};
		}
		// Inherit class (static) properties from parent.
		extend(child, parent);
		// Set the prototype chain to inherit from `parent`, without calling
		// `parent`'s constructor function.
		ctor.prototype = parent.prototype;
		child.prototype = new ctor();
		// Add prototype properties (instance properties) to the subclass,
		// if supplied.
		if (protoProps)
			extend(child.prototype, protoProps);
		// Add static properties to the constructor function, if supplied.
		if (staticProps)
			extend(child, staticProps);
		// Correctly set child's `prototype.constructor`.
		child.prototype.constructor = child;
		// Set a convenience property in case the parent's prototype is needed
		// later.
		child.__super__ = parent.prototype;
		return child;
	};

})();

window.Class = OOP.Class;
window.Extend=OOP.Extend;
window.ObjectClass = function() {
};
window.ObjectClass.prototype = {
	constructor : function() {
	},
	equals : function(that) {
		return this === that;
	}
};

// Object is a original function. var a=new Object();

// var SubClass=Class(Class,protoProps,staticProps);
