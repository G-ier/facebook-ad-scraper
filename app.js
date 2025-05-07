const express = require('express');
const app = express();
const router = express.Router();
const cors = require('cors');
const bodyParser = require('body-parser');

var corsOptions = {
  origin: ['*'],
  credentials: false,
  optionsSuccessStatus: 200,
};

router.use(cors(corsOptions));
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));

// Import routes
const routes = require('./src/routes/index');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Use routes
app.use('/', routes);

module.exports = app;
