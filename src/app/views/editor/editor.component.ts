import {
  Component,
  computed,
  effect,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from "@angular/core";
import { FormControl, ReactiveFormsModule } from "@angular/forms";
import { ButtonModule } from "primeng/button";
import { TooltipModule } from "primeng/tooltip";
import { SectionComponent } from "../../components/ui/section/section.component";
import { OutputActionsComponent } from "../../components/ui/output-actions/output-actions.component";
import {
  CdkDrag,
  CdkDragDrop,
  CdkDragPlaceholder,
  CdkDropList,
  moveItemInArray,
} from "@angular/cdk/drag-drop";
import { InputTextModule } from "primeng/inputtext";
import { IconFieldModule } from "primeng/iconfield";
import { InputIconModule } from "primeng/inputicon";
import { CheckboxModule } from "primeng/checkbox";
import { InputContextmenuDirective } from "../../directives/input-contextmenu.directive";
import { NgClass } from "@angular/common";
import { Store } from "@ngrx/store";
import * as WindowState from "../../state/window";
import { formatDate, getUniqueId } from "../../utils/helpers";
import { debounceTime, distinctUntilChanged, Subscription } from "rxjs";
import { Section } from "../../types/notecraftr";
import * as EditorState from "../../state/editor/";
import { openUrl } from "../../lib/notecraftr-tauri";
import { CustomMessageService } from "../../services/custom-message.service";
import { Message } from "primeng/api";
import { DialogService } from "primeng/dynamicdialog";
import { CustomDialogService } from "../../services/custom-dialog.service";

@Component({
  selector: "nc-editor",
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    TooltipModule,
    SectionComponent,
    OutputActionsComponent,
    CdkDropList,
    CdkDrag,
    CdkDragPlaceholder,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
    CheckboxModule,
    InputContextmenuDirective,
    NgClass,
  ],
  templateUrl: "./editor.component.html",
  styleUrl: "./editor.component.scss",
  providers: [DialogService],
})
export class EditorComponent implements OnInit, OnDestroy {
  store = inject(Store);
  customDialog = inject(CustomDialogService);
  dialogService = inject(DialogService);
  theme = this.store.selectSignal(WindowState.theme);
  templates = this.store.selectSignal(EditorState.templates);
  activeTemplate = this.store.selectSignal(EditorState.activeTemplate);
  previewVisible = this.store.selectSignal(EditorState.previewVisible);
  sectionsFilter = this.store.selectSignal(EditorState.sectionsFilter);
  visibleSections = this.store.selectSignal(EditorState.visibleSections);
  output = this.store.selectSignal(EditorState.output);

  linkedSectionsEnabled = this.store.selectSignal(
    WindowState.linkedSectionsEnabled
  );
  autoCopyOnTemplateChange = this.store.selectSignal(
    WindowState.autoCopyOnTemplateChange
  );
  filterFormControl = new FormControl<string>("");
  selectAllFormControl = new FormControl<boolean>(false);
  filterChange$: Subscription | undefined;
  selectAllChange$: Subscription | undefined;
  hoveredSection = signal<Section | undefined>(undefined);

  visibleLinkedSections = computed(() => {
    const temp = this.activeTemplate();
    const hoveredSection = this.hoveredSection();
    const linkedSectionsEnabled = this.linkedSectionsEnabled();
    let output: Section[] = [];
    if (!linkedSectionsEnabled) return output;
    if (!hoveredSection) return output;
    if (!temp) return output;
    for (let i = 0; i < temp.sections.length; i++) {
      let sec = temp.sections[i];
      if (
        sec.id === hoveredSection.id ||
        sec.id == hoveredSection.linkedId ||
        (hoveredSection.linkedId !== -1 &&
          hoveredSection.linkedId === sec.linkedId &&
          sec.linked) ||
        (sec.linkedId === hoveredSection.id && sec.linked)
      ) {
        output.push(sec);
      }
    }
    return output;
  });

  sections = computed(() => {
    const temp = this.activeTemplate();
    if (!temp) return [];
    return temp.sections;
  });

  sectionsChange = effect(() => {
    const sections = this.sections() || [];
    const allActive = !sections.some((s) => !s.active);
    this.selectAllFormControl.patchValue(allActive, { emitEvent: false });
    if (sections.length <= 0) {
      this.selectAllFormControl.disable({ emitEvent: false });
    } else {
      this.selectAllFormControl.enable({ emitEvent: false });
    }
  });

  templateChange = effect(() => {
    const template = this.activeTemplate();
    if (!template) {
      this.filterFormControl.disable({ emitEvent: false });
      this.selectAllFormControl.disable({ emitEvent: false });
    } else {
      this.filterFormControl.enable({ emitEvent: false });
      this.selectAllFormControl.enable({ emitEvent: false });
    }
  });

