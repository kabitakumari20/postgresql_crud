const user = require("./src/modules/User/routes/routes");
module.exports = [
  {
    path: "/api/user",
    handler: user,
  },
];
