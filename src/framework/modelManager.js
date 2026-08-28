const fs = require("fs")
const path = require("path")

const implementationsDir = path.join(__dirname, "..", "implementations")

let currentModel = "gpt"

// Discover available models from the directory names under src/implementations/.
// Adding a new folder (e.g. ollama/) makes it selectable with no other change.
function listModels() {
    return fs
        .readdirSync(implementationsDir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
}

function getModel() {
    return currentModel
}

function setModel(model) {
    // Only activate a model that actually exists on disk, so an unknown or
    // missing folder can't be selected and later crash the loader.
    if (listModels().includes(model)) {
        currentModel = model
        return true
    }
    return false
}

module.exports = {
    listModels,
    getModel,
    setModel
}
