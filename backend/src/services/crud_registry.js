import * as title_crud from './title_basics_crud.services.js'

export const registry = {
  CREATE_TITLE: {
    lockType: 'EXCLUSIVE',
    validate: async (payload) => {
      await title_crud.canBeCreated(payload.data);
      return true
    },
    execute: async (payload) => {
      await title_crud.createTitle(payload.data);
    }
  },
  READ_TITLE: {
    lockType: 'SHARED',
    validate: async (payload) => {
      await title_crud.findById(payload.id);
      return true
    },
    execute: async (payload) => {
      return await title_crud.findById(payload.id);
    }
  },
  UPDATE_TITLE: {
    lockType: 'EXCLUSIVE',
    validate: async (payload) => {
      const title = await title_crud.findById(payload.id);
      return true
    },
    execute: async (payload) => {
      // Never attempt to change the primary key or shard key in an UPDATE.
      // The DB layer will reject updates that touch `tconst`, and `startYear`
      // is only used for fragmentation / routing, not as an updatable column.
      const { tconst, startYear, ...safeUpdates } = payload.data || {};

      // If there is nothing left to update (e.g. only tconst/startYear were sent),
      // just no-op successfully so the transaction can commit cleanly.
      if (Object.keys(safeUpdates).length === 0) {
        return null;
      }

      await title_crud.updateTitle(payload.id, safeUpdates);
    }
  },
  DELETE_TITLE: {
    lockType: 'EXCLUSIVE',
    validate: async (payload) => {
      const title = await title_crud.findById(payload.id);
      return true
    },
    execute: async (payload) => {
      await title_crud.deleteTitle(payload.id);
    }
  }
}