const FruitModel = require('../model/fruitModel');

class FruitCalculationService {
    //To calculate the total price of the fruits
    //Changed from selling by the number of pieces to selling by the kilo.
    static async calculateTotalPrice(fruitId, weight) {
        const fruit = await FruitModel.getFruitById(fruitId);
        if (!fruit) {
            throw new Error('Fruit not found');
        }
        return fruit.price * weight;
    }
}

module.exports = FruitCalculationService;