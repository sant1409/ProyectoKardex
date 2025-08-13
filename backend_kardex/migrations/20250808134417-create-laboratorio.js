'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('laboratorio', {
      id_laboratorio: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      nombre: {
        type: Sequelize.STRING,
        allowNull: true
      }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('laboratorio');
  }
};
