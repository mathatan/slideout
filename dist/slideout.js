!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.Slideout=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

/**
 * Module dependencies
 */
var decouple = require('decouple');
var Emitter = require('emitter');

/**
 * Privates
 */
var scrollTimeout;
var scrolling = false;
var doc = window.document;
var html = doc.documentElement;
var msPointerSupported = window.navigator.msPointerEnabled;
var touch = {
  'start': msPointerSupported ? 'MSPointerDown' : 'touchstart',
  'move': msPointerSupported ? 'MSPointerMove' : 'touchmove',
  'end': msPointerSupported ? 'MSPointerUp' : 'touchend'
};
var prefix = (function prefix() {
  var regex = /^(Webkit|Khtml|Moz|ms|O)(?=[A-Z])/;
  var styleDeclaration = doc.getElementsByTagName('script')[0].style;
  for (var prop in styleDeclaration) {
    if (regex.test(prop)) {
      return '-' + prop.match(regex)[0].toLowerCase() + '-';
    }
  }
  // Nothing found so far? Webkit does not enumerate over the CSS properties of the style object.
  // However (prop in style) returns the correct value, so we'll have to test for
  // the precence of a specific property
  if ('WebkitOpacity' in styleDeclaration) { return '-webkit-'; }
  if ('KhtmlOpacity' in styleDeclaration) { return '-khtml-'; }
  return '';
}());
function extend(destination, from) {
  for (var prop in from) {
    if (from[prop]) {
      destination[prop] = from[prop];
    }
  }
  return destination;
}
function inherits(child, uber) {
  child.prototype = extend(child.prototype || {}, uber.prototype);
}

/**
 * Slideout constructor
 */
function Slideout(options) {
  options = options || {};

  // Sets default values
  this._startOffsetX = 0;
  this._currentOffsetX = 0;
  this._opening = false;
  this._moved = false;
  this._opened = false;
  this._preventOpen = false;
  this._touch = options.touch === undefined ? true : options.touch && true;
  this._class = options.class === undefined ? undefined : options.class;


  // Sets panel
  this.panel = options.panel;
  this.menu = options.menu;

  // Sets  classnames
  if(this.panel.className.search('slideout-panel') === -1) { this.panel.className += ' slideout-panel'; }
  if(this.menu.className.search('slideout-menu') === -1) { this.menu.className += ' slideout-menu'; }


  // Sets options
  this._fx = options.fx || 'ease';
  this._duration = parseInt(options.duration, 10) || 300;
  this._tolerance = parseInt(options.tolerance, 10) || 70;
  this._padding = this._translateTo = parseInt(options.padding, 10) || 256;
  this._orientation = options.side === 'right' ? -1 : 1;
  this._translateTo *= this._orientation;

  // Init touch events
  if (this._touch) {
    this._initTouchEvents();
  }
}

/**
 * Inherits from Emitter
 */
inherits(Slideout, Emitter);

/**
 * Opens the slideout menu.
 */
Slideout.prototype.open = function() {
  var self = this;
  this.emit('beforeopen');
  if (html.className.search('slideout-open') === -1) { html.className += ' slideout-open'; }
  if (this._class && html.className.search('slideout-' + this._class) === -1) { html.className += (' slideout-' + this._class); }
  this._setTransition();
  this._translateXTo(this._translateTo);
  this._opened = true;
  setTimeout(function() {
    self.panel.style.transition = self.panel.style['-webkit-transition'] = '';
    self.emit('open');
  }, this._duration + 50);
  return this;
};

/**
 * Closes slideout menu.
 */
Slideout.prototype.close = function() {
  var self = this;
  if (!this.isOpen() && !this._opening) {
    return this;
  }
  this.emit('beforeclose');
  this._setTransition();
  this._translateXTo(0);
  this._opened = false;
  setTimeout(function() {
    html.className = html.className.replace(/ slideout-open/, '');
    html.className = html.className.replace(' slideout-' + self._class, '');
    self.panel.style.transition = self.panel.style['-webkit-transition'] = self.panel.style[prefix + 'transform'] = self.panel.style.transform = '';
    self.emit('close');
  }, this._duration + 50);
  return this;
};

/**
 * Toggles (open/close) slideout menu.
 */
Slideout.prototype.toggle = function() {
  return this.isOpen() ? this.close() : this.open();
};

/**
 * Returns true if the slideout is currently open, and false if it is closed.
 */
Slideout.prototype.isOpen = function() {
  return this._opened;
};

/**
 * Translates panel and updates currentOffset with a given X point
 */
Slideout.prototype._translateXTo = function(translateX) {
  this._currentOffsetX = translateX;
  this.panel.style[prefix + 'transform'] = this.panel.style.transform = 'translateX(' + translateX + 'px)';
  return this;
};

/**
 * Set transition properties
 */
Slideout.prototype._setTransition = function() {
  this.panel.style[prefix + 'transition'] = this.panel.style.transition = prefix + 'transform ' + this._duration + 'ms ' + this._fx;
  return this;
};

/**
 * Initializes touch event
 */
Slideout.prototype._initTouchEvents = function() {
  var self = this;

  /**
   * Decouple scroll event
   */
  this._onScrollFn = decouple(doc, 'scroll', function() {
    if (!self._moved) {
      clearTimeout(scrollTimeout);
      scrolling = true;
      scrollTimeout = setTimeout(function() {
        scrolling = false;
      }, 250);
    }
  });

  /**
   * Prevents touchmove event if slideout is moving
   */
  this._preventMove = function(eve) {
    if (self._moved) {
      eve.preventDefault();
    }
  };

  doc.addEventListener(touch.move, this._preventMove);

  /**
   * Resets values on touchstart
   */
  this._resetTouchFn = function(eve) {
    if (typeof eve.touches === 'undefined') {
      return;
    }

    self._moved = false;
    self._opening = false;
    self._startOffsetX = eve.touches[0].pageX;
    self._preventOpen = (!self._touch || (!self.isOpen() && self.menu.clientWidth !== 0));
  };

  this.panel.addEventListener(touch.start, this._resetTouchFn);

  /**
   * Resets values on touchcancel
   */
  this._onTouchCancelFn = function() {
    self._moved = false;
    self._opening = false;
  };

  this.panel.addEventListener('touchcancel', this._onTouchCancelFn);

  /**
   * Toggles slideout on touchend
   */
  this._onTouchEndFn = function() {
    if (self._moved) {
      self.emit('translateend');
      (self._opening && Math.abs(self._currentOffsetX) > self._tolerance) ? self.open() : self.close();
    }
    self._moved = false;
  };

  this.panel.addEventListener(touch.end, this._onTouchEndFn);

  /**
   * Translates panel on touchmove
   */
  this._onTouchMoveFn = function(eve) {

    if (scrolling || self._preventOpen || typeof eve.touches === 'undefined') {
      return;
    }

    var dif_x = eve.touches[0].clientX - self._startOffsetX;
    var translateX = self._currentOffsetX = dif_x;

    if (Math.abs(translateX) > self._padding) {
      return;
    }

    if (Math.abs(dif_x) > 20 && (html.className.search('slideout-open') === -1 || self._class && html.className.search('slideout-' + self._class) !== -1 || !self._class)) {

      self._opening = true;

      var oriented_dif_x = dif_x * self._orientation;

      if (self._opened && oriented_dif_x > 0 || !self._opened && oriented_dif_x < 0) {
        return;
      }

      if (!self._moved) {
        self.emit('translatestart');
      }

      if (oriented_dif_x <= 0) {
        translateX = dif_x + self._padding * self._orientation;
        self._opening = false;
      }

      if (!self._moved && html.className.search('slideout-open') === -1) {
        html.className += ' slideout-open';
      }

      if (!self._moved && self._class && html.className.search('slideout-' + self._class) === -1) {
          html.className += (' slideout-' + self._class);
      }

      self.panel.style[prefix + 'transform'] = self.panel.style.transform = 'translateX(' + translateX + 'px)';
      self.emit('translate', translateX);
      self._moved = true;
    }

  };

  this.panel.addEventListener(touch.move, this._onTouchMoveFn);

  return this;
};

