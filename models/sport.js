'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Sport extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Sport.belongsTo(models.User, {
        foreignKey: 'createdBy',
        as: 'admin',
      });
      Sport.hasMany(models.Session, {
        foreignKey: 'sportId',
        as: 'sessions',
      });
    }
  }
  Sport.init({
    name: DataTypes.STRING,
    createdBy: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'Sport',
  });
  return Sport;
};