  ngOnInit(): void {
    this.selectAllChange$ = this.selectAllFormControl.valueChanges.subscribe(
      (value) => {
        this.selectAllSections(value || false);
      }
    );

    this.filterChange$ = this.filterFormControl.valueChanges
      .pipe(debounceTime(200), distinctUntilChanged())
      .subscribe((filter) => {
        this.store.dispatch(
          EditorState.updateSectionFilter({ filter: filter || "" })
        );
      });

    this.filterFormControl.patchValue(this.sectionsFilter(), {
      emitEvent: false,
    });
  }

  ngOnDestroy(): void {
    const subs = [this.filterChange$, this.selectAllChange$];
    for (const sub of subs) {
      if (sub && !sub.closed) sub.unsubscribe();
    }
  }

  openYoutube = () => {
    openUrl("https://youtu.be/9nK1fooJSPQ");
  };

  togglePreview() {
    this.store.dispatch(
      EditorState.updatePreviewVisible({ visible: !this.previewVisible() })
    );
  }

  sectionDrop(event: CdkDragDrop<Section[]>) {
    let template = structuredClone(this.activeTemplate());
    if (!template) return;
    moveItemInArray(template.sections, event.previousIndex, event.currentIndex);
    this.store.dispatch(EditorState.updateTemplate({ template }));
  }

  addNewSection() {
    let template = this.activeTemplate();
    if (!template) return;
    this.store.dispatch(EditorState.addSection({ template }));
    const message: Message = {
      severity: "success",
      summary: "Section Added",
      detail: "New section added.",
    };
    this.store.dispatch(WindowState.showMessage({ message }));
  }

  sectionUpdate(section: Section) {
    if (this.linkedSectionsEnabled() && section.linked) {
      this.store.dispatch(
        EditorState.updateAllLinkedSections({ section: section })
      );
      return
    }
    this.store.dispatch(EditorState.updateSection({ section: section }));
  }

  sectionDeleteDialog(section: Section) {
    let message = "Are you sure you want to delete this section?";
    if (this.linkedSectionsEnabled() && section.linkedId === section.id) {
      message =
        "Other sections are linked to this section. Deleting this will unlink these sections. Are you sure you want to continue?";
    }

    this.customDialog.openConfirmDialog(
      this.dialogService,
      {
        header: "Delete Section",
        message,
        buttonAppearance: "danger",
        yes: "Delete",
        no: "Cancel",
      },
      (v) => {
        if (v) {
          this.store.dispatch(EditorState.deleteSection({ section }));
          const message: Message = {
            severity: "error",
            summary: "Section Deleted",
            detail: `Section "${section.title}" deleted.`,
          };
          this.store.dispatch(WindowState.showMessage({ message }));
        }
      },
      () => {
        this.store.dispatch(
          WindowState.showMessage({
            message: {
              severity: "secondary",
              summary: "Cancelled",
              detail: "Section deletion was cancelled",
            },
          })
        );
      }
    );
  }

  sectionEditDialog(section: Section) {
    let template = this.activeTemplate();
    if (!template) return;
    this.customDialog.openSectionEditDialog(
      this.dialogService,
      section,
      (newSection) => {
        if (this.linkedSectionsEnabled() && section.linked) {
          this.store.dispatch(
            EditorState.updateAllLinkedSections({ section: newSection })
          );
        } else {
          this.store.dispatch(
            EditorState.updateSection({ section: newSection })
          );
        }
        const message: Message = {
          severity: "success",
          summary: "Section Updated",
          detail: `Section "${newSection.title}" updated.`,
        };
        this.store.dispatch(WindowState.showMessage({ message }));
      },
      () => {
        const message: Message = {
          severity: "secondary",
          summary: "Cancelled",
          detail: "Section edit was cancelled",
        };
        this.store.dispatch(WindowState.showMessage({ message }));
      }
    );
  }

  createLinkedSection(section: Section) {
    let template = this.activeTemplate();
    if (!template) return;
    const linked = true;
    const linkedId = section.linkedId !== -1 ? section.linkedId : section.id;
    this.store.dispatch(
      EditorState.updateSection({ section: { ...section, linked, linkedId } })
    );
    this.store.dispatch(EditorState.createLinkedSection({ section }));
    const message: Message = {
      severity: "success",
      summary: "Linked Section",
      detail: `Linked Section Created.`,
    };
    this.store.dispatch(WindowState.showMessage({ message }));
  }

  duplicateSection(section: Section) {
    this.store.dispatch(EditorState.duplicateSection({ section }));
    const message: Message = {
      severity: "success",
      summary: "Section Duplicated",
      detail: `Section "${section.title}" duplicated.`,
    };
    this.store.dispatch(WindowState.showMessage({ message }));
  }

  selectAllSections(enabled: boolean) {
    let template = this.activeTemplate();
    if (!template) return;
    this.store.dispatch(EditorState.selectAllSections({ template, enabled }));
  }

  onSectionHover(section: Section) {
    this.hoveredSection.set(section);
  }

  onSectionLeave(section: Section) {
    this.hoveredSection.set(undefined);
  }
}
