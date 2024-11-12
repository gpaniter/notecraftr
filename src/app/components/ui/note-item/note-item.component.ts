import { Component, computed, input, isDevMode, OnDestroy, OnInit, output, signal } from "@angular/core";
import { ButtonModule } from "primeng/button";
import { TooltipModule } from "primeng/tooltip";
import { DatePipe, NgClass } from "@angular/common";
import { EditorModule } from "primeng/editor";
import { FormControl, ReactiveFormsModule } from "@angular/forms";
import { Subscription } from "rxjs";
import { toObservable } from "@angular/core/rxjs-interop";
import { Note } from "../../../types/notecraftr";

@Component({
  selector: "nc-note-item",
  standalone: true,
  imports: [ButtonModule, TooltipModule, NgClass, EditorModule, ReactiveFormsModule, DatePipe],
  templateUrl: "./note-item.component.html",
  styleUrl: "./note-item.component.scss",
  providers: []
})
export class NoteItemComponent implements OnInit , OnDestroy{
  note = input.required<Note>();
  actionsVisible = signal(false);
  textFormControl = new FormControl<string>('')
  note$ = toObservable(this.note)
  noteChange$: Subscription | undefined;
  onDelete = output<Note>();
  onDuplicate = output<Note>();
  onEdit = output<Note>();
  onShowHideNote = output<{note: Note, hide: boolean}>();
  dateFormat  = computed(() => {
    const updatedDate = this.note().updatedDate || new Date();
    const currentDate = new Date();
    const daysSinceUpdated = (currentDate.getTime() - updatedDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceUpdated > 1 ? 'MMM d, y' : 'h:mm a'
  });


  ngOnInit(): void {
    this.textFormControl.setValue(this.note().text);
    this.noteChange$ = this.note$.subscribe((value) => {
      this.textFormControl.patchValue(value.text);
    })
  }

  ngOnDestroy(): void {
    const subs = [this.noteChange$];
    for (const sub of subs) {
      if (sub && !sub.closed) {
        sub.unsubscribe();
      }
    }
  }

  setActionVisible(value: boolean) {
    this.actionsVisible.set(value);
  }

  async openNote() {
    // note = note || this.note();
    // const hasScreenPos = !!(note.x || note.y);
    // const webview = new WebviewWindow(`note-${note.id}`, {
    //   url: isDevMode() ? `http://localhost:4200/note-window/${note.id}` : `tauri://localhost/note-window/${note.id}`,
    //   decorations: false,
    //   width: note.width || 200,
    //   height: note.height || 200,
    //   minHeight: 75,
    //   minWidth: 200,
    //   theme: "light",
    //   title: "Notes",
    //   center: !hasScreenPos,
    //   x: note.x,
    //   y: note.y,
    //   // url: '/addon-notes-window/hello.html'
    // });
    this.onShowHideNote.emit({note: this.note(), hide: false});
  }

  closeNote() {
    // getAllWebviewWindows().then((windows) => {
    //   windows.forEach((w) => {
    //     if (w.label === `note-${this.note().id}`) {
    //       w.close();
    //     }
    //   });
    // })
    this.onShowHideNote.emit({note: this.note(), hide: true});
  }

  editNote() {
    // let foundWindow = false;
    // getAllWebviewWindows().then((windows) => {
    //   windows.forEach(async (w) => {
    //     if (w.label === `note-${this.note().id}`) {
    //       foundWindow = true;
    //       await w.setFocus();
    //     }
    //   });
    // }).finally(() => {
    //   if (!foundWindow) {
    //     this.openNote();
    //   }
    // })
    this.onEdit.emit(this.note())
  }

  deleteNote() {
    // getAllWebviewWindows().then((windows) => {
    //   windows.forEach(async (w) => {
    //     if (w.label === `note-${this.note().id}`) {
    //       await w.close();
    //     }
    //   });
    // }).finally(() => {
    //   this.onDelete.emit(this.note())
    // })
    this.onDelete.emit(this.note())
  }

  duplicateNote() {
    // let notes = this.noteService.notes();
    // const newNote = this.noteService.duplicateNote(this.note(), notes);
    // if (this.note().opened && newNote) {
    //   this.openNote(newNote);
    // }
    // this.noteService.saveNotes(notes);
    // this.windowService.showMessage.emit({
    //   severity: "success",
    //   summary: "Note Duplicated",
    //   detail: `Note was duplicated.`,
    // });
    this.onDuplicate.emit(this.note())
  }

}
