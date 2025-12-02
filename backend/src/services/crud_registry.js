import * as title_crud from './title_basics_crud.services.js'

export const registry = {
  CREATE_TITLE: {
    lockType: 'EXCLUSIVE',
    validate: async (payload) => {
      await title_crud.canBeCreated(payload.data, payload.delay);
      return true
    },
    execute: async (payload) => {
      await title_crud.createTitle(payload.data, payload.delay);
    }
  },
  READ_TITLE: {
    lockType: 'SHARED',
    validate: async (payload) => {
      await title_crud.findById(payload.id, payload.delay);
      return true
    },
    execute: async (payload) => {
      return await title_crud.findById(payload.id, payload.delay);
    }
  },
  UPDATE_TITLE: {
    lockType: 'EXCLUSIVE',
    validate: async (payload) => {
      const title = await title_crud.findById(payload.id, payload.delay);
      return true
    },
    execute: async (payload) => {
      await title_crud.updateTitle(payload.id, payload.data, payload.delay);
    }
  },
  DELETE_TITLE: {
    lockType: 'EXCLUSIVE',
    validate: async (payload) => {
      const title = await title_crud.findById(payload.id, payload.delay);
      return true
    },
    execute: async (payload) => {
      await title_crud.deleteTitle(payload.id, payload.delay);
    }
  }
}