import { DataTypes } from 'sequelize';

const todoModel = (sequelize) => {
  const Todo = sequelize.define('Todo', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      trim: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('pending', 'in_progress', 'completed'),
      defaultValue: 'pending',
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high'),
      defaultValue: 'medium',
    },
    dueDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  }, {
    tableName: 'todos',
    timestamps: true,
  });

  // Set up associations
  Todo.associate = (models) => {
    Todo.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'todoUser',
      onDelete: 'CASCADE',
    });
  };

  return Todo;
};

export default todoModel;
