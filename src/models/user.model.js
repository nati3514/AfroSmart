import { DataTypes } from 'sequelize';
import bcrypt from 'bcrypt';
import config from '../config/config.js';

const userModel = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      trim: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      trim: true,
      lowercase: true,
      validate: {
        isEmail: true,
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [8],
      },
    },
    role: {
      type: DataTypes.ENUM('user', 'admin'),
      defaultValue: 'user',
    },
    isEmailVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    lastLogin: {
      type: DataTypes.DATE,
    },
    passwordChangedAt: {
      type: DataTypes.DATE,
    },
    passwordResetToken: {
      type: DataTypes.STRING,
    },
    passwordResetExpires: {
      type: DataTypes.DATE,
    },
    emailVerificationToken: {
      type: DataTypes.STRING,
    },
    emailVerificationExpires: {
      type: DataTypes.DATE,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  }, {
    tableName: 'users',
    timestamps: true,
    hooks: {
      beforeSave: async (user) => {
        if (user.changed('password')) {
          user.password = await bcrypt.hash(user.password, config.bcrypt.saltRounds);
          user.passwordChangedAt = Date.now() - 1000; // Ensure token is created after password change
        }
      },
    },
  });

  // Instance method to check if password matches
  User.prototype.isPasswordMatch = async function(password) {
    return bcrypt.compare(password, this.password);
  };
  
  // Class method to check if email is taken
  User.isEmailTaken = async function(email, excludeUserId) {
    const where = { email };
    if (excludeUserId) {
      where.id = { [sequelize.Sequelize.Op.ne]: excludeUserId };
    }
    const user = await this.findOne({ where });
    return !!user;
  };

  // Instance method to check if password was changed after a given timestamp
  User.prototype.changedPasswordAfter = function(JWTTimestamp) {
    if (this.passwordChangedAt) {
      const changedTimestamp = parseInt(
        this.passwordChangedAt.getTime() / 1000,
        10
      );
      return JWTTimestamp < changedTimestamp;
    }
    return false;
  };

  // Instance method to create password reset token
  User.prototype.createPasswordResetToken = function() {
    const resetToken = crypto.randomBytes(32).toString('hex');
    this.passwordResetToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    return resetToken;
  };

  // Instance method to create email verification token
  User.prototype.createEmailVerificationToken = function() {
    const verificationToken = crypto.randomBytes(32).toString('hex');
    this.emailVerificationToken = crypto
      .createHash('sha256')
      .update(verificationToken)
      .digest('hex');
    this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    return verificationToken;
  };

  // Set up associations
  User.associate = (models) => {
    // User has many Todos
    User.hasMany(models.Todo, {
      foreignKey: 'userId',
      as: 'todoUser',
      onDelete: 'CASCADE'
    });
    
    // User has many ActivityLogs
    User.hasMany(models.ActivityLog, {
      foreignKey: 'userId',
      as: 'activityLogs',
      onDelete: 'SET NULL'
    });
    
    // User has many Tokens
    User.hasMany(models.Token, {
      foreignKey: 'userId',
      as: 'tokenUser',
      onDelete: 'CASCADE'
    });
  };

  return User;
};

export default userModel;
