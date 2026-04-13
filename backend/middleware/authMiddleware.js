// CHECK IF USER IS LOGGED IN
exports.protect = (req, res, next) => {
  const role = req.headers.role;

  if (!role) {
    return res.status(401).json({ message: "Unauthorized - No role provided" });
  }

  req.user = { role };
  next();
};

// ROLE-BASED ACCESS CONTROL
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden - Access denied" });
    }
    next();
  };
};