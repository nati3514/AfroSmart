'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create Users table
    await queryInterface.createTable('Users', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
        },
      },
      password: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      role: {
        type: Sequelize.ENUM('user', 'admin'),
        defaultValue: 'user',
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      isEmailVerified: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      lastLogin: {
        type: Sequelize.DATE,
      },
      passwordChangedAt: {
        type: Sequelize.DATE,
      },
      passwordResetToken: {
        type: Sequelize.STRING,
      },
      passwordResetExpires: {
        type: Sequelize.DATE,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      deletedAt: {
        type: Sequelize.DATE,
      },
    });

    // Create Tokens table
    await queryInterface.createTable('Tokens', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      token: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      type: {
        type: Sequelize.ENUM('access', 'refresh', 'resetPassword', 'verifyEmail'),
        allowNull: false,
      },
      expires: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      blacklisted: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      device_id: {
        type: Sequelize.STRING,
      },
      device_name: {
        type: Sequelize.STRING,
      },
      device_type: {
        type: Sequelize.ENUM('web', 'mobile', 'tablet', 'desktop', 'other'),
        defaultValue: 'web',
      },
      created_by_ip: {
        type: Sequelize.STRING,
      },
      last_used_at: {
        type: Sequelize.DATE,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
    });

    // Add indexes
    await queryInterface.addIndex('Tokens', ['user_id']);
    await queryInterface.addIndex('Tokens', ['token'], { unique: true });
    await queryInterface.addIndex('Tokens', ['expires']);
    await queryInterface.addIndex('Tokens', ['device_id']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Tokens');
    await queryInterface.dropTable('Users');
    
    // Drop enums
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Users_role";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Tokens_type";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Tokens_device_type";');
  },
};
