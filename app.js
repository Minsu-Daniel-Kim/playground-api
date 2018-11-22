const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors');

require('dotenv').load();

const indexRouter = require('./routes/index');
const cardsRouter = require('./routes/cards');
const submissionsRouter = require('./routes/submissions');
const usersRouter = require('./routes/users');
const projectsRouter = require('./routes/projects');
const adminRouter = require('./routes/admin');
const tpmRouter = require('./routes/tpms');
const testRouter = require('./routes/tests');
const oauthRouter = require('./routes/oauth');
const transactionRouter = require('./routes/transactions');

const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors({
  'allowedHeaders': ['sessionId', 'Content-Type'],
  'exposedHeaders': ['Content-Range', 'X-Content-Range'],
  'origin': ['http://localhost', 'http://localhost:3000', 'https://snowball-front.herokuapp.com', 'http://snowball-front.herokuapp.com'],
  'methods': 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  'credentials': true,
  'preflightContinue': false
}));

/**
 * Set Express Route
 */
app.use('/', indexRouter);
app.use('/cards', cardsRouter);
app.use('/users', usersRouter);
app.use('/projects', projectsRouter);
app.use('/submissions', submissionsRouter);
app.use('/admin', adminRouter);
app.use('/tpm', tpmRouter);
app.use('/oauth', oauthRouter);
app.use('/transactions', transactionRouter);
// test apis
app.use('/test', testRouter);



// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;