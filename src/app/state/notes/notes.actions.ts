import { createAction, props } from "@ngrx/store";
import { Note } from "../../types/notecraftr";


export const updateNotes = createAction(
    '[Notes] Update Notes',
    props<{ notes: Note[] }>()
)

export const addNote = createAction(
    '[Notes] Add Note',
    props<{ note: Note }>()
)

export const updateNote = createAction(
    '[Notes] Update Note',
    props<{ note: Note }>()
)

export const deleteNote = createAction(
    '[Notes] Delete Note',
    props<{ note: Note }>()
)

export const duplicateNote = createAction(
    '[Notes] Duplicate Note',
    props<{ note: Note }>()
)
