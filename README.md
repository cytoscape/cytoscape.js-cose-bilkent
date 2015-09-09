cytoscape-cose-bilkent
================================================================================


## Description

The CoSE layout for Cytoscape.js by Bilkent in the [i-Vis group](http://cs.bilkent.edu.tr/~ivis/)


## Dependencies

 * Cytoscape.js >=2.4.0


## Usage instructions

Download the library:
 * via npm: `npm install cytoscape-cose-bilkent`,
 * via bower: `bower install cytoscape-cose-bilkent`, or
 * via direct download in the repository (probably from a tag).

`require()` the library as appropriate for your project:

CommonJS:
```js
var cytoscape = require('cytoscape');
var regCose = require('cytoscape-cose-bilkent');

regCose( cytoscape ); // register extension
```

AMD:
```js
require(['cytoscape', 'cytoscape-cose-bilkent'], function( cytoscape, regCose ){
  regCose( cytoscape ); // register extension
});
```

Plain HTML/JS has the extension registered for you automatically, because no `require()` is needed.


## API

When calling the layout, e.g. `cy.layout({ name: 'cose-bilkent', ... })`, the following options are supported:

```js
var defaultOptions = {
  // Called on `layoutready`
  ready: function () {
  },
  // Called on `layoutstop`
  stop: function () {
  },
  // Whether to fit the network view after when done
  fit: true,
  // Padding on fit
  padding: 10,
  // Whether to enable incremental mode
  randomize: false,
  // Node repulsion (non overlapping) multiplier
  nodeRepulsion: 4500,
  // Ideal edge (non nested) length
  idealEdgeLength: 50,
  // Divisor to compute edge forces
  edgeElasticity: 0.45,
  // Nesting factor (multiplier) to compute ideal edge length for nested edges
  nestingFactor: 0.1,
  // Gravity force (constant)
  gravity: 0.4,
  // Maximum number of iterations to perform
  numIter: 2500,
  // For enabling tiling
  tile: true,
  //whether to make animation while performing the layout
  animate: true
};
```


## Publishing instructions

This project is set up to automatically be published to npm and bower.  To publish:

1. Set the version number environment variable: `export VERSION=1.2.3`
1. Publish: `gulp publish`
1. If publishing to bower for the first time, you'll need to run `bower register cytoscape-cose-bilkent https://github.com/cytoscape/cytoscape.js-cose-bilkent.git`
