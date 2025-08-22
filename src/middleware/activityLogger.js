const { ActivityLog } = require('../models');

const activityLogger = async (req, res, next) => {
  // Skip logging for these paths
  const excludedPaths = ['/health', '/metrics', '/favicon.ico'];
  if (excludedPaths.includes(req.path)) {
    return next();
  }

  // Store the original response methods
  const oldSend = res.send;
  const oldJson = res.json;
  
  // Create a buffer to store the response body
  const responseChunks = [];
  
  // Override response methods to capture the response body
  res.send = function (body) {
    if (body) {
      responseChunks.push(body);
    }
    return oldSend.apply(res, arguments);
  };
  
  res.json = function (body) {
    if (body) {
      responseChunks.push(JSON.stringify(body));
    }
    return oldJson.apply(res, arguments);
  };
  
  // Get the response body after the response is sent
  res.on('finish', async () => {
    try {
      // Skip if no user is authenticated
      if (!req.user) return;
      
      // Get the response body if available
      let responseBody = null;
      if (responseChunks.length > 0) {
        try {
          responseBody = JSON.parse(responseChunks[0]);
        } catch (e) {
          responseBody = responseChunks[0];
        }
      }
      
      // Log the activity
      await ActivityLog.create({
        action: `${req.method} ${req.path}`,
        entityType: req.baseUrl.replace('/api/', ''),
        entityId: req.params.id || null,
        previousState: req.body && Object.keys(req.body).length > 0 ? req.body : null,
        newState: responseBody || null,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        userId: req.user.id,
      });
    } catch (error) {
      console.error('Activity logging failed:', error);
    }
  });
  
  next();
};

module.exports = activityLogger;
