const path = require("path")
const { getModel } = require("./modelManager")

function loadModule(moduleName) {

    const model = getModel()

    const modulePath = path.join(
        __dirname,
        "..",
        "implementations",
        model,
        `${moduleName}.js`
    )

    delete require.cache[require.resolve(modulePath)]

    return require(modulePath)
}

module.exports = { loadModule }