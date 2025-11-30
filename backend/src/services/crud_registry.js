import { getDB } from '../config/connect.js'
import * as title_crud from './title_basics_crud.services.js'

const pool = getDB()
export const registry = {
  UPDATE_TITLE: {
    validate: async (payload) => {
      const title = await title_crud.findById(payload.id)
      return true
    },
    execute: async (payload) => {
      await title_crud.updateTitle(payload.id, payload.data)
    }
  }
}