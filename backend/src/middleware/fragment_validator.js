export const requireStartYear = (req, res, next) => {
  req.body = req.body || {}; 
  let startYear = req.body.startYear || req.query.startYear;

  if (startYear === undefined || startYear === null) {
    return res.status(400).json({
      success: false,
      error: "Missing Fragment Key: 'startYear' is required in the Request Body or Query Parameters."
    });
  }

  const yearInt = parseInt(startYear, 10);

  if (isNaN(yearInt)) {
    return res.status(400).json({
      success: false,
      error: "Invalid Fragment Key: 'startYear' must be a number."
    });
  }

  // normalize to body (should be present even if startYear is only in query parameter)
  req.body.startYear = yearInt;

  next();
};