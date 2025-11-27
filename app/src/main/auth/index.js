const CHANNELS = require("../../global/ipcChannels.cjs");
const { registerAuthEvents } = require("../../modules/auth/authEvents");

function wireAuth(sendToRenderer) {
    registerAuthEvents({
        onLoginSuccess: (detail) => sendToRenderer(CHANNELS.AUTH_CONTINUE, detail),
        onLoginCancel: () => sendToRenderer(CHANNELS.AUTH_CANCELLED),
    });
}

module.exports = { wireAuth };
