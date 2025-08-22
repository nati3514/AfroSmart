'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('tokens', {
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
          model: 'users',
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
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
    });

    // Add indexes
    await queryInterface.addIndex('tokens', ['user_id']);
    await queryInterface.addIndex('tokens', ['token'], { unique: true });
    await queryInterface.addIndex('tokens', ['expires']);
    await queryInterface.addIndex('tokens', ['device_id']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('tokens');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_tokens_type;');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_tokens_device_type;');
  }
};
