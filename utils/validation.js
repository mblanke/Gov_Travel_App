const Joi = require('joi');

// Flight search validation
const flightSearchSchema = Joi.object({
    origin: Joi.string()
        .min(2)
        .max(100)
        .required()
        .trim()
        .messages({
            'string.empty': 'Origin city is required',
            'string.min': 'Origin city must be at least 2 characters',
            'string.max': 'Origin city cannot exceed 100 characters'
        }),
    destination: Joi.string()
        .min(2)
        .max(100)
        .required()
        .trim()
        .messages({
            'string.empty': 'Destination city is required',
            'string.min': 'Destination city must be at least 2 characters',
            'string.max': 'Destination city cannot exceed 100 characters'
        }),
    departureDate: Joi.date()
        .iso()
        .min('now')
        .required()
        .messages({
            'date.base': 'Departure date must be a valid date',
            'date.min': 'Departure date cannot be in the past',
            'any.required': 'Departure date is required'
        }),
    returnDate: Joi.date()
        .iso()
        .min(Joi.ref('departureDate'))
        .optional()
        .allow(null, '')
        .messages({
            'date.base': 'Return date must be a valid date',
            'date.min': 'Return date must be after departure date'
        }),
    adults: Joi.number()
        .integer()
        .min(1)
        .max(9)
        .default(1)
        .messages({
            'number.base': 'Number of adults must be a number',
            'number.min': 'At least 1 adult is required',
            'number.max': 'Maximum 9 adults allowed'
        })
});

// Accommodation search validation
const accommodationSearchSchema = Joi.object({
    city: Joi.string()
        .min(2)
        .max(100)
        .required()
        .trim()
        .messages({
            'string.empty': 'City name is required',
            'string.min': 'City name must be at least 2 characters',
            'string.max': 'City name cannot exceed 100 characters'
        })
});

// City key validation
const cityKeySchema = Joi.object({
    cityKey: Joi.string()
        .min(2)
        .max(100)
        .required()
        .trim()
        .messages({
            'string.empty': 'City key is required'
        })
});

// Month validation
const monthSchema = Joi.object({
    cityKey: Joi.string().required(),
    month: Joi.number()
        .integer()
        .min(1)
        .max(12)
        .required()
        .messages({
            'number.min': 'Month must be between 1 and 12',
            'number.max': 'Month must be between 1 and 12',
            'any.required': 'Month is required'
        })
});

// Validation middleware factory
const validate = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.query, {
            abortEarly: false,
            stripUnknown: true
        });

        if (error) {
            const errors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }));

            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors
            });
        }

        // Replace req.query with validated and sanitized values
        req.query = value;
        next();
    };
};

module.exports = {
    validate,
    flightSearchSchema,
    accommodationSearchSchema,
    cityKeySchema,
    monthSchema
};
