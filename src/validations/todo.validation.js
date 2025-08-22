import Joi from 'joi';

const createTodo = {
  body: Joi.object().keys({
    title: Joi.string().required(),
    description: Joi.string().allow(''),
    status: Joi.string().valid('pending', 'in_progress', 'completed').default('pending'),
    priority: Joi.string().valid('low', 'medium', 'high').default('medium'),
    dueDate: Joi.date().iso(),
  }),
};

const getTodos = {
  query: Joi.object().keys({
    status: Joi.string().valid('pending', 'in_progress', 'completed'),
    priority: Joi.string().valid('low', 'medium', 'high'),
    search: Joi.string(),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getTodo = {
  params: Joi.object().keys({
    id: Joi.string().required(),
  }),
};

const updateTodo = {
  params: Joi.object().keys({
    id: Joi.string().required(),
  }),
  body: Joi.object()
    .keys({
      title: Joi.string(),
      description: Joi.string().allow(''),
      status: Joi.string().valid('pending', 'in_progress', 'completed'),
      priority: Joi.string().valid('low', 'medium', 'high'),
      dueDate: Joi.date().iso(),
    })
    .min(1),
};

const toggleTodoStatus = {
  params: Joi.object().keys({
    id: Joi.string().required(),
  }),
};

const deleteTodo = {
  params: Joi.object().keys({
    id: Joi.string().required(),
  }),
};

export {
  createTodo,
  getTodos,
  getTodo,
  updateTodo,
  toggleTodoStatus,
  deleteTodo,
};

export default {
  createTodo,
  getTodos,
  getTodo,
  updateTodo,
  toggleTodoStatus,
  deleteTodo,
};
