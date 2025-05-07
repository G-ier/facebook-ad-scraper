// rsoc - boardId: 8457550521,
// leadgen - boardId: 8677967720,
// afd - boardId: 6842595722,

const TYPE_MAP = {
    'rsoc': {
      boardId: '8457550521',
      fileName: 'Rsoc'
    },
    'leadgen': {
      boardId: '8677967720',
      fileName: 'LeadGen'
    },
    'afd': {
      boardId: '6842595722',
      fileName: 'AFD'
    }
  };
  
  /**
   * Gets the board configuration from the maps folder based on type
   * @param {string} type - The type of board to get (rsoc, leadgen, afd)
   * @returns {Object|null} - The board configuration or null if not found
   */
  const getBoard = (type) => {
    try {
      if (!type || !TYPE_MAP[type.toLowerCase()]) return null;
      
      // Normalize type to lowercase for consistency
      type = type.toLowerCase();
      
      // Require the board from the maps folder
      const map = require(`./maps/${TYPE_MAP[type].fileName}`);
      return map;
    } catch (error) {
      console.error(`Error getting board for type ${type}:`, error);
      return null;
    }
  };
  
  module.exports = { getBoard };  