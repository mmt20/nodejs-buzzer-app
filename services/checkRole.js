require("dotenv").config();

function checkRole(req, res, next) {
  if (res.locals.role == process.env.USER) {
    return res.sendStatus(401);
  } else {
    next();
  }
}
module.exports = { checkRole: checkRole };
