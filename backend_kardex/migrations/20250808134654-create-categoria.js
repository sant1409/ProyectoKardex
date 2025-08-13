
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('categoria', {
      id_categoria: {
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
    await queryInterface.dropTable('categoria');
  }
};