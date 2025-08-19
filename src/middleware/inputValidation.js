// Middleware to validate and sanitize inputs
export const validateInputs = (req, res, next) => {
  // Check for potentially malicious input patterns
  const maliciousPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, // Script tags
    /javascript:/gi, // JavaScript URLs
    /vbscript:/gi, // VBScript URLs
    /on\w+\s*=/gi, // Event handlers
    /%3Cscript/gi, // URL encoded script tags
    /\.\.\/\.\./gi, // Directory traversal
  ];
  
  // Validate request body
  if (req.body) {
    const bodyString = JSON.stringify(req.body);
    for (const pattern of maliciousPatterns) {
      if (pattern.test(bodyString)) {
        return res.status(400).json({ error: 'Invalid input detected' });
      }
    }
  }
  
  // Validate query parameters
  const queryString = JSON.stringify(req.query);
  for (const pattern of maliciousPatterns) {
    if (pattern.test(queryString)) {
      return res.status(400).json({ error: 'Invalid input detected' });
    }
  }
  
  // Validate URL parameters
  const paramsString = JSON.stringify(req.params);
  for (const pattern of maliciousPatterns) {
    if (pattern.test(paramsString)) {
      return res.status(400).json({ error: 'Invalid input detected' });
    }
  }
  
  next();
};
