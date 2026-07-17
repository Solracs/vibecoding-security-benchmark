let currentModel = "gpt"

function getModel() {
    return currentModel
}

function setModel(model) {
    currentModel = model
}

module.exports = {
    getModel,
    setModel
}