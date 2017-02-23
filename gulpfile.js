var gulp = require('gulp');
var util = require('gulp-util');
var notifier = require('node-notifier');
var path = require('path');
var replace = require('gulp-replace');
var child_process = require('child_process');
var fs = require('fs');
var shell = require('gulp-shell');
var jshint = require('gulp-jshint');
var jshStylish = require('jshint-stylish');
var exec = require('child_process').exec;
var runSequence = require('run-sequence');
var prompt = require('gulp-prompt');
var browserify = require('browserify');
var watchify = require('watchify');
var babelify = require('babelify');
var buffer = require('vinyl-buffer');
var source = require('vinyl-source-stream');
var notifier = require('node-notifier');
var derequire = require('gulp-derequire');
var server = require('http-server');
var livereload = require('gulp-livereload');
var pkg = require('./package.json');
var version;

var logError = function( err ){
  notifier.notify({ title: pkg.name, message: 'Error: ' + err.message });
  util.log( util.colors.red(err) );
};

var handleErr = function( err ){
  logError( err );

  if( this.emit ){
    this.emit('end');
  }
};

var getBrowserified = function( opts ){
  opts = Object.assign({
    debug: true,
    cache: {},
    packageCache: {},
    fullPaths: true,
    bundleExternal: true,
    entries: [ './src' ]
  }, opts );

  return browserify( opts ).on( 'log', util.log );
};

var transform = function( b ){
  return ( b
    // can't use babel because cose-bilkent does just use pure functions in workers...
    // .transform( babelify.configure({
    //   presets: ['es2015'],
    //   ignore: 'node_modules/**/*',
    //   sourceMaps: 'inline'
    // }) )
  ) ;
};

var bundle = function( b ){
  return ( b
    .bundle()
    .on( 'error', handleErr )
    .pipe( source('cytoscape-cose-bilkent.js') )
    .pipe( buffer() )
  ) ;
};

gulp.task('build', function(){
  return bundle( transform( getBrowserified({ fullPaths: false }) ) )
    .pipe( gulp.dest('./') )
  ;
});

gulp.task('watch', function(){
  livereload.listen({
    basePath: process.cwd()
  });

  server.createServer({
    root: './',
    cache: -1,
    cors: true
  }).listen( '9999', '0.0.0.0' );

  util.log( util.colors.green('Demo hosted on local server at http://localhost:9999/demo.html') );

  gulp.watch( ['./cytoscape-cose-bilkent.js'] )
    .on('change', livereload.changed)
  ;

  var update = function(){
    util.log( util.colors.white('JS rebuilding via watch...') );

    bundle( b )
      .pipe( gulp.dest('./') )
      .on('finish', function(){
        util.log( util.colors.green('JS rebuild finished via watch') );
      })
    ;
  };

  var b = getBrowserified();

  transform( b );

  b.plugin( watchify, { poll: true } );

  b.on( 'update', update );

  update();
});

gulp.task('default', ['build'], function( next ){
  next();
});

gulp.task('publish', [], function( next ){
  runSequence('confver', 'lint', 'build', 'pkgver', 'push', 'tag', 'npm', next);
});

gulp.task('confver', ['version'], function(){
  return gulp.src('.')
    .pipe( prompt.confirm({ message: 'Are you sure version `' + version + '` is OK to publish?' }) )
  ;
});

gulp.task('version', function( next ){
  var now = new Date();
  version = process.env['VERSION'];

  if( version ){
    done();
  } else {
    exec('git rev-parse HEAD', function( error, stdout, stderr ){
      var sha = stdout.substring(0, 10); // shorten so not huge filename

      version = [ 'snapshot', sha, +now ].join('-');
      done();
    });
  }

  function done(){
    console.log('Using version number `%s` for building', version);
    next();
  }

});

gulp.task('pkgver', ['version'], function(){
  return gulp.src([
    'package.json',
    'bower.json'
  ])
    .pipe( replace(/\"version\"\:\s*\".*?\"/, '"version": "' + version + '"') )

    .pipe( gulp.dest('./') )
  ;
});

gulp.task('push', shell.task([
  'git add -A',
  'git commit -m "pushing changes for v$VERSION release" || echo Nothing to commit',
  'git push || echo Nothing to push'
]));

gulp.task('tag', shell.task([
  'git tag -a $VERSION -m "tagging v$VERSION"',
  'git push origin $VERSION'
]));

gulp.task('npm', shell.task([
  'npm publish .'
]));

// http://www.jshint.com/docs/options/
gulp.task('lint', function(){
  return gulp.src( './src/**' )
    .pipe( jshint({
      funcscope: true,
      laxbreak: true,
      loopfunc: true,
      strict: true,
      unused: 'vars',
      eqnull: true,
      sub: true,
      shadow: true,
      laxcomma: true
    }) )

    .pipe( jshint.reporter(jshStylish) )

    // TODO clean up via linting
    //.pipe( jshint.reporter('fail') )
  ;
});
