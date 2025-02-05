'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Session extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Session.belongsTo(models.Sport, {
        foreignKey: 'sportId',
        as: 'sport',
      });

      // A session is created by a user (player/admin)
      Session.belongsTo(models.User, {
        foreignKey: 'createdBy',
        as: 'creator',
      });
    }
  }
  Session.init({
    sportId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    team1Players: DataTypes.STRING,
    team2Players: DataTypes.STRING,
    additionalPlayers: DataTypes.INTEGER,
    dateTime: DataTypes.DATE,
    venue: DataTypes.STRING,
    status: DataTypes.STRING,
    cancelReason: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'Session',
  });
  return Session;
};