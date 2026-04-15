// equipment database
const equipmentDatabase = {
    weapons: [],
    armors: [],
    accessories: [],
};

// boss templates
const bossTemplates = {
    type1: {
        name: "Boss 1",
        health: 1000,
        attack: 50,
    },
    type2: {
        name: "Boss 2",
        health: 2000,
        attack: 100,
    },
};

// upgrade definitions
const upgradeDefinitions = {
    level1: {
        cost: 100,
        effects: {
            damageIncrease: 10,
            defenseIncrease: 5,
        },
    },
    level2: {
        cost: 200,
        effects: {
            damageIncrease: 20,
            defenseIncrease: 10,
        },
    },
};

module.exports = {
    equipmentDatabase,
    bossTemplates,
    upgradeDefinitions,
};