import { DataTypes } from 'sequelize';

const activityLogModel = (sequelize) => {
  const ActivityLog = sequelize.define('ActivityLog', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    action: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    entityType: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    entityId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    statusCode: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    requestId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    previousState: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    newState: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    ipAddress: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
  }, {
    tableName: 'activity_logs',
    timestamps: true,
    indexes: [
      {
        fields: ['userId'],
      },
      {
        fields: ['entityType', 'entityId'],
      },
      {
        fields: ['createdAt'],
      },
      {
        fields: ['action'],
      },
    ],
  });

  // Set up associations
  ActivityLog.associate = (models) => {
    ActivityLog.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'activityLogs',
      onDelete: 'SET NULL',
    });
  };

  return ActivityLog;
};

export default activityLogModel;
