// const { User } = require("../module/user/model/user.model");
// const { errorHandler } = require("../helpers/errorHandling.helper");
// const {logger} = require('../helpers/logger')

// exports.authenticate = async (req, res, next) => {
//   try {
//     const auth = req.header("Authorization");
//     if (!auth) {
//       logger.error('No Authorization header provided');
//       throw new Error('UnAuthorized');
//     }

//     const token = auth.substr(auth.indexOf(" ") + 1);
//     const user = await User.findByToken(token, res);

//     if (!user) {
//       logger.error('Invalid token provided');
//       throw new Error('UnAuthorized Request');
//     }

//     req.user = user;
//     logger.info('Authentication successful');
//     return next();
    
//   } catch (err) {
//     const error = errorHandler(err, 401);
//     logger.error(error.message);
//     return res.status(error.status).send(error);
//   }
// };