import {
  AfterViewInit,
  Component,
  HostListener,
  inject,
  OnDestroy,
  OnInit,
  viewChild,
} from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import {  emitTo, listen, UnlistenFn } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Editor, EditorModule } from "primeng/editor";
import { FormControl, FormsModule, ReactiveFormsModule } from "@angular/forms";
import Quill, { Range } from "quill";
import { NgClass } from "@angular/common";
import { IconMenuItem, Menu, PredefinedMenuItem } from "@tauri-apps/api/menu";
import { readTextFromClipboard, writeTextToClipboard } from "../../../../lib/notecraftr-tauri";

@Component({
  selector: "nc-note-preview-window",
  standalone: true,
  imports: [EditorModule, FormsModule, ReactiveFormsModule, NgClass],
  templateUrl: "./note-preview-window.component.html",
  styleUrl: "./note-preview-window.component.scss",
})
export class NotePreviewWindowComponent implements OnInit, AfterViewInit, OnDestroy {
  route = inject(ActivatedRoute);
  notesService = inject(NotesService);
  databaseService = inject(DatabaseService);
  windowService = inject(WindowService);
  windowBlured = this.windowService.blurred;
  theme = this.databaseService.theme;
  notes = this.notesService.notes;
  note: Note = { text: "", id: 0, opened: true, backgroundClass: "" };
  textFormControl = new FormControl<string>("");
  editor = viewChild.required<Editor>(Editor);
  menu: Menu | undefined = undefined;

  windowMove$!: UnlistenFn;
  windowResize$!: UnlistenFn;
  theme$!: UnlistenFn;
  windowBlur$!: UnlistenFn;

  constructor() {
    this.note =
      this.notes().find(
        (note) => note.id == Number(this.route.snapshot.paramMap.get("id"))
      ) || this.note;
    this.note.opened = true;
  }

  async ngOnInit() {
    emitTo("notecraftr", "note-change", this.note);
    this.windowMove$ = await listen(
      "tauri://move",
      (e: { payload: { x: number; y: number } }) => {
        // this.notesService.editNote({...this.note, x: e.payload.x, y: e.payload.y})
        emitTo("notecraftr", "note-change", {
          ...this.note,
          text: this.textFormControl.value,
          x: e.payload.x,
          y: e.payload.y,
        });
      }
    );
    this.windowResize$ = await listen("tauri://resize", (e: { payload: { width: number; height: number } }) => {
      emitTo("notecraftr", "note-change", { ...this.note, text: this.textFormControl.value, width: e.payload.width, height: e.payload.height });
      // getCurrentWindow().outerPosition().then((pos) => {
      //   emitTo("notecraftr", "note-change", { ...this.note, x: pos.x, y: pos.y });
      // })
    });
    this.theme$ = await listen("custom-theme-change", (e) => {
      this.theme.set(e.payload as { theme: string; color: string });
    });
    this.windowBlur$ = await getCurrentWindow().onFocusChanged(
      ({ payload: focused }) => {
        this.windowBlured.set(!focused);
      }
    );

    this.textFormControl.setValue(this.note.text);

    this.textFormControl.valueChanges.subscribe((text) => {
      emitTo("notecraftr", "note-change", { ...this.note, text });
    });
  }

  ngAfterViewInit(): void {
    this.createMenu();
  }

  get quill(): Quill {
    return this.editor().getQuill();
  }
 

  ngOnDestroy(): void {
    const unlisten = [this.windowMove$, this.theme$, this.windowBlur$, this.windowResize$];
    unlisten.forEach((fn) => fn());
  }

  @HostListener("contextmenu", ["$event"])
  async onContext(e: MouseEvent) {
    this.toggleMenu(e);
  }