/**
 * Enable opening the slideout via touch events.
 */
Slideout.prototype.enableTouch = function() {
  this._touch = true;
  this._preventOpen = undefined;
  return this;
};

/**
 * Disable opening the slideout via touch events.
 */
Slideout.prototype.disableTouch = function() {
  this._touch = false;
  this._preventOpen = true;
  return this;
};

/**
 * Destroy an instance of slideout.
 */
Slideout.prototype.destroy = function() {
  // Close before clean
  this.close();

  if(this.panel && this.panel.className.search('slideout-panel') !== -1) { this.panel.classList.remove('slideout-panel'); }
  if(this.menu && this.menu.className.search('slideout-menu') !== -1) { this.menu.classList.remove('slideout-menu'); }

  // Remove event listeners
  doc.removeEventListener(touch.move, this._preventMove);
  this.panel.removeEventListener(touch.start, this._resetTouchFn);
  this.panel.removeEventListener('touchcancel', this._onTouchCancelFn);
  this.panel.removeEventListener(touch.end, this._onTouchEndFn);
  this.panel.removeEventListener(touch.move, this._onTouchMoveFn);
  doc.removeEventListener('scroll', this._onScrollFn);

  // Remove methods
  this.open = this.close = function () {};

  // Remove HTML elements
  this.panel = this.menu = undefined;

  // Return the instance so it can be easily dereferenced
  return this;
};

/**
 * Expose Slideout
 */
