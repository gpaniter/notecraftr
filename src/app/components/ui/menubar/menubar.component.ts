import {
  Component,
  computed,
  HostListener,
  inject,
  signal,
} from "@angular/core";
import { MenuModule } from "primeng/menu";
import { ButtonModule } from "primeng/button";
import { MenuItem, Message } from "primeng/api";
import { DialogService } from "primeng/dynamicdialog";
import { TooltipModule } from "primeng/tooltip";
import { NgClass } from "@angular/common";
import { Template } from "../../../types/notecraftr";
import {
  closeWindow,
  emitToWindows,
  getAllNoteCraftrWindows,
  getCurrentNCWindow,
  maximizeWindow,
  minimizeWindow,
  startDragging,
  unmaximizeWindow,
  writeTextToClipboard,
} from "../../../lib/notecraftr-tauri";
import { RippleModule } from "primeng/ripple";
import { Store } from "@ngrx/store";
import { getUniqueId } from "../../../utils/helpers";
import * as WindowState from "../../../state/window/";
import { CustomDialogService } from "../../../services/custom-dialog.service";
import * as EditorState from "../../../state/editor/";

@Component({
  selector: "nc-menubar",
  standalone: true,
  imports: [RippleModule, MenuModule, ButtonModule, TooltipModule, NgClass],
  templateUrl: "./menubar.component.html",
  styleUrl: "./menubar.component.scss",
  providers: [DialogService],
})
export class MenubarComponent {
  store = inject(Store);
  dialogService = inject(DialogService);
  customDialog = inject(CustomDialogService);
  output = this.store.selectSignal(EditorState.output);
  autoCopyOnTemplateChange = this.store.selectSignal(WindowState.autoCopyOnTemplateChange);
  autoCopyOnOutputChange = this.store.selectSignal(WindowState.autoCopyOnOutputChange);
  addonsEnabled = this.store.selectSignal(WindowState.addonsEnabled);
  activeUrl = this.store.selectSignal(WindowState.activeUrl);
  maximized = this.store.selectSignal(WindowState.maximized);
  notePreviewWindowMode = this.store.selectSignal(WindowState.notePreviewWindowMode);
  templates = this.store.selectSignal(EditorState.templates);
  activeTemplate = this.store.selectSignal(EditorState.activeTemplate);
  mouseHovered = signal(false);
  closeButtonHovered = signal(false);
  editorMode = computed(() => {
    const url = this.activeUrl();
    return ["", "/", "/editor"].includes(url);
  });
  windowBlured = this.store.selectSignal(WindowState.blurred);

  templateMenuItems = computed<MenuItem[]>(() => {
    const templates = this.templates();
    const activeTemplate = this.activeTemplate();
    const activeFirst = activeTemplate ? [activeTemplate] : [];
    const filteredTemplates = activeFirst.concat(
      templates.filter((t) =>
        activeTemplate ? activeTemplate.id !== t.id : true
      )
    );
    const templateOptions: MenuItem[] = filteredTemplates
      // .filter((t) => activeTemplate && activeTemplate.id !== t.id)
      .map((t) => ({
        label: t.title,
        disabled: !!activeTemplate && activeTemplate.id === t.id,
        command: () => this.setAsActiveTemplate(t.id),
      }));

    if (templateOptions.length > 0) {
      templateOptions.push({ separator: true });
    }
    templateOptions.push({
      label: "New Template",
      icon: "mingcute--add-fill",
      command: () => this.createNewTemplate(),
    });
    return templateOptions;
  });

  addOnsItems: MenuItem[] = [
    {
      label: "Add-Ons",
      items: [
        {
          label: "Notes",
          routerLink: "/notes",
          disabled: false,
        },
        {
          label: "TextFiltr",
          routerLink: "/text-filtr",
          disabled: false,
        },
      ],
    },
  ];

  templateActionItems = computed<MenuItem[]>(() => {
    const activeTemplate = this.activeTemplate();
    return [
      {
        label: "Edit",
        icon: "mingcute--edit-2-fill",
        command: () => this.requestEditTemplate(),
      },
      {
        label: "Duplicate",
        icon: "mingcute--copy-2-fill",
        command: () => this.duplicateTemplate(),
      },
      {
        label: "Delete",
        icon: "mingcute--delete-2-fill",
        command: () => this.requestDeleteTemplate(),
      },
    ];
  });

  activeTemplateTitle = computed(() => {
    const temp = this.activeTemplate();
    if (!temp) return "No Active Template";

    return temp.title;
  });

  viewTitle = computed(() => {
    const url = this.activeUrl();
    switch (url) {
      case "/":
      case "":
      case "/editor":
        return "Editor";
      case "/text-filtr":
        return "TextFiltr";
      case "/notes":
        return "Notes";
      case "/text-replacr":
        return "TextReplacr";
      case "/settings":
        return "Settings";
      case "/about":
        return "About";
      default:
        return "Notecraftr";
    }
  });


  ngOnDestroy(): void {}

