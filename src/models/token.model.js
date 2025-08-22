import { DataTypes } from 'sequelize';
import crypto from 'crypto';

const tokenModel = (sequelize) => {
  const Token = sequelize.define('Token', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    token: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    type: {
      type: DataTypes.ENUM('access', 'refresh', 'resetPassword', 'verifyEmail'),
      allowNull: false,
    },
    expires: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    blacklisted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    device_id: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
      comment: 'Unique identifier for the device',
    },
    device_name: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: 'Unknown Device',
      comment: 'Human-readable device name',
    },
    device_type: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: 'web',
    },
    created_by_ip: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    last_used_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },
  }, {
    tableName: 'tokens',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['user_id'] },
      { fields: ['token'], unique: true },
      { fields: ['expires'] },
      { fields: ['device_id'] },
    ],
  });

  // Set up associations
  Token.associate = (models) => {
    Token.belongsTo(models.User, {
      foreignKey: 'userId', 
      as: 'tokenUser',
    });
  };

  // Add hooks
  Token.beforeCreate((token) => {
    // Ensure device_id is set for refresh tokens
    if (token.type === 'refresh' && !token.device_id) {
      token.device_id = `device_${crypto.randomBytes(8).toString('hex')}`;
    }
  });

  // Static method to generate a random token
  Token.generateToken = function() {
    return crypto.randomBytes(32).toString('hex');
  };

  // Instance method to mark token as used
  Token.prototype.markAsUsed = async function() {
    this.last_used_at = new Date();
    return this.save();
  };

  return Token;
};

export default tokenModel;
