'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Add new columns
      await queryInterface.addColumn(
        'tokens',
        'device_id',
        {
          type: Sequelize.STRING,
          allowNull: true,
          comment: 'Unique identifier for the device'
        },
        { transaction }
      );

      await queryInterface.addColumn(
        'tokens',
        'device_name',
        {
          type: Sequelize.STRING,
          allowNull: true,
          comment: 'Human-readable device name'
        },
        { transaction }
      );

      await queryInterface.addColumn(
        'tokens',
        'device_type',
        {
          type: Sequelize.ENUM('web', 'mobile', 'tablet', 'desktop', 'other'),
          defaultValue: 'web',
          allowNull: false
        },
        { transaction }
      );

      await queryInterface.addColumn(
        'tokens',
        'last_used_at',
        {
          type: Sequelize.DATE,
          allowNull: true
        },
        { transaction }
      );

      await queryInterface.addColumn(
        'tokens',
        'created_by_ip',
        {
          type: Sequelize.STRING,
          allowNull: true
        },
        { transaction }
      );

      // Add indexes
      await queryInterface.addIndex('tokens', ['device_id'], { transaction });
      await queryInterface.addIndex('tokens', ['expires'], { transaction });

      // Update existing tokens with default values
      await queryInterface.sequelize.query(
        "UPDATE tokens SET device_type = 'web' WHERE device_type IS NULL",
        { transaction }
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Remove indexes first
      await queryInterface.removeIndex('tokens', ['device_id'], { transaction });
      await queryInterface.removeIndex('tokens', ['expires'], { transaction });

      // Remove columns
      await queryInterface.removeColumn('tokens', 'device_id', { transaction });
      await queryInterface.removeColumn('tokens', 'device_name', { transaction });
      await queryInterface.removeColumn('tokens', 'last_used_at', { transaction });
      await queryInterface.removeColumn('tokens', 'created_by_ip', { transaction });
      
      // Remove enum type after removing the column that uses it
      await queryInterface.removeColumn('tokens', 'device_type', { transaction });
      
      // Remove the enum type
      await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS "enum_tokens_device_type"',
        { transaction }
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