  @HostListener("mousedown", ["$event"])
  onMouseDown(event: MouseEvent) {
    const target = event.target;
    const targetIsHTMLElement = target instanceof HTMLElement;
    const isDoubleClick = event.detail === 2;
    if (!targetIsHTMLElement) return;
    if ((target as HTMLElement).id === "tauri-drag" && !isDoubleClick) {
      startDragging();
    } else if (isDoubleClick) {
      this.toggleRestoreApp();
    }
  }

  addNote() {
    emitToWindows("notecraftr", "request-note-create", null);
  }

  setAsActiveTemplate(id: number) {
    let templates = this.templates();
    let template = templates.find((t) => t.id === id);
    if (!template) return;
    this.store.dispatch(EditorState.setActiveTemplate({ template }));
    if (this.autoCopyOnTemplateChange() && !this.autoCopyOnOutputChange()) {
      setTimeout(() => this.autoCopyOutputToClipboard(), 100);
    }
  }

  autoCopyOutputToClipboard() {
    writeTextToClipboard(this.output()).then(() => {
      const message: Message = {
        severity: "success",
        summary: "Auto Copy",
        detail: "Output automatically copied to clipboard.",
      };
      this.store.dispatch(WindowState.showMessage({ message }));
    });
  }

  toggleRestoreApp() {
    if (this.maximized()) {
      unmaximizeWindow();
      return;
    }
    maximizeWindow();
  }

  async closeApp() {
    if (getCurrentNCWindow().label === "notecraftr") {
      getAllNoteCraftrWindows()
      .then((windows) => {
        windows.forEach(async (w) => {
          if (w.label !== "notecraftr") {
            await w.close();
          }
        });
      })
      .finally(() => closeWindow());
    } else {
      closeWindow();
    }
  }

  minimizeApp() {
    minimizeWindow();
  }

  onCloseButtonHover() {
    this.closeButtonHovered.set(true);
  }

  onCloseButtonLeave() {
    this.closeButtonHovered.set(false);
  }

  requestDeleteTemplate() {
    let templates = this.templates();
    let template = this.activeTemplate();
    if (!template) return;
    const templateName = template.title
      ? '"' + template.title + '"'
      : "this template";

    this.customDialog.openConfirmDialog(
      this.dialogService,
      {
        header: "Delete Template",
        message: `Are you sure you want to delete ${templateName}?`,
        buttonAppearance: "danger",
        yes: "Delete",
        no: "Cancel",
      },
      (v) => {
        
        const message: Message = {
          severity: "error",
          summary: "Template Deleted",
          detail: template.title
            ? `Template ${templateName} deleted.`
            : "A template was deleted",
        };
        this.store.dispatch(WindowState.showMessage({ message }));
        this.store.dispatch(EditorState.deleteTemplate({ template }));
        this.store.dispatch(EditorState.setLastTemplateAsActive());
        // Check if templates are empty
        templates = templates.filter((t) => t.id !== template.id);
        if (templates.length === 0) {
          this.store.dispatch(EditorState.createDefaultTemplate());
        }
      },
      () => {
        const message: Message = {
          severity: "secondary",
          summary: "Cancelled",
          detail: "Template deletion was cancelled",
        }
        this.store.dispatch(WindowState.showMessage({message}));
      }
    );
  }

  duplicateTemplate() {
    let template = this.activeTemplate();
    if (!template) return;
    this.store.dispatch(EditorState.duplicateTemplate({ template }));
    this.store.dispatch(EditorState.setLastTemplateAsActive());
    const message: Message = {
      severity: "success",
      summary: "Template Duplicated",
      detail: `Template "${template.title}" duplicated.`,
    };
    this.store.dispatch(WindowState.showMessage({ message }));
  }

  requestEditTemplate() {
    let templates = this.templates();
    let template = templates.find((t) => t.active);
    if (!template) return;

      this.customDialog.openTemplateEditDialog(this.dialogService, template, (newTemp) => {
        this.store.dispatch(EditorState.updateTemplate({ template: newTemp }));
        const message: Message = {
          severity: "info",
          summary: "Template Updated",
          detail: `Template "${newTemp.title}" updated.`,
        };
        this.store.dispatch(WindowState.showMessage({ message }));
      },
      () => {
        const message: Message = {
          severity: "secondary",
          summary: "Cancelled",
          detail: "Template edit was cancelled",
        }
        this.store.dispatch(WindowState.showMessage({message}));
      }
    );
  }

  createNewTemplate() {
    let templates = this.templates();
    const newTemp: Template = {
      id: getUniqueId(templates.map((t) => t.id)),
      title: "New Template " + templates.length,
      sections: [],
      active: false,
    };
    this.store.dispatch(EditorState.addTemplate({ template: newTemp }));
    this.store.dispatch(EditorState.setActiveTemplate({ template: newTemp }));
    const message: Message = {
      severity: "success",
      summary: "Template Added",
      detail: "New template added.",
    };
    this.store.dispatch(WindowState.showMessage({ message }));
  }

  updateMouseHovered(value: boolean) {
    this.mouseHovered.set(value);
  }
}