module.exports = Slideout;

},{"decouple":2,"emitter":3}],2:[function(require,module,exports){
'use strict';

var requestAnimFrame = (function() {
  return window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    function (callback) {
      window.setTimeout(callback, 1000 / 60);
    };
}());

function decouple(node, event, fn) {
  var eve,
      tracking = false;

  function captureEvent(e) {
    eve = e;
    track();
  }

  function track() {
    if (!tracking) {
      requestAnimFrame(update);
      tracking = true;
    }
  }

  function update() {
    fn.call(node, eve);
    tracking = false;
  }

  node.addEventListener(event, captureEvent, false);

  return captureEvent;
}

/**
 * Expose decouple
 */
module.exports = decouple;

},{}],3:[function(require,module,exports){
"use strict";

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

exports.__esModule = true;
/**
 * Creates a new instance of Emitter.
 * @class
 * @returns {Object} Returns a new instance of Emitter.
 * @example
 * // Creates a new instance of Emitter.
 * var Emitter = require('emitter');
 *
 * var emitter = new Emitter();
 */

var Emitter = (function () {
  function Emitter() {
    _classCallCheck(this, Emitter);
  }

  /**
   * Adds a listener to the collection for the specified event.
   * @memberof! Emitter.prototype
   * @function
   * @param {String} event - The event name.
   * @param {Function} listener - A listener function to add.
   * @returns {Object} Returns an instance of Emitter.
   * @example
   * // Add an event listener to "foo" event.
   * emitter.on('foo', listener);
   */

  Emitter.prototype.on = function on(event, listener) {
    // Use the current collection or create it.
    this._eventCollection = this._eventCollection || {};

    // Use the current collection of an event or create it.
    this._eventCollection[event] = this._eventCollection[event] || [];

    // Appends the listener into the collection of the given event
    this._eventCollection[event].push(listener);

    return this;
  };

  /**
   * Adds a listener to the collection for the specified event that will be called only once.
   * @memberof! Emitter.prototype
   * @function
   * @param {String} event - The event name.
   * @param {Function} listener - A listener function to add.
   * @returns {Object} Returns an instance of Emitter.
   * @example
   * // Will add an event handler to "foo" event once.
   * emitter.once('foo', listener);
   */

  Emitter.prototype.once = function once(event, listener) {
    var self = this;

    function fn() {
      self.off(event, fn);
      listener.apply(this, arguments);
    }

    fn.listener = listener;

    this.on(event, fn);

    return this;
  };

  /**
   * Removes a listener from the collection for the specified event.
   * @memberof! Emitter.prototype
   * @function
   * @param {String} event - The event name.
   * @param {Function} listener - A listener function to remove.
   * @returns {Object} Returns an instance of Emitter.
   * @example
   * // Remove a given listener.
   * emitter.off('foo', listener);
   */

  Emitter.prototype.off = function off(event, listener) {

    var listeners = undefined;

    // Defines listeners value.
    if (!this._eventCollection || !(listeners = this._eventCollection[event])) {
      return this;
    }

    listeners.forEach(function (fn, i) {
      if (fn === listener || fn.listener === listener) {
        // Removes the given listener.
        listeners.splice(i, 1);
      }
    });

    // Removes an empty event collection.
    if (listeners.length === 0) {
      delete this._eventCollection[event];
    }

    return this;
  };

  /**
   * Execute each item in the listener collection in order with the specified data.
   * @memberof! Emitter.prototype
   * @function
   * @param {String} event - The name of the event you want to emit.
   * @param {...Object} data - Data to pass to the listeners.
   * @returns {Object} Returns an instance of Emitter.
   * @example
   * // Emits the "foo" event with 'param1' and 'param2' as arguments.
   * emitter.emit('foo', 'param1', 'param2');
   */

  Emitter.prototype.emit = function emit(event) {
    var _this = this;

    for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
      args[_key - 1] = arguments[_key];
    }

    var listeners = undefined;

    // Defines listeners value.
    if (!this._eventCollection || !(listeners = this._eventCollection[event])) {
      return this;
    }

    // Clone listeners
    listeners = listeners.slice(0);

    listeners.forEach(function (fn) {
      return fn.apply(_this, args);
    });

    return this;
  };

  return Emitter;
})();

/**
 * Exports Emitter
 */
exports["default"] = Emitter;
module.exports = exports["default"];
},{}]},{},[1])(1)
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJpbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9kZWNvdXBsZS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9lbWl0dGVyL2Rpc3QvaW5kZXguanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIE1vZHVsZSBkZXBlbmRlbmNpZXNcbiAqL1xudmFyIGRlY291cGxlID0gcmVxdWlyZSgnZGVjb3VwbGUnKTtcbnZhciBFbWl0dGVyID0gcmVxdWlyZSgnZW1pdHRlcicpO1xuXG4vKipcbiAqIFByaXZhdGVzXG4gKi9cbnZhciBzY3JvbGxUaW1lb3V0O1xudmFyIHNjcm9sbGluZyA9IGZhbHNlO1xudmFyIGRvYyA9IHdpbmRvdy5kb2N1bWVudDtcbnZhciBodG1sID0gZG9jLmRvY3VtZW50RWxlbWVudDtcbnZhciBtc1BvaW50ZXJTdXBwb3J0ZWQgPSB3aW5kb3cubmF2aWdhdG9yLm1zUG9pbnRlckVuYWJsZWQ7XG52YXIgdG91Y2ggPSB7XG4gICdzdGFydCc6IG1zUG9pbnRlclN1cHBvcnRlZCA/ICdNU1BvaW50ZXJEb3duJyA6ICd0b3VjaHN0YXJ0JyxcbiAgJ21vdmUnOiBtc1BvaW50ZXJTdXBwb3J0ZWQgPyAnTVNQb2ludGVyTW92ZScgOiAndG91Y2htb3ZlJyxcbiAgJ2VuZCc6IG1zUG9pbnRlclN1cHBvcnRlZCA/ICdNU1BvaW50ZXJVcCcgOiAndG91Y2hlbmQnXG59O1xudmFyIHByZWZpeCA9IChmdW5jdGlvbiBwcmVmaXgoKSB7XG4gIHZhciByZWdleCA9IC9eKFdlYmtpdHxLaHRtbHxNb3p8bXN8TykoPz1bQS1aXSkvO1xuICB2YXIgc3R5bGVEZWNsYXJhdGlvbiA9IGRvYy5nZXRFbGVtZW50c0J5VGFnTmFtZSgnc2NyaXB0JylbMF0uc3R5bGU7XG4gIGZvciAodmFyIHByb3AgaW4gc3R5bGVEZWNsYXJhdGlvbikge1xuICAgIGlmIChyZWdleC50ZXN0KHByb3ApKSB7XG4gICAgICByZXR1cm4gJy0nICsgcHJvcC5tYXRjaChyZWdleClbMF0udG9Mb3dlckNhc2UoKSArICctJztcbiAgICB9XG4gIH1cbiAgLy8gTm90aGluZyBmb3VuZCBzbyBmYXI/IFdlYmtpdCBkb2VzIG5vdCBlbnVtZXJhdGUgb3ZlciB0aGUgQ1NTIHByb3BlcnRpZXMgb2YgdGhlIHN0eWxlIG9iamVjdC5cbiAgLy8gSG93ZXZlciAocHJvcCBpbiBzdHlsZSkgcmV0dXJucyB0aGUgY29ycmVjdCB2YWx1ZSwgc28gd2UnbGwgaGF2ZSB0byB0ZXN0IGZvclxuICAvLyB0aGUgcHJlY2VuY2Ugb2YgYSBzcGVjaWZpYyBwcm9wZXJ0eVxuICBpZiAoJ1dlYmtpdE9wYWNpdHknIGluIHN0eWxlRGVjbGFyYXRpb24pIHsgcmV0dXJuICctd2Via2l0LSc7IH1cbiAgaWYgKCdLaHRtbE9wYWNpdHknIGluIHN0eWxlRGVjbGFyYXRpb24pIHsgcmV0dXJuICcta2h0bWwtJzsgfVxuICByZXR1cm4gJyc7XG59KCkpO1xuZnVuY3Rpb24gZXh0ZW5kKGRlc3RpbmF0aW9uLCBmcm9tKSB7XG4gIGZvciAodmFyIHByb3AgaW4gZnJvbSkge1xuICAgIGlmIChmcm9tW3Byb3BdKSB7XG4gICAgICBkZXN0aW5hdGlvbltwcm9wXSA9IGZyb21bcHJvcF07XG4gICAgfVxuICB9XG4gIHJldHVybiBkZXN0aW5hdGlvbjtcbn1cbmZ1bmN0aW9uIGluaGVyaXRzKGNoaWxkLCB1YmVyKSB7XG4gIGNoaWxkLnByb3RvdHlwZSA9IGV4dGVuZChjaGlsZC5wcm90b3R5cGUgfHwge30sIHViZXIucHJvdG90eXBlKTtcbn1cblxuLyoqXG4gKiBTbGlkZW91dCBjb25zdHJ1Y3RvclxuICovXG5mdW5jdGlvbiBTbGlkZW91dChvcHRpb25zKSB7XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gIC8vIFNldHMgZGVmYXVsdCB2YWx1ZXNcbiAgdGhpcy5fc3RhcnRPZmZzZXRYID0gMDtcbiAgdGhpcy5fY3VycmVudE9mZnNldFggPSAwO1xuICB0aGlzLl9vcGVuaW5nID0gZmFsc2U7XG4gIHRoaXMuX21vdmVkID0gZmFsc2U7XG4gIHRoaXMuX29wZW5lZCA9IGZhbHNlO1xuICB0aGlzLl9wcmV2ZW50T3BlbiA9IGZhbHNlO1xuICB0aGlzLl90b3VjaCA9IG9wdGlvbnMudG91Y2ggPT09IHVuZGVmaW5lZCA/IHRydWUgOiBvcHRpb25zLnRvdWNoICYmIHRydWU7XG4gIHRoaXMuX2NsYXNzID0gb3B0aW9ucy5jbGFzcyA9PT0gdW5kZWZpbmVkID8gdW5kZWZpbmVkIDogb3B0aW9ucy5jbGFzcztcblxuXG4gIC8vIFNldHMgcGFuZWxcbiAgdGhpcy5wYW5lbCA9IG9wdGlvbnMucGFuZWw7XG4gIHRoaXMubWVudSA9IG9wdGlvbnMubWVudTtcblxuICAvLyBTZXRzICBjbGFzc25hbWVzXG4gIGlmKHRoaXMucGFuZWwuY2xhc3NOYW1lLnNlYXJjaCgnc2xpZGVvdXQtcGFuZWwnKSA9PT0gLTEpIHsgdGhpcy5wYW5lbC5jbGFzc05hbWUgKz0gJyBzbGlkZW91dC1wYW5lbCc7IH1cbiAgaWYodGhpcy5tZW51LmNsYXNzTmFtZS5zZWFyY2goJ3NsaWRlb3V0LW1lbnUnKSA9PT0gLTEpIHsgdGhpcy5tZW51LmNsYXNzTmFtZSArPSAnIHNsaWRlb3V0LW1lbnUnOyB9XG5cblxuICAvLyBTZXRzIG9wdGlvbnNcbiAgdGhpcy5fZnggPSBvcHRpb25zLmZ4IHx8ICdlYXNlJztcbiAgdGhpcy5fZHVyYXRpb24gPSBwYXJzZUludChvcHRpb25zLmR1cmF0aW9uLCAxMCkgfHwgMzAwO1xuICB0aGlzLl90b2xlcmFuY2UgPSBwYXJzZUludChvcHRpb25zLnRvbGVyYW5jZSwgMTApIHx8IDcwO1xuICB0aGlzLl9wYWRkaW5nID0gdGhpcy5fdHJhbnNsYXRlVG8gPSBwYXJzZUludChvcHRpb25zLnBhZGRpbmcsIDEwKSB8fCAyNTY7XG4gIHRoaXMuX29yaWVudGF0aW9uID0gb3B0aW9ucy5zaWRlID09PSAncmlnaHQnID8gLTEgOiAxO1xuICB0aGlzLl90cmFuc2xhdGVUbyAqPSB0aGlzLl9vcmllbnRhdGlvbjtcblxuICAvLyBJbml0IHRvdWNoIGV2ZW50c1xuICBpZiAodGhpcy5fdG91Y2gpIHtcbiAgICB0aGlzLl9pbml0VG91Y2hFdmVudHMoKTtcbiAgfVxufVxuXG4vKipcbiAqIEluaGVyaXRzIGZyb20gRW1pdHRlclxuICovXG5pbmhlcml0cyhTbGlkZW91dCwgRW1pdHRlcik7XG5cbi8qKlxuICogT3BlbnMgdGhlIHNsaWRlb3V0IG1lbnUuXG4gKi9cblNsaWRlb3V0LnByb3RvdHlwZS5vcGVuID0gZnVuY3Rpb24oKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdGhpcy5lbWl0KCdiZWZvcmVvcGVuJyk7XG4gIGlmIChodG1sLmNsYXNzTmFtZS5zZWFyY2goJ3NsaWRlb3V0LW9wZW4nKSA9PT0gLTEpIHsgaHRtbC5jbGFzc05hbWUgKz0gJyBzbGlkZW91dC1vcGVuJzsgfVxuICBpZiAodGhpcy5fY2xhc3MgJiYgaHRtbC5jbGFzc05hbWUuc2VhcmNoKCdzbGlkZW91dC0nICsgdGhpcy5fY2xhc3MpID09PSAtMSkgeyBodG1sLmNsYXNzTmFtZSArPSAoJyBzbGlkZW91dC0nICsgdGhpcy5fY2xhc3MpOyB9XG4gIHRoaXMuX3NldFRyYW5zaXRpb24oKTtcbiAgdGhpcy5fdHJhbnNsYXRlWFRvKHRoaXMuX3RyYW5zbGF0ZVRvKTtcbiAgdGhpcy5fb3BlbmVkID0gdHJ1ZTtcbiAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICBzZWxmLnBhbmVsLnN0eWxlLnRyYW5zaXRpb24gPSBzZWxmLnBhbmVsLnN0eWxlWyctd2Via2l0LXRyYW5zaXRpb24nXSA9ICcnO1xuICAgIHNlbGYuZW1pdCgnb3BlbicpO1xuICB9LCB0aGlzLl9kdXJhdGlvbiArIDUwKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIENsb3NlcyBzbGlkZW91dCBtZW51LlxuICovXG5TbGlkZW91dC5wcm90b3R5cGUuY2xvc2UgPSBmdW5jdGlvbigpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICBpZiAoIXRoaXMuaXNPcGVuKCkgJiYgIXRoaXMuX29wZW5pbmcpIHtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuICB0aGlzLmVtaXQoJ2JlZm9yZWNsb3NlJyk7XG4gIHRoaXMuX3NldFRyYW5zaXRpb24oKTtcbiAgdGhpcy5fdHJhbnNsYXRlWFRvKDApO1xuICB0aGlzLl9vcGVuZWQgPSBmYWxzZTtcbiAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICBodG1sLmNsYXNzTmFtZSA9IGh0bWwuY2xhc3NOYW1lLnJlcGxhY2UoLyBzbGlkZW91dC1vcGVuLywgJycpO1xuICAgIGh0bWwuY2xhc3NOYW1lID0gaHRtbC5jbGFzc05hbWUucmVwbGFjZSgnIHNsaWRlb3V0LScgKyBzZWxmLl9jbGFzcywgJycpO1xuICAgIHNlbGYucGFuZWwuc3R5bGUudHJhbnNpdGlvbiA9IHNlbGYucGFuZWwuc3R5bGVbJy13ZWJraXQtdHJhbnNpdGlvbiddID0gc2VsZi5wYW5lbC5zdHlsZVtwcmVmaXggKyAndHJhbnNmb3JtJ10gPSBzZWxmLnBhbmVsLnN0eWxlLnRyYW5zZm9ybSA9ICcnO1xuICAgIHNlbGYuZW1pdCgnY2xvc2UnKTtcbiAgfSwgdGhpcy5fZHVyYXRpb24gKyA1MCk7XG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBUb2dnbGVzIChvcGVuL2Nsb3NlKSBzbGlkZW91dCBtZW51LlxuICovXG5TbGlkZW91dC5wcm90b3R5cGUudG9nZ2xlID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLmlzT3BlbigpID8gdGhpcy5jbG9zZSgpIDogdGhpcy5vcGVuKCk7XG59O1xuXG4vKipcbiAqIFJldHVybnMgdHJ1ZSBpZiB0aGUgc2xpZGVvdXQgaXMgY3VycmVudGx5IG9wZW4sIGFuZCBmYWxzZSBpZiBpdCBpcyBjbG9zZWQuXG4gKi9cblNsaWRlb3V0LnByb3RvdHlwZS5pc09wZW4gPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMuX29wZW5lZDtcbn07XG5cbi8qKlxuICogVHJhbnNsYXRlcyBwYW5lbCBhbmQgdXBkYXRlcyBjdXJyZW50T2Zmc2V0IHdpdGggYSBnaXZlbiBYIHBvaW50XG4gKi9cblNsaWRlb3V0LnByb3RvdHlwZS5fdHJhbnNsYXRlWFRvID0gZnVuY3Rpb24odHJhbnNsYXRlWCkge1xuICB0aGlzLl9jdXJyZW50T2Zmc2V0WCA9IHRyYW5zbGF0ZVg7XG4gIHRoaXMucGFuZWwuc3R5bGVbcHJlZml4ICsgJ3RyYW5zZm9ybSddID0gdGhpcy5wYW5lbC5zdHlsZS50cmFuc2Zvcm0gPSAndHJhbnNsYXRlWCgnICsgdHJhbnNsYXRlWCArICdweCknO1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogU2V0IHRyYW5zaXRpb24gcHJvcGVydGllc1xuICovXG5TbGlkZW91dC5wcm90b3R5cGUuX3NldFRyYW5zaXRpb24gPSBmdW5jdGlvbigpIHtcbiAgdGhpcy5wYW5lbC5zdHlsZVtwcmVmaXggKyAndHJhbnNpdGlvbiddID0gdGhpcy5wYW5lbC5zdHlsZS50cmFuc2l0aW9uID0gcHJlZml4ICsgJ3RyYW5zZm9ybSAnICsgdGhpcy5fZHVyYXRpb24gKyAnbXMgJyArIHRoaXMuX2Z4O1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogSW5pdGlhbGl6ZXMgdG91Y2ggZXZlbnRcbiAqL1xuU2xpZGVvdXQucHJvdG90eXBlLl9pbml0VG91Y2hFdmVudHMgPSBmdW5jdGlvbigpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIC8qKlxuICAgKiBEZWNvdXBsZSBzY3JvbGwgZXZlbnRcbiAgICovXG4gIHRoaXMuX29uU2Nyb2xsRm4gPSBkZWNvdXBsZShkb2MsICdzY3JvbGwnLCBmdW5jdGlvbigpIHtcbiAgICBpZiAoIXNlbGYuX21vdmVkKSB7XG4gICAgICBjbGVhclRpbWVvdXQoc2Nyb2xsVGltZW91dCk7XG4gICAgICBzY3JvbGxpbmcgPSB0cnVlO1xuICAgICAgc2Nyb2xsVGltZW91dCA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgIHNjcm9sbGluZyA9IGZhbHNlO1xuICAgICAgfSwgMjUwKTtcbiAgICB9XG4gIH0pO1xuXG4gIC8qKlxuICAgKiBQcmV2ZW50cyB0b3VjaG1vdmUgZXZlbnQgaWYgc2xpZGVvdXQgaXMgbW92aW5nXG4gICAqL1xuICB0aGlzLl9wcmV2ZW50TW92ZSA9IGZ1bmN0aW9uKGV2ZSkge1xuICAgIGlmIChzZWxmLl9tb3ZlZCkge1xuICAgICAgZXZlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgfVxuICB9O1xuXG4gIGRvYy5hZGRFdmVudExpc3RlbmVyKHRvdWNoLm1vdmUsIHRoaXMuX3ByZXZlbnRNb3ZlKTtcblxuICAvKipcbiAgICogUmVzZXRzIHZhbHVlcyBvbiB0b3VjaHN0YXJ0XG4gICAqL1xuICB0aGlzLl9yZXNldFRvdWNoRm4gPSBmdW5jdGlvbihldmUpIHtcbiAgICBpZiAodHlwZW9mIGV2ZS50b3VjaGVzID09PSAndW5kZWZpbmVkJykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHNlbGYuX21vdmVkID0gZmFsc2U7XG4gICAgc2VsZi5fb3BlbmluZyA9IGZhbHNlO1xuICAgIHNlbGYuX3N0YXJ0T2Zmc2V0WCA9IGV2ZS50b3VjaGVzWzBdLnBhZ2VYO1xuICAgIHNlbGYuX3ByZXZlbnRPcGVuID0gKCFzZWxmLl90b3VjaCB8fCAoIXNlbGYuaXNPcGVuKCkgJiYgc2VsZi5tZW51LmNsaWVudFdpZHRoICE9PSAwKSk7XG4gIH07XG5cbiAgdGhpcy5wYW5lbC5hZGRFdmVudExpc3RlbmVyKHRvdWNoLnN0YXJ0LCB0aGlzLl9yZXNldFRvdWNoRm4pO1xuXG4gIC8qKlxuICAgKiBSZXNldHMgdmFsdWVzIG9uIHRvdWNoY2FuY2VsXG4gICAqL1xuICB0aGlzLl9vblRvdWNoQ2FuY2VsRm4gPSBmdW5jdGlvbigpIHtcbiAgICBzZWxmLl9tb3ZlZCA9IGZhbHNlO1xuICAgIHNlbGYuX29wZW5pbmcgPSBmYWxzZTtcbiAgfTtcblxuICB0aGlzLnBhbmVsLmFkZEV2ZW50TGlzdGVuZXIoJ3RvdWNoY2FuY2VsJywgdGhpcy5fb25Ub3VjaENhbmNlbEZuKTtcblxuICAvKipcbiAgICogVG9nZ2xlcyBzbGlkZW91dCBvbiB0b3VjaGVuZFxuICAgKi9cbiAgdGhpcy5fb25Ub3VjaEVuZEZuID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKHNlbGYuX21vdmVkKSB7XG4gICAgICBzZWxmLmVtaXQoJ3RyYW5zbGF0ZWVuZCcpO1xuICAgICAgKHNlbGYuX29wZW5pbmcgJiYgTWF0aC5hYnMoc2VsZi5fY3VycmVudE9mZnNldFgpID4gc2VsZi5fdG9sZXJhbmNlKSA/IHNlbGYub3BlbigpIDogc2VsZi5jbG9zZSgpO1xuICAgIH1cbiAgICBzZWxmLl9tb3ZlZCA9IGZhbHNlO1xuICB9O1xuXG4gIHRoaXMucGFuZWwuYWRkRXZlbnRMaXN0ZW5lcih0b3VjaC5lbmQsIHRoaXMuX29uVG91Y2hFbmRGbik7XG5cbiAgLyoqXG4gICAqIFRyYW5zbGF0ZXMgcGFuZWwgb24gdG91Y2htb3ZlXG4gICAqL1xuICB0aGlzLl9vblRvdWNoTW92ZUZuID0gZnVuY3Rpb24oZXZlKSB7XG5cbiAgICBpZiAoc2Nyb2xsaW5nIHx8IHNlbGYuX3ByZXZlbnRPcGVuIHx8IHR5cGVvZiBldmUudG91Y2hlcyA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgZGlmX3ggPSBldmUudG91Y2hlc1swXS5jbGllbnRYIC0gc2VsZi5fc3RhcnRPZmZzZXRYO1xuICAgIHZhciB0cmFuc2xhdGVYID0gc2VsZi5fY3VycmVudE9mZnNldFggPSBkaWZfeDtcblxuICAgIGlmIChNYXRoLmFicyh0cmFuc2xhdGVYKSA+IHNlbGYuX3BhZGRpbmcpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAoTWF0aC5hYnMoZGlmX3gpID4gMjAgJiYgKGh0bWwuY2xhc3NOYW1lLnNlYXJjaCgnc2xpZGVvdXQtb3BlbicpID09PSAtMSB8fCBzZWxmLl9jbGFzcyAmJiBodG1sLmNsYXNzTmFtZS5zZWFyY2goJ3NsaWRlb3V0LScgKyBzZWxmLl9jbGFzcykgIT09IC0xIHx8ICFzZWxmLl9jbGFzcykpIHtcblxuICAgICAgc2VsZi5fb3BlbmluZyA9IHRydWU7XG5cbiAgICAgIHZhciBvcmllbnRlZF9kaWZfeCA9IGRpZl94ICogc2VsZi5fb3JpZW50YXRpb247XG5cbiAgICAgIGlmIChzZWxmLl9vcGVuZWQgJiYgb3JpZW50ZWRfZGlmX3ggPiAwIHx8ICFzZWxmLl9vcGVuZWQgJiYgb3JpZW50ZWRfZGlmX3ggPCAwKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgaWYgKCFzZWxmLl9tb3ZlZCkge1xuICAgICAgICBzZWxmLmVtaXQoJ3RyYW5zbGF0ZXN0YXJ0Jyk7XG4gICAgICB9XG5cbiAgICAgIGlmIChvcmllbnRlZF9kaWZfeCA8PSAwKSB7XG4gICAgICAgIHRyYW5zbGF0ZVggPSBkaWZfeCArIHNlbGYuX3BhZGRpbmcgKiBzZWxmLl9vcmllbnRhdGlvbjtcbiAgICAgICAgc2VsZi5fb3BlbmluZyA9IGZhbHNlO1xuICAgICAgfVxuXG4gICAgICBpZiAoIXNlbGYuX21vdmVkICYmIGh0bWwuY2xhc3NOYW1lLnNlYXJjaCgnc2xpZGVvdXQtb3BlbicpID09PSAtMSkge1xuICAgICAgICBodG1sLmNsYXNzTmFtZSArPSAnIHNsaWRlb3V0LW9wZW4nO1xuICAgICAgfVxuXG4gICAgICBpZiAoIXNlbGYuX21vdmVkICYmIHNlbGYuX2NsYXNzICYmIGh0bWwuY2xhc3NOYW1lLnNlYXJjaCgnc2xpZGVvdXQtJyArIHNlbGYuX2NsYXNzKSA9PT0gLTEpIHtcbiAgICAgICAgICBodG1sLmNsYXNzTmFtZSArPSAoJyBzbGlkZW91dC0nICsgc2VsZi5fY2xhc3MpO1xuICAgICAgfVxuXG4gICAgICBzZWxmLnBhbmVsLnN0eWxlW3ByZWZpeCArICd0cmFuc2Zvcm0nXSA9IHNlbGYucGFuZWwuc3R5bGUudHJhbnNmb3JtID0gJ3RyYW5zbGF0ZVgoJyArIHRyYW5zbGF0ZVggKyAncHgpJztcbiAgICAgIHNlbGYuZW1pdCgndHJhbnNsYXRlJywgdHJhbnNsYXRlWCk7XG4gICAgICBzZWxmLl9tb3ZlZCA9IHRydWU7XG4gICAgfVxuXG4gIH07XG5cbiAgdGhpcy5wYW5lbC5hZGRFdmVudExpc3RlbmVyKHRvdWNoLm1vdmUsIHRoaXMuX29uVG91Y2hNb3ZlRm4pO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBFbmFibGUgb3BlbmluZyB0aGUgc2xpZGVvdXQgdmlhIHRvdWNoIGV2ZW50cy5cbiAqL1xuU2xpZGVvdXQucHJvdG90eXBlLmVuYWJsZVRvdWNoID0gZnVuY3Rpb24oKSB7XG4gIHRoaXMuX3RvdWNoID0gdHJ1ZTtcbiAgdGhpcy5fcHJldmVudE9wZW4gPSB1bmRlZmluZWQ7XG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBEaXNhYmxlIG9wZW5pbmcgdGhlIHNsaWRlb3V0IHZpYSB0b3VjaCBldmVudHMuXG4gKi9cblNsaWRlb3V0LnByb3RvdHlwZS5kaXNhYmxlVG91Y2ggPSBmdW5jdGlvbigpIHtcbiAgdGhpcy5fdG91Y2ggPSBmYWxzZTtcbiAgdGhpcy5fcHJldmVudE9wZW4gPSB0cnVlO1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogRGVzdHJveSBhbiBpbnN0YW5jZSBvZiBzbGlkZW91dC5cbiAqL1xuU2xpZGVvdXQucHJvdG90eXBlLmRlc3Ryb3kgPSBmdW5jdGlvbigpIHtcbiAgLy8gQ2xvc2UgYmVmb3JlIGNsZWFuXG4gIHRoaXMuY2xvc2UoKTtcblxuICBpZih0aGlzLnBhbmVsICYmIHRoaXMucGFuZWwuY2xhc3NOYW1lLnNlYXJjaCgnc2xpZGVvdXQtcGFuZWwnKSAhPT0gLTEpIHsgdGhpcy5wYW5lbC5jbGFzc0xpc3QucmVtb3ZlKCdzbGlkZW91dC1wYW5lbCcpOyB9XG4gIGlmKHRoaXMubWVudSAmJiB0aGlzLm1lbnUuY2xhc3NOYW1lLnNlYXJjaCgnc2xpZGVvdXQtbWVudScpICE9PSAtMSkgeyB0aGlzLm1lbnUuY2xhc3NMaXN0LnJlbW92ZSgnc2xpZGVvdXQtbWVudScpOyB9XG5cbiAgLy8gUmVtb3ZlIGV2ZW50IGxpc3RlbmVyc1xuICBkb2MucmVtb3ZlRXZlbnRMaXN0ZW5lcih0b3VjaC5tb3ZlLCB0aGlzLl9wcmV2ZW50TW92ZSk7XG4gIHRoaXMucGFuZWwucmVtb3ZlRXZlbnRMaXN0ZW5lcih0b3VjaC5zdGFydCwgdGhpcy5fcmVzZXRUb3VjaEZuKTtcbiAgdGhpcy5wYW5lbC5yZW1vdmVFdmVudExpc3RlbmVyKCd0b3VjaGNhbmNlbCcsIHRoaXMuX29uVG91Y2hDYW5jZWxGbik7XG4gIHRoaXMucGFuZWwucmVtb3ZlRXZlbnRMaXN0ZW5lcih0b3VjaC5lbmQsIHRoaXMuX29uVG91Y2hFbmRGbik7XG4gIHRoaXMucGFuZWwucmVtb3ZlRXZlbnRMaXN0ZW5lcih0b3VjaC5tb3ZlLCB0aGlzLl9vblRvdWNoTW92ZUZuKTtcbiAgZG9jLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3Njcm9sbCcsIHRoaXMuX29uU2Nyb2xsRm4pO1xuXG4gIC8vIFJlbW92ZSBtZXRob2RzXG4gIHRoaXMub3BlbiA9IHRoaXMuY2xvc2UgPSBmdW5jdGlvbiAoKSB7fTtcblxuICAvLyBSZW1vdmUgSFRNTCBlbGVtZW50c1xuICB0aGlzLnBhbmVsID0gdGhpcy5tZW51ID0gdW5kZWZpbmVkO1xuXG4gIC8vIFJldHVybiB0aGUgaW5zdGFuY2Ugc28gaXQgY2FuIGJlIGVhc2lseSBkZXJlZmVyZW5jZWRcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEV4cG9zZSBTbGlkZW91dFxuICovXG5tb2R1bGUuZXhwb3J0cyA9IFNsaWRlb3V0O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgcmVxdWVzdEFuaW1GcmFtZSA9IChmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHxcbiAgICB3aW5kb3cud2Via2l0UmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8XG4gICAgZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG4gICAgICB3aW5kb3cuc2V0VGltZW91dChjYWxsYmFjaywgMTAwMCAvIDYwKTtcbiAgICB9O1xufSgpKTtcblxuZnVuY3Rpb24gZGVjb3VwbGUobm9kZSwgZXZlbnQsIGZuKSB7XG4gIHZhciBldmUsXG4gICAgICB0cmFja2luZyA9IGZhbHNlO1xuXG4gIGZ1bmN0aW9uIGNhcHR1cmVFdmVudChlKSB7XG4gICAgZXZlID0gZTtcbiAgICB0cmFjaygpO1xuICB9XG5cbiAgZnVuY3Rpb24gdHJhY2soKSB7XG4gICAgaWYgKCF0cmFja2luZykge1xuICAgICAgcmVxdWVzdEFuaW1GcmFtZSh1cGRhdGUpO1xuICAgICAgdHJhY2tpbmcgPSB0cnVlO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZSgpIHtcbiAgICBmbi5jYWxsKG5vZGUsIGV2ZSk7XG4gICAgdHJhY2tpbmcgPSBmYWxzZTtcbiAgfVxuXG4gIG5vZGUuYWRkRXZlbnRMaXN0ZW5lcihldmVudCwgY2FwdHVyZUV2ZW50LCBmYWxzZSk7XG5cbiAgcmV0dXJuIGNhcHR1cmVFdmVudDtcbn1cblxuLyoqXG4gKiBFeHBvc2UgZGVjb3VwbGVcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBkZWNvdXBsZTtcbiIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgX2NsYXNzQ2FsbENoZWNrID0gZnVuY3Rpb24gKGluc3RhbmNlLCBDb25zdHJ1Y3RvcikgeyBpZiAoIShpbnN0YW5jZSBpbnN0YW5jZW9mIENvbnN0cnVjdG9yKSkgeyB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQ2Fubm90IGNhbGwgYSBjbGFzcyBhcyBhIGZ1bmN0aW9uXCIpOyB9IH07XG5cbmV4cG9ydHMuX19lc01vZHVsZSA9IHRydWU7XG4vKipcbiAqIENyZWF0ZXMgYSBuZXcgaW5zdGFuY2Ugb2YgRW1pdHRlci5cbiAqIEBjbGFzc1xuICogQHJldHVybnMge09iamVjdH0gUmV0dXJucyBhIG5ldyBpbnN0YW5jZSBvZiBFbWl0dGVyLlxuICogQGV4YW1wbGVcbiAqIC8vIENyZWF0ZXMgYSBuZXcgaW5zdGFuY2Ugb2YgRW1pdHRlci5cbiAqIHZhciBFbWl0dGVyID0gcmVxdWlyZSgnZW1pdHRlcicpO1xuICpcbiAqIHZhciBlbWl0dGVyID0gbmV3IEVtaXR0ZXIoKTtcbiAqL1xuXG52YXIgRW1pdHRlciA9IChmdW5jdGlvbiAoKSB7XG4gIGZ1bmN0aW9uIEVtaXR0ZXIoKSB7XG4gICAgX2NsYXNzQ2FsbENoZWNrKHRoaXMsIEVtaXR0ZXIpO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZHMgYSBsaXN0ZW5lciB0byB0aGUgY29sbGVjdGlvbiBmb3IgdGhlIHNwZWNpZmllZCBldmVudC5cbiAgICogQG1lbWJlcm9mISBFbWl0dGVyLnByb3RvdHlwZVxuICAgKiBAZnVuY3Rpb25cbiAgICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50IC0gVGhlIGV2ZW50IG5hbWUuXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGxpc3RlbmVyIC0gQSBsaXN0ZW5lciBmdW5jdGlvbiB0byBhZGQuXG4gICAqIEByZXR1cm5zIHtPYmplY3R9IFJldHVybnMgYW4gaW5zdGFuY2Ugb2YgRW1pdHRlci5cbiAgICogQGV4YW1wbGVcbiAgICogLy8gQWRkIGFuIGV2ZW50IGxpc3RlbmVyIHRvIFwiZm9vXCIgZXZlbnQuXG4gICAqIGVtaXR0ZXIub24oJ2ZvbycsIGxpc3RlbmVyKTtcbiAgICovXG5cbiAgRW1pdHRlci5wcm90b3R5cGUub24gPSBmdW5jdGlvbiBvbihldmVudCwgbGlzdGVuZXIpIHtcbiAgICAvLyBVc2UgdGhlIGN1cnJlbnQgY29sbGVjdGlvbiBvciBjcmVhdGUgaXQuXG4gICAgdGhpcy5fZXZlbnRDb2xsZWN0aW9uID0gdGhpcy5fZXZlbnRDb2xsZWN0aW9uIHx8IHt9O1xuXG4gICAgLy8gVXNlIHRoZSBjdXJyZW50IGNvbGxlY3Rpb24gb2YgYW4gZXZlbnQgb3IgY3JlYXRlIGl0LlxuICAgIHRoaXMuX2V2ZW50Q29sbGVjdGlvbltldmVudF0gPSB0aGlzLl9ldmVudENvbGxlY3Rpb25bZXZlbnRdIHx8IFtdO1xuXG4gICAgLy8gQXBwZW5kcyB0aGUgbGlzdGVuZXIgaW50byB0aGUgY29sbGVjdGlvbiBvZiB0aGUgZ2l2ZW4gZXZlbnRcbiAgICB0aGlzLl9ldmVudENvbGxlY3Rpb25bZXZlbnRdLnB1c2gobGlzdGVuZXIpO1xuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG5cbiAgLyoqXG4gICAqIEFkZHMgYSBsaXN0ZW5lciB0byB0aGUgY29sbGVjdGlvbiBmb3IgdGhlIHNwZWNpZmllZCBldmVudCB0aGF0IHdpbGwgYmUgY2FsbGVkIG9ubHkgb25jZS5cbiAgICogQG1lbWJlcm9mISBFbWl0dGVyLnByb3RvdHlwZVxuICAgKiBAZnVuY3Rpb25cbiAgICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50IC0gVGhlIGV2ZW50IG5hbWUuXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGxpc3RlbmVyIC0gQSBsaXN0ZW5lciBmdW5jdGlvbiB0byBhZGQuXG4gICAqIEByZXR1cm5zIHtPYmplY3R9IFJldHVybnMgYW4gaW5zdGFuY2Ugb2YgRW1pdHRlci5cbiAgICogQGV4YW1wbGVcbiAgICogLy8gV2lsbCBhZGQgYW4gZXZlbnQgaGFuZGxlciB0byBcImZvb1wiIGV2ZW50IG9uY2UuXG4gICAqIGVtaXR0ZXIub25jZSgnZm9vJywgbGlzdGVuZXIpO1xuICAgKi9cblxuICBFbWl0dGVyLnByb3RvdHlwZS5vbmNlID0gZnVuY3Rpb24gb25jZShldmVudCwgbGlzdGVuZXIpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICBmdW5jdGlvbiBmbigpIHtcbiAgICAgIHNlbGYub2ZmKGV2ZW50LCBmbik7XG4gICAgICBsaXN0ZW5lci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cblxuICAgIGZuLmxpc3RlbmVyID0gbGlzdGVuZXI7XG5cbiAgICB0aGlzLm9uKGV2ZW50LCBmbik7XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuICAvKipcbiAgICogUmVtb3ZlcyBhIGxpc3RlbmVyIGZyb20gdGhlIGNvbGxlY3Rpb24gZm9yIHRoZSBzcGVjaWZpZWQgZXZlbnQuXG4gICAqIEBtZW1iZXJvZiEgRW1pdHRlci5wcm90b3R5cGVcbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBldmVudCAtIFRoZSBldmVudCBuYW1lLlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBsaXN0ZW5lciAtIEEgbGlzdGVuZXIgZnVuY3Rpb24gdG8gcmVtb3ZlLlxuICAgKiBAcmV0dXJucyB7T2JqZWN0fSBSZXR1cm5zIGFuIGluc3RhbmNlIG9mIEVtaXR0ZXIuXG4gICAqIEBleGFtcGxlXG4gICAqIC8vIFJlbW92ZSBhIGdpdmVuIGxpc3RlbmVyLlxuICAgKiBlbWl0dGVyLm9mZignZm9vJywgbGlzdGVuZXIpO1xuICAgKi9cblxuICBFbWl0dGVyLnByb3RvdHlwZS5vZmYgPSBmdW5jdGlvbiBvZmYoZXZlbnQsIGxpc3RlbmVyKSB7XG5cbiAgICB2YXIgbGlzdGVuZXJzID0gdW5kZWZpbmVkO1xuXG4gICAgLy8gRGVmaW5lcyBsaXN0ZW5lcnMgdmFsdWUuXG4gICAgaWYgKCF0aGlzLl9ldmVudENvbGxlY3Rpb24gfHwgIShsaXN0ZW5lcnMgPSB0aGlzLl9ldmVudENvbGxlY3Rpb25bZXZlbnRdKSkge1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgbGlzdGVuZXJzLmZvckVhY2goZnVuY3Rpb24gKGZuLCBpKSB7XG4gICAgICBpZiAoZm4gPT09IGxpc3RlbmVyIHx8IGZuLmxpc3RlbmVyID09PSBsaXN0ZW5lcikge1xuICAgICAgICAvLyBSZW1vdmVzIHRoZSBnaXZlbiBsaXN0ZW5lci5cbiAgICAgICAgbGlzdGVuZXJzLnNwbGljZShpLCAxKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIFJlbW92ZXMgYW4gZW1wdHkgZXZlbnQgY29sbGVjdGlvbi5cbiAgICBpZiAobGlzdGVuZXJzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50Q29sbGVjdGlvbltldmVudF07XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG5cbiAgLyoqXG4gICAqIEV4ZWN1dGUgZWFjaCBpdGVtIGluIHRoZSBsaXN0ZW5lciBjb2xsZWN0aW9uIGluIG9yZGVyIHdpdGggdGhlIHNwZWNpZmllZCBkYXRhLlxuICAgKiBAbWVtYmVyb2YhIEVtaXR0ZXIucHJvdG90eXBlXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcGFyYW0ge1N0cmluZ30gZXZlbnQgLSBUaGUgbmFtZSBvZiB0aGUgZXZlbnQgeW91IHdhbnQgdG8gZW1pdC5cbiAgICogQHBhcmFtIHsuLi5PYmplY3R9IGRhdGEgLSBEYXRhIHRvIHBhc3MgdG8gdGhlIGxpc3RlbmVycy5cbiAgICogQHJldHVybnMge09iamVjdH0gUmV0dXJucyBhbiBpbnN0YW5jZSBvZiBFbWl0dGVyLlxuICAgKiBAZXhhbXBsZVxuICAgKiAvLyBFbWl0cyB0aGUgXCJmb29cIiBldmVudCB3aXRoICdwYXJhbTEnIGFuZCAncGFyYW0yJyBhcyBhcmd1bWVudHMuXG4gICAqIGVtaXR0ZXIuZW1pdCgnZm9vJywgJ3BhcmFtMScsICdwYXJhbTInKTtcbiAgICovXG5cbiAgRW1pdHRlci5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uIGVtaXQoZXZlbnQpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgZm9yICh2YXIgX2xlbiA9IGFyZ3VtZW50cy5sZW5ndGgsIGFyZ3MgPSBBcnJheShfbGVuID4gMSA/IF9sZW4gLSAxIDogMCksIF9rZXkgPSAxOyBfa2V5IDwgX2xlbjsgX2tleSsrKSB7XG4gICAgICBhcmdzW19rZXkgLSAxXSA9IGFyZ3VtZW50c1tfa2V5XTtcbiAgICB9XG5cbiAgICB2YXIgbGlzdGVuZXJzID0gdW5kZWZpbmVkO1xuXG4gICAgLy8gRGVmaW5lcyBsaXN0ZW5lcnMgdmFsdWUuXG4gICAgaWYgKCF0aGlzLl9ldmVudENvbGxlY3Rpb24gfHwgIShsaXN0ZW5lcnMgPSB0aGlzLl9ldmVudENvbGxlY3Rpb25bZXZlbnRdKSkge1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLy8gQ2xvbmUgbGlzdGVuZXJzXG4gICAgbGlzdGVuZXJzID0gbGlzdGVuZXJzLnNsaWNlKDApO1xuXG4gICAgbGlzdGVuZXJzLmZvckVhY2goZnVuY3Rpb24gKGZuKSB7XG4gICAgICByZXR1cm4gZm4uYXBwbHkoX3RoaXMsIGFyZ3MpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG5cbiAgcmV0dXJuIEVtaXR0ZXI7XG59KSgpO1xuXG4vKipcbiAqIEV4cG9ydHMgRW1pdHRlclxuICovXG5leHBvcnRzW1wiZGVmYXVsdFwiXSA9IEVtaXR0ZXI7XG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHNbXCJkZWZhdWx0XCJdOyJdfQ==
