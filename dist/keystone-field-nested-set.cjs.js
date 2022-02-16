'use strict';

if (process.env.NODE_ENV === "production") {
  module.exports = require("./keystone-field-nested-set.cjs.prod.js");
} else {
  module.exports = require("./keystone-field-nested-set.cjs.dev.js");
}
