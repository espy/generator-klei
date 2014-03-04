
var gulp = require('gulp'),
    g = require('gulp-load-plugins')({lazy: false})<% if (backendTests) { %>,
    join = require('path').join<% } %>,
    noop = g.util.noop<% if (angular) { %>,
    dirname = require('path').dirname,
    es = require('event-stream'),
    sort = require('sort-stream'),
    queue = require('streamqueue')<% } %><% if (dist) { %>,
    lazypipe = require('lazypipe')<% } %>,
    stylish = require('jshint-stylish'),
    bower = require('./bower'),
    isWatching = false;
<% if (angular) { %>
var htmlminOpts = {
  removeComments: true,
  collapseWhitespace: true,
  removeEmptyAttributes: false,
  collapseBooleanAttributes: true,
  removeRedundantAttributes: true
};
<% } %>

/**
 * JS Hint
 */
gulp.task('jshint<% if (angular) { %>-backend<% } %>', function () {
  return gulp.src([
    './gulpfile.js'<% if (!choseType) { %>,
    './src/*.js'<% } %><% if (addconfig) { %>,
    './src/config/*.js'<% } %><% if (express) { %>,
    './src/api/**/*.js'<% } %>
  ])
    .pipe(g.cached('jshint'))
    .pipe(jshint('./src/.jshintrc'));
});<% if (angular) { %>

gulp.task('jshint-app', function () {
  return gulp.src('./src/app/**/*.js')
    .pipe(g.cached('jshint-app'))
    .pipe(jshint('./src/app/.jshintrc'))
    .pipe(livereload());
});

gulp.task('jshint', ['jshint-backend', 'jshint-app']);
<% } %>
<% if (express) { %>
gulp.task('nodemon', function () {
  g.nodemon({script: './src/index.js', watch: ['src']<% if (angular || stylus) { %>, ignore: [<% if (angular) { %>'src/app'<% } %><% if (stylus && !angular) { %>'src/styles'<% } %>]<% } %>});
});
<% } %><% if (stylus) { %>
/**
 * CSS
 */
gulp.task('clean-css', function () {
  return gulp.src('./.tmp/css').pipe(g.clean());
});

gulp.task('styles', ['clean-css'], function () {
  return gulp.src([
    <% if (angular) { %>'./src/app/**/*.styl',
    '!./src/app/**/_*.styl'<% } else { %>'./src/styles/**/*.styl',
    '!./src/styles/**/_*.styl'<% } %>
  ])
    .pipe(g.stylus({use: ['nib']}))
    .pipe(gulp.dest('./.tmp/css/'))
    .pipe(g.cached('built-css'))
    .pipe(livereload());
});

gulp.task('<% if (angular) { %>styles-<% } %>dist', ['styles'], function () {
  return cssFiles().pipe(dist('css', bower.name));
});

gulp.task('csslint', ['styles'], function () {
  return cssFiles()
    .pipe(g.cached('csslint'))
    .pipe(g.csslint('./src/.csslintrc'))
    .pipe(g.csslint.reporter());
});
<% } %>
<% if (angular) { %>
/**
 * Scripts
 */
gulp.task('scripts-dist', ['templates-dist'], function () {
  return appFiles().pipe(dist('js', bower.name, {ngmin: true}));
});

/**
 * Templates
 */
gulp.task('templates', function () {
  return templateFiles().pipe(buildTemplates());
});

gulp.task('templates-dist', function () {
  return templateFiles({min: true}).pipe(buildTemplates());
});


/**
 * Vendors
 */
gulp.task('vendors', function () {
  var bowerStream = g.bowerFiles();
  return es.merge(
    bowerStream.pipe(g.filter('**/*.css')).pipe(dist('css', 'vendors')),
    bowerStream.pipe(g.filter('**/*.js')).pipe(dist('js', 'vendors'))
  );
});

/**
 * Index
 */
gulp.task('index', index);
gulp.task('build-all', ['styles', 'templates'], index);

function index () {
  var opt = {read: false};
  return gulp.src('./src/app/index.html')
    .pipe(g.inject(g.bowerFiles(opt), {ignorePath: 'bower_components', starttag: '<!-- inject:vendor:{{ext}} -->'}))
    .pipe(g.inject(es.merge(appFiles(opt), cssFiles(opt)), {ignorePath: ['.tmp', 'src/app']}))
    .pipe(gulp.dest('./src/app/'))
    .pipe(g.embedlr())
    .pipe(gulp.dest('./.tmp/'))
    .pipe(livereload());
}

/**
 * Dist
 */
gulp.task('dist', ['vendors', 'styles-dist', 'scripts-dist'], function () {
  return gulp.src('./src/app/index.html')
    .pipe(g.inject(gulp.src('./dist/vendors.min.{js,css}'), {ignorePath: 'dist', starttag: '<!-- inject:vendor:{{ext}} -->'}))
    .pipe(g.inject(gulp.src('./dist/' + bower.name + '.min.{js,css}'), {ignorePath: 'dist'}))
    .pipe(g.htmlmin(htmlminOpts))
    .pipe(gulp.dest('./dist/'));
});
<% } %>
/**
 * Watch
 */
