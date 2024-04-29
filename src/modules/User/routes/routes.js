let express = require("express");
let router = express.Router(),
  { getList,
    registerUser } = require("../controller/controller");

const { authenticate } = require("../../../middlewares/jwt.middleware");

const { wrapAsync } = require("../../../helpers/router.helper");

router.post("/registerUser", (registerUser));
router.get("/getList", wrapAsync(getList));

module.exports = router;