  async createMenu() {
    const separator = PredefinedMenuItem.new({ item: "Separator" });
    const hasSelection = false;
    const items = await Promise.all([
      IconMenuItem.new({
        // icon: await resolve('icons/spectrum/dark/Smock_Undo_18_N.png'),
        text: "Undo",
        action: (e) => this.undo(),
        enabled: this.hasUndo(),
        accelerator: "Ctrl+Z",
      }),
      IconMenuItem.new({
        // icon: await resolve('icons/spectrum/dark/Smock_Redo_18_N.png'),
        text: "Redo",
        action: (e) => this.redo(),
        enabled: this.hasRedo(),
        accelerator: "Ctrl+Shift+Z",
      }),
      separator,
      IconMenuItem.new({
        // icon: await resolve('icons/spectrum/dark/Smock_Cut_18_N.png'),
        text: "Cut",
        action: (e) => this.cut(),
        enabled: hasSelection,
        accelerator: "Ctrl+X",
      }),
      IconMenuItem.new({
        // icon: await resolve('icons/spectrum/dark/Smock_Copy_18_N.png'),
        text: "Copy",
        action: (e) => this.copy(),
        enabled: hasSelection,
        accelerator: "Ctrl+C",
      }),
      IconMenuItem.new({
        // icon: await resolve('icons/spectrum/dark/Smock_PasteText_18_N.png'),
        text: "Paste",
        action: (e) => this.paste(),
        enabled: true,
        accelerator: "Ctrl+V",
      }),
      IconMenuItem.new({
        // icon: await resolve('icons/spectrum/dark/Smock_Delete_18_N.png'),
        text: "Delete",
        action: (e) => this.clear(),
        enabled: hasSelection,
        accelerator: "Delete",
      }),
      separator,
      IconMenuItem.new({
        text: "Select All",
        action: (e) => this.selectAll(),
        enabled: true,
        accelerator: "Ctrl+A",
      }),
    ]);

    this.menu = await Menu.new({ items });
  }

  async updateMenu() {
    if (!this.menu) {
      await this.createMenu();
      return;
    }
    const items = await this.menu.items();
    const hasSelection = !!this.quill.getSelection()?.length;
    for (let i of items) {
      if (i.kind == "Icon") {
        const item = i as IconMenuItem;
        switch (await item.text()) {
          case "Undo":
            item.setEnabled(this.hasUndo());
            break;
          case "Redo":
            item.setEnabled(this.hasRedo());
            break;
          case "Cut":
            item.setEnabled(hasSelection);
            break;
          case "Copy":
            item.setEnabled(hasSelection);
            break;
          case "Delete":
            item.setEnabled(hasSelection);
            break;
          case "Select All":
            item.setEnabled(!!this.quill.getText());
            break;
        }
      }
    }
  }

  async toggleMenu(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!this.menu) {
      return;
    }
    await this.updateMenu().then(() => this.menu?.popup())
  }

  // selectAll() {
  //   this.host.nativeElement.select();
  // }

  hasUndo() {
    return document.queryCommandEnabled("undo");
  }

  hasRedo() {
    return document.queryCommandEnabled("redo");
  }

  undo() {
    this.quill.focus();
    document.execCommand("undo", false);
  }

  redo() {
    this.quill.focus();
    document.execCommand("redo", false);
  }


  selectAll() {
    this.quill.focus();
    document.execCommand("SelectAll", false);
  }

  cut() {
    if (!this.quill.getSelection()?.length) {
      this.selectAll();
    }
    this.copy();
    this.clear();
  }

  copy() {
    this.copySelectedToClipboard();
  }

  paste() {
    this.pasteSelectedFromClipboard();
  }

  clear() {
    this.clearSelected();
  }

  async copySelectedToClipboard() {
    await writeTextToClipboard(this.quill.getText(this.quill.getSelection() as Range))
      .then(() => this.quill.focus());
  }

  async copyAllToClipboard() {
    await writeTextToClipboard(this.quill.getText(this.quill.getSelection() || undefined))
      .finally(() => this.quill.focus());
  }

  async pasteSelectedFromClipboard() {
    await readTextFromClipboard().then((v) => {
      this.insertText(v);
    });
  }

  insertText(value: string) {
    this.quill.focus();
    document.execCommand("insertText", false, value);
  }

  clearSelected() {
    this.quill.focus();
    document.execCommand("delete", false);
  }

  clearAll() {
    this.quill.setSelection(this.quill.getText().length);
    document.execCommand("delete", false);
  }
}
