import httpStatus from 'http-status';
import Joi from 'joi';
import pick from '../utils/pick.js';
import ApiError from '../utils/ApiError.js';

/**
 * Validates the request against the provided schema
 * @param {Object} schema - Joi validation schema
 * @returns {Function} Express middleware function
 */
const validate = (schema) => (req, res, next) => {
  // Define the validation schema for request parameters
  const validSchema = pick(schema, ['params', 'query', 'body']);
  
  // Define the object to validate against the schema
  const object = pick(req, Object.keys(validSchema));
  
  // Validate the object against the schema
  const { value, error } = Joi.compile(validSchema)
    .prefs({ errors: { label: 'key' }, abortEarly: false })
    .validate(object);

  // If validation fails, throw an error
  if (error) {
    const errorMessage = error.details.map((details) => details.message).join(', ');
    return next(new ApiError(httpStatus.BAD_REQUEST, errorMessage));
  }

  // If validation passes, assign the validated values to the request object
  Object.assign(req, value);
  return next();
};

export default validate;
