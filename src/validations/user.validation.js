import Joi from 'joi';

const createUser = {
  body: Joi.object().keys({
    name: Joi.string().required(),
    email: Joi.string().required().email(),
    password: Joi.string().required().min(8),
    role: Joi.string().valid('user', 'admin').default('user'),
  }),
};

const getUsers = {
  query: Joi.object().keys({
    name: Joi.string(),
    role: Joi.string(),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getUser = {
  params: Joi.object().keys({
    id: Joi.string().required(),
  }),
};

const updateUser = {
  params: Joi.object().keys({
    id: Joi.string().required(),
  }),
  body: Joi.object()
    .keys({
      name: Joi.string(),
      email: Joi.string().email(),
      role: Joi.string().valid('user', 'admin'),
    })
    .min(1),
};

const updateProfile = {
  body: Joi.object()
    .keys({
      name: Joi.string(),
      email: Joi.string().email(),
    })
    .min(1),
};

const updatePassword = {
  body: Joi.object().keys({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().required().min(8),
  }),
};

const deleteUser = {
  params: Joi.object().keys({
    id: Joi.string().required(),
  }),
};

export {
  createUser,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  updateProfile,
  updatePassword,
};

export default {
  createUser,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  updateProfile,
  updatePassword,
};
