let currentModel = process.env.DEFAULT_MODEL || "gpt"

function getCurrentModel() {
    return currentModel
}

function setCurrentModel(model) {
    currentModel = model
}

module.exports = {
    getCurrentModel,
    setCurrentModel
}