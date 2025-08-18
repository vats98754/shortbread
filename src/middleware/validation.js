// Validation middleware for video endpoints

function validateVideoSaveRequest(req, res, next) {
  const { url, userId } = req.body;
  const errors = [];

  // Validate URL
  if (!url) {
    errors.push('URL is required');
  } else if (typeof url !== 'string') {
    errors.push('URL must be a string');
  } else if (url.trim().length === 0) {
    errors.push('URL cannot be empty');
  } else {
    // Basic URL format validation
    try {
      new URL(url);
    } catch (error) {
      errors.push('URL must be a valid URL');
    }
  }

  // Validate userId
  if (!userId) {
    errors.push('userId is required');
  } else if (typeof userId !== 'string') {
    errors.push('userId must be a string');
  } else if (userId.trim().length === 0) {
    errors.push('userId is required');
  } else if (userId.length > 255) {
    errors.push('userId must be less than 255 characters');
  }

  // Check for additional unexpected fields
  const allowedFields = ['url', 'userId'];
  const extraFields = Object.keys(req.body).filter(field => !allowedFields.includes(field));
  if (extraFields.length > 0) {
    errors.push(`Unexpected fields: ${extraFields.join(', ')}`);
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors
    });
  }

  next();
}

function validatePagination(req, res, next) {
  const { limit, offset } = req.query;
  const errors = [];

  if (limit !== undefined) {
    const limitNum = parseInt(limit);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      errors.push('limit must be a number between 1 and 100');
    }
  }

  if (offset !== undefined) {
    const offsetNum = parseInt(offset);
    if (isNaN(offsetNum) || offsetNum < 0) {
      errors.push('offset must be a non-negative number');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors
    });
  }

  next();
}

function validateUUID(req, res, next) {
  const { id } = req.params;
  
  // Basic UUID format validation (simplified)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  
  if (!uuidRegex.test(id)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid video ID format'
    });
  }

  next();
}

module.exports = {
  validateVideoSaveRequest,
  validatePagination,
  validateUUID
};