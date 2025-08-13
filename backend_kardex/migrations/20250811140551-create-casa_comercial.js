'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('casa_comercial', {
      id_casa_comercial: {
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
    await queryInterface.dropTable('casa_comercial');
  }
};