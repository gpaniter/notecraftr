import { Component, inject, isDevMode, OnInit } from "@angular/core";
import {
  CdkDrag,
  CdkDragDrop,
  CdkDragPlaceholder,
  CdkDropList,
  moveItemInArray,
} from "@angular/cdk/drag-drop";
import { ReactiveFormsModule } from "@angular/forms";
import { ButtonModule } from "primeng/button";
import { TooltipModule } from "primeng/tooltip";
import { Location } from "@angular/common";
import { NoteItemComponent } from "../../../components/ui/note-item/note-item.component";
import { Store } from "@ngrx/store";
import * as WindowState from "../../../state/window";
import * as NotesState from "../../../state/notes";
import { Message } from "primeng/api";
import { Note } from "../../../types/notecraftr";
import { getAllNoteCraftrWindows } from "../../../lib/notecraftr-tauri";
import { CustomDialogService } from "../../../services/custom-dialog.service";
import { DialogService } from "primeng/dynamicdialog";
import { getUniqueId } from "../../../utils/helpers";
import { NotesService } from "../../../services/notes.service";

@Component({
  selector: "nc-notes",
  standalone: true,
  imports: [
    // CdkDropList,
    // CdkDrag,
    // CdkDragPlaceholder,
    ReactiveFormsModule,
    ButtonModule,
    TooltipModule,
    NoteItemComponent,
  ],
  templateUrl: "./notes.component.html",
  styleUrl: "./notes.component.scss",
  providers: [DialogService],
})
export class NotesComponent implements OnInit {
  store = inject(Store);
  customDialog = inject(CustomDialogService);
  dialogService = inject(DialogService);
  notesService = inject(NotesService)
  locationService = inject(Location);
  theme = this.store.selectSignal(WindowState.theme);
  notes = this.store.selectSignal(NotesState.notes);

  ngOnInit(): void {
    this.checkForOpenedNotes();
  }

  checkForOpenedNotes() {
    let notes = structuredClone(this.notes());
    notes = notes.map((n) => ({ ...n, opened: false }));
    getAllNoteCraftrWindows().then((windows) => {
      windows.forEach((w) => {
        let id = Number(w.label.split("-")[1]);
        let note = notes.find((n) => n.id === id);
        if (note) {
          note.opened = true;
        }
      });
      this.store.dispatch(NotesState.updateNotes({ notes }));
    });
  }

  addNewNote() {
    const newNote= this.notesService.getNewNote(this.notes().map(n => n.id));
    this.store.dispatch(NotesState.addNote({note: newNote}));
    const message: Message = {
      severity: "success",
      summary: "New Note",
      detail: `A new Note was created.`,
    };
    this.store.dispatch(WindowState.showMessage({ message: message }));
    this.notesService.openNote(newNote, () => {
      this.store.dispatch(
        NotesState.updateNote({ note: { ...newNote, opened: true } })
      );
    })
  }

  noteDrop(event: CdkDragDrop<Note[]>) {
    let notes = structuredClone(this.notes());
    moveItemInArray(notes, event.previousIndex, event.currentIndex);
    this.store.dispatch(NotesState.updateNotes({ notes }));
  }

  onBackClick() {
    this.locationService.back();
  }

  deleteNoteDialog(note: Note) {
    this.customDialog.openConfirmDialog(
      this.dialogService,
      {
        header: "Delete Note",
        message: "Are you sure you want to delete this note?",
        buttonAppearance: "danger",
        yes: "Delete",
        no: "Cancel",
      },
      (v) => {
        if (v) {
          this.deleteNote(note);
        }
      },
      () => {
        const message: Message = {
          severity: "secondary",
          summary: "Cancelled",
          detail: "Note deletion was cancelled",
        };
        this.store.dispatch(WindowState.showMessage({ message }));
      }
    );
  }

  deleteNote(note: Note) {
    getAllNoteCraftrWindows()
      .then((windows) => {
        windows.forEach(async (w) => {
          if (w.label === `note-${note.id}`) {
            await w.close();
          }
        });
      })
      .finally(() => {
        this.store.dispatch(NotesState.deleteNote({ note }));
        const message: Message = {
          severity: "error",
          summary: "Note Deleted",
          detail: `Note was deleted.`,
        };
        this.store.dispatch(WindowState.showMessage({ message: message }));
      });
  }

  duplicateNote(note: Note) {
    this.store.dispatch(NotesState.duplicateNote({ note }));
    let foundWindow = false;
    getAllNoteCraftrWindows()
      .then((windows) => {
        windows.forEach(async (w) => {
          if (w.label === `note-${note.id}`) {
            foundWindow = true;
          }
        });
      })
      .finally(() => {
        if (foundWindow) {
          const notes = this.notes();
          const latestNote =
            notes.length > 0 ? notes[notes.length - 1] : undefined;
          if (latestNote) {
            const x = note.x ? note.x + 10 : undefined;
            const y = note.y ? note.y + 10 : undefined;
            this.notesService.openNote({...latestNote, x, y}, () => {
              this.store.dispatch(
                NotesState.updateNote({ note: { ...latestNote, x, y, opened: true } })
              );
            })
          }
        }
        const message: Message = {
          severity: "success",
          summary: "Note Duplicated",
          detail: `Note was duplicated.`,
        };
        this.store.dispatch(WindowState.showMessage({ message: message }));
      });
  }

  showHideNoteWindow(event: { note: Note; hide: boolean }) {
    if (event.hide) this.closeNote(event.note);
    else {
        this.notesService.openNote(event.note, () => {
        this.store.dispatch(
          NotesState.updateNote({ note: { ...event.note, opened: true } })
        );
      });
    }
  }

  // async openNote(note: Note, x?: number, y?: number) {
  //   const hasScreenPos = !!(note.x || note.y);
  //   const webview = new WebviewWindow(`note-${note.id}`, {
  //     url: isDevMode()
  //       ? `http://localhost:4200/note-window/${note.id}`
  //       : `tauri://localhost/note-window/${note.id}`,
  //     decorations: false,
  //     width: note.width || 300,
  //     height: note.height || 300,
  //     minHeight: 75,
  //     minWidth: 200,
  //     theme: "light",
  //     title: "Notes",
  //     center: !hasScreenPos,
  //     x: x || note.x,
  //     y: y || note.y,
  //   });
  //   const un = await webview.once("tauri://created", (e) => {
  //     this.store.dispatch(
  //       NotesState.updateNote({ note: { ...note, opened: true } })
  //     );
  //     un();
  //   });
  // }

  closeNote(note: Note) {
    getAllNoteCraftrWindows().then((windows) => {
      windows.forEach((w) => {
        if (w.label === `note-${note.id}`) {
          w.close().then(
            () => {
              this.store.dispatch(
                NotesState.updateNote({ note: { ...note, opened: false } })
              );
            },
            (e) => {
              console.error(e);
            }
          );
        }
      });
    });
  }

  editNote(note: Note) {
    let foundWindow = false;
    getAllNoteCraftrWindows()
      .then((windows) => {
        windows.forEach(async (w) => {
          if (w.label === `note-${note.id}`) {
            foundWindow = true;
            await w.setFocus();
          }
        });
      })
      .finally(() => {
        if (!foundWindow) {
          // this.openNote(note);
          this.notesService.openNote(note, () => {
            this.store.dispatch(
              NotesState.updateNote({ note: { ...note, opened: true } })
            );
          })
        }
      });
  }
}
