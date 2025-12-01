import * as title_crud from './title_basics_crud.services.js'

export const registry = {
  CREATE_TITLE: {
    validate: async (payload) => {
      await title_crud.canBeCreated(payload.data);
      return true
    },
    execute: async (payload) => {
      await title_crud.createTitle(payload.data);
    }
  },
  UPDATE_TITLE: {
    validate: async (payload) => {
      const title = await title_crud.findById(payload.id);
      return true
    },
    execute: async (payload) => {
      await title_crud.updateTitle(payload.id, payload.data);
    }
  },
  DELETE_TITLE: {
    validate: async (payload) => {
      const title = await title_crud.findById(payload.id);
      return true
    },
    execute: async (payload) => {
      await title_crud.deleteTitle(payload.id);
    }
  }
}