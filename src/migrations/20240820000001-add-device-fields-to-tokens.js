'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('tokens', 'device_id', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Unique identifier for the device',
    });

    await queryInterface.addColumn('tokens', 'device_name', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Human-readable device name',
    });

    await queryInterface.addColumn('tokens', 'device_type', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('tokens', 'device_id');
    await queryInterface.removeColumn('tokens', 'device_name');
    await queryInterface.removeColumn('tokens', 'device_type');
  },
};
