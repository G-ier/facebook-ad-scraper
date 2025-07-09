// Third party imports
const axios = require('axios');
const _ = require('lodash');
const moment = require('moment-timezone');
// Internal imports
const { getBoard } = require('../../utils/helpers');
const DatabaseRepository = require('../lib/DatabaseRepository');

class PlainService {
  constructor(type) {
    this.baseAPIUrl = "https://api.monday.com/v2";
    this.name = type;
    this.boardMap = getBoard(type);
    this.apiKey = process.env.MONDAY_API_KEY;
    this.databaseRepository = new DatabaseRepository();
    this.pageSize = 100; // Default page size
    this.boardId = null;
  }

  async changeBoardMap(type) {
    const map = getBoard(type);
    this.boardMap = map;
    this.boardId = map.boardId;
  }

  // Update Monday Item
  async updateColumnValues(itemId, columnValues) {
    
    const query = `
      mutation ($boardId: ID!, $itemId: ID!, $columnValues: JSON!) {
        change_multiple_column_values (board_id: $boardId, item_id: $itemId, column_values: $columnValues) {
          id
        }
      }
    `;

    const variables = {
      boardId: this.boardId,
      itemId: itemId,
      columnValues: JSON.stringify(columnValues)
    };

    const requestFunction = async () => {
      const response = await axios.post(
        this.baseAPIUrl,
        {
          query: query,
          variables: variables
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data.data.change_multiple_column_values ? true : false;
    };

    return this._requestWithRetries(requestFunction);
  }

  async store(itemId, scrapedObject) {
    // Convert the input object directly to column values
    const columnValues = {};
    
    // Map each key in the scrapedObject to its corresponding column ID in the board map
    for (const [key, value] of Object.entries(scrapedObject)) {
      if (this.boardMap.columnMappings[key]) {
        columnValues[this.boardMap.columnMappings[key]] = value;
      }
    }
    
    return this.updateColumnValues(itemId, columnValues);
  }

}   

module.exports = PlainService;
