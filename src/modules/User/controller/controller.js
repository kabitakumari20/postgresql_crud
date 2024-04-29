const { getList, registerUser } = require("../businees/business");

exports.registerUser = async (req, res) => registerUser(req, res); //

exports.getList = async (req, res) => getList(req, res);