gulp.task('watch', [<% if (express) { %>'nodemon', <% } %>'default'], function () {
  isWatching = true;
  // Initiate livereload server:
  g.livereload();
  gulp.watch(['./gulpfile.js'<% if (!choseType) { %>, './src/*.js'<% } %><% if (addconfig) { %>, './src/config/*.js'<% } %><% if (express) { %>, './src/api/{,*/}*.js'<% } %>], ['jshint<% if (angular) { %>-backend<% } %>']);<% if (angular) { %>
  gulp.watch('./src/app/**/*.js', ['jshint-app']).on('change', function (evt) {
    if (evt.type !== 'changed') {
      gulp.start('index');
    }
  });
  gulp.watch('./src/app/index.html', ['index']);
  gulp.watch(['./src/app/**/*.html', '!./src/app/index.html'], ['templates']);<% } %><% if (stylus) { %>
  gulp.watch([<% if (angular) { %>'./src/app/**/*.styl'<% } else { %>'./src/styles/**/*.styl'<% } %>], ['csslint']<% if (angular) { %>).on('change', function (evt) {
    if (evt.type !== 'changed') {
      gulp.start('index');
    }
  }<% } %>);<% } %>
});

/**
 * Default task
 */
gulp.task('default', ['lint'<% if (angular) { %>, 'build-all'<% } %>]);

/**
 * Lint everything
 */
gulp.task('lint', ['jshint'<% if (stylus) { %>, 'csslint'<% } %>]);
<% if (tests) { %>/**
 * Test
 */
<% } %><% if (backendTests) { %>
gulp.task('<% if (frontendTests) { %>mocha<% } else { %>test<% } %>', function () {
  return gulp.src(['./src/**/*_test.js', '!./src/app/**/*_test.js'], {read: false})
    .pipe(g.spawnMocha({
      <% if (addconfig) { %>require: join(__dirname, 'src', 'config', 'test-setup.js'),
      <% } %>bin: join(__dirname, 'node_modules', '.bin', 'mocha')
    }))
    .on('error', function () {
      process.exit(1);
    });
});
<% } %><% if (frontendTests) { %>
gulp.task('<% if (backendTests) { %>karma<% } else { %>test<% } %>', ['templates'], function () {
  return new queue({objectMode: true})
    .queue(g.bowerFiles().pipe(g.filter('**/*.js')))
    .queue(gulp.src('./bower_components/angular-mocks/angular-mocks.js'))
    .queue(appFiles({includeTests: true}))
    .done()
    .pipe(g.karma({
      configFile: 'karma.conf.js',
      action: 'run'
    }));
});
<% } %><% if (backendTests && frontendTests) { %>
gulp.task('test', ['mocha', 'karma']);
<% } %>
<% if (dist) { %>
<% if (stylus) { %>
/**
 * All CSS files as a stream
 */
function cssFiles (opt) {
  return gulp.src('./.tmp/css/**/*.css', opt);
}
<% } %><% if (angular) { %>
/**
 * All AngularJS application files as a stream
 */
function appFiles (opt) {
  var files = [
    './.tmp/' + bower.name + '-templates.js',
    './src/app/**/*.js'
  ];
  opt = opt || {};
  if (!opt.includeTests) {
    files.push('!./src/app/**/*_test.js');
  }
  return gulp.src(files, opt)
    .pipe(sort(function (a, b) {
      if (dirname(a.path) === dirname(b.path)) {
        // Reverse sort if in same dir, to be able to load module definitions before their use
        // for Google AngularJS naming recommendations. (e.g. todo.js must come before todo-controller.js)
        return b.path.localeCompare(a.path);
      } else {
        // Otherwise, leave as is
        return 0;
      }
    }));
}

/**
 * All AngularJS templates/partials as a stream
 */
function templateFiles (opt) {
  return gulp.src(['./src/app/**/*.html', '!./src/app/index.html'], opt)
    .pipe(opt && opt.min ? g.htmlmin(htmlminOpts) : noop());
}

/**
 * Build AngularJS templates/partials
 */
function buildTemplates () {
  return lazypipe()
    .pipe(g.ngHtml2js, {
      moduleName: bower.name + '-templates',
      prefix: '/' + bower.name + '/',
      stripPrefix: '/src/app'
    })
    .pipe(g.concat, bower.name + '-templates.js')
    .pipe(gulp.dest, './.tmp')
    .pipe(livereload)();
}
<% } %>
/**
 * Concat, rename, minify
 *
 * @param {String} ext
 * @param {String} name
 * @param {Object} opt
 */
function dist (ext, name, opt) {
  opt = opt || {};
  return lazypipe()
    .pipe(g.concat, name + '.' + ext)
    .pipe(gulp.dest, './dist')<% if (angular) { %>
    .pipe(opt.ngmin ? g.ngmin : noop)
    .pipe(opt.ngmin ? g.rename : noop, name + '.annotated.' + ext)
    .pipe(opt.ngmin ? gulp.dest : noop, './dist')<% } %>
    .pipe(ext === 'js' ? g.uglify : g.minifyCss)
    .pipe(g.rename, name + '.min.' + ext)
    .pipe(gulp.dest, './dist')();
}

/**
 * Livereload (or noop if not run by watch)
 */
function livereload () {
  return lazypipe()
    .pipe(isWatching ? g.livereload : noop)();
}
<% } %>
/**
 * Jshint with stylish reporter
 */
function jshint (jshintfile) {
  return lazypipe()
    .pipe(g.jshint, jshintfile)
    .pipe(g.jshint.reporter, stylish)();
}
