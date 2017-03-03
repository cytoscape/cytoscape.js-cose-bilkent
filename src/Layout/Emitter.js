var listeners = [];
function Emitter(){
// Using this.listeners causing scope related bugs. Use listeners variable instead of it (at least until having a better solution)
//  this.listeners = [];
}

var p = Emitter.prototype;

p.addListener = function( event, callback ){
  listeners.push({
    event: event,
    callback: callback
  });
};

p.removeListener = function( event, callback ){
  for( var i = listeners.length; i >= 0; i-- ){
    var l = listeners[i];

    if( l.event === event && l.callback === callback ){
      listeners.splice( i, 1 );
    }
  }
};

p.emit = function( event, data ){
  for( var i = 0; i < listeners.length; i++ ){
    var l = listeners[i];

    if( event === l.event ){
      l.callback( data );
    }
  }
};

module.exports = Emitter;
