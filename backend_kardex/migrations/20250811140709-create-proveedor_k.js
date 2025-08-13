'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('proveedor_k', {
      id_proveedor_k:{
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
    await queryInterface.dropTable('proveedor_k');
  }
};