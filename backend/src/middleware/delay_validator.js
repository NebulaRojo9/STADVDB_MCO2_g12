export const formatDelay = (req, res, next) => {
  req.body = req.body || {}; 
  let delay = req.body.delay || req.query.delay;

  if (delay === undefined || delay === null) {
    return next()
  }

  const delayInt = parseInt(delay, 10);

  if (isNaN(delayInt)) {
    return res.status(400).json({
      success: false,
      error: "Invalid Parameter: 'delay' must be a number."
    });
  }

  // normalize to body (should be present even if delay is only in query parameter)
  req.body.delay = delayInt;

  next();
};