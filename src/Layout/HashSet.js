var UniqueIDGeneretor = require('./UniqueIDGeneretor');

function HashSet(elements) {
  this.set = {};
  if (elements != undefined)
  {   
    for (var i = 0, len = elements.length; i < len; i++) {
      this.add(elements[i]);
    }   
  }
};

HashSet.prototype.has = function (obj) {
  return this.contains(obj);
};

HashSet.prototype.getAll = function () {
  var allElements = [];
  for(var elementKey in this.set) {
    allElements.push(this.set[elementKey]);
  }
  return allElements;
};

HashSet.prototype.add = function (obj) {
  var theId = UniqueIDGeneretor.createID(obj);
  if (!this.contains(theId)) this.set[theId] = obj;
};

HashSet.prototype.remove = function (obj) {
  delete this.set[UniqueIDGeneretor.createID(obj)];
};

HashSet.prototype.clear = function () {
  this.set = {};
};

HashSet.prototype.contains = function (obj) {
  return this.set[UniqueIDGeneretor.createID(obj)] == obj;
};

HashSet.prototype.isEmpty = function () {
  return this.size() === 0;
};

HashSet.prototype.size = function () {
  return Object.keys(this.set).length;
};

//concats this.set to the given list
HashSet.prototype.addAllTo = function (list) {
  var keys = Object.keys(this.set);
  var length = keys.length;
  for (var i = 0; i < length; i++) {
    list.push(this.set[keys[i]]);
  }
};

HashSet.prototype.size = function () {
  return Object.keys(this.set).length;
};

HashSet.prototype.addAll = function (list) {
  var s = list.length;
  for (var i = 0; i < s; i++) {
    var v = list[i];
    this.add(v);
  }
};

module.exports = HashSet;

