'use strict';

module.exports = {
 async up (queryInterface, Sequelize) {
  await queryInterface.createTable('presentacion_k', {
    id_presentacion_k:{
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
    await queryInterface.dropTable('presentacion_k');
  }
};
