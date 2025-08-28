const config = require('../settings');

const PresenceControl = async (popkid, update) => {
    try {
        // If ALWAYS_ONLINE is true, keep bot online 24/7
        if (config.ALWAYS_ONLINE === "true") {
            await popkid.sendPresenceUpdate("available", update.id);
            return;
        }

        // Get the user's actual presence from their device
        const userPresence = update.presences[update.id]?.lastKnownPresence;
        
        // Only update presence if we have valid data
        if (userPresence) {
            // Convert WhatsApp presence to Baileys presence
            let presenceState;
            switch(userPresence) {
                case 'available':
                case 'online':
                    presenceState = 'available';
                    break;
                case 'unavailable':
                case 'offline':
                    presenceState = 'unavailable';
                    break;
                case 'composing':
                case 'recording':
                    // Don't override typing/recording states when auto features are enabled
                    if (config.AUTO_TYPING === 'true' || config.AUTO_RECORDING === 'true') {
                        return;
                    }
                    presenceState = 'available';
                    break;
                default:
                    presenceState = 'unavailable';
            }
            
            await popkid.sendPresenceUpdate(presenceState, update.id);
        }
    } catch (err) {
        console.error('[Presence Error]', err);
    }
};

// Modified handler to allow auto typing/recording
const BotActivityFilter = (popkid) => {
    // Store original methods
    const originalSendMessage = popkid.sendMessage;
    const originalSendPresenceUpdate = popkid.sendPresenceUpdate;

    // Override sendMessage to prevent automatic presence updates
    popkid.sendMessage = async (jid, content, options) => {
        const result = await originalSendMessage(jid, content, options);
        // Only reset presence if auto features are disabled
        if (config.AUTO_TYPING !== 'true' && config.AUTO_RECORDING !== 'true') {
            await originalSendPresenceUpdate('unavailable', jid);
        }
        return result;
    };

    // Override sendPresenceUpdate to filter bot-initiated presence
    popkid.sendPresenceUpdate = async (type, jid) => {
        // Allow presence updates from PresenceControl or auto features
        const stack = new Error().stack;
        if (stack.includes('PresenceControl') || 
            (type === 'composing' && config.AUTO_TYPING === 'true') ||
            (type === 'recording' && config.AUTO_RECORDING === 'true')) {
            return originalSendPresenceUpdate(type, jid);
        }
    };
};

module.exports = { PresenceControl, BotActivityFilter };