import { Injectable, isDevMode } from '@angular/core';
import { Note } from '../types/notecraftr';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { getUniqueId } from '../utils/helpers';

@Injectable({
  providedIn: 'root'
})
export class NotesService {

  
  async openNote(note: Note, onWebviewCreated?: () => void ) {
    const hasScreenPos = !!(note.x || note.y);
    const webview = new WebviewWindow(`note-${note.id}`, {
      url: isDevMode()
        ? `http://localhost:4200/note-window/${note.id}`
        : `tauri://localhost/note-window/${note.id}`,
      decorations: false,
      width: note.width || 300,
      height: note.height || 300,
      minHeight: 75,
      minWidth: 200,
      theme: "light",
      title: "Notes",
      center: !hasScreenPos,
      x: note.x,
      y: note.y,
    });
    if (!onWebviewCreated) {
      return
    }
    const un = await webview.once("tauri://created", (e) => {
      // this.store.dispatch(
      //   NotesState.updateNote({ note: { ...note, opened: true } })
      // );
      onWebviewCreated();
      un();
    });
  }

  getNewNote(ids: number[]): Note {
    return {
      id: getUniqueId(ids),
      text: "",
      opened: false,
      backgroundClass: `card-bg-${Math.floor(Math.random() * 12) + 1}`,
      updatedDate: new Date()
    };
  }

}
