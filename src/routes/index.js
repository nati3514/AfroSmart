const express = require('express');
const authRoute = require('./auth.routes');
const userRoute = require('./user.routes');
const todoRoute = require('./todo.routes');
const docsRoute = require('./docs.route');
const config = require('../config/config');

const router = express.Router();

const defaultRoutes = [
  {
    path: '/auth',
    route: authRoute,
  },
  {
    path: '/users',
    route: userRoute,
  },
  {
    path: '/todos',
    route: todoRoute,
  },
  // Docs route available in all environments
  {
    path: '/docs',
    route: docsRoute,
  },
];

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

module.exports = router;
