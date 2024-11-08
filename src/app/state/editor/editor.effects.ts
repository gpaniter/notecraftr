import { Injectable } from "@angular/core";
import { Actions, createEffect, ofType } from "@ngrx/effects";
import { Store } from "@ngrx/store";
import * as EditorActions from "./editor.actions";
import * as EditorSelectors from "./editor.selectors";
import { from, map, of, tap, withLatestFrom } from "rxjs";
import { AppState } from "../app.state";
import { setToDatabase } from "../../utils/helpers";


/**
 * Work-around for "undefined" actions$
 * https://github.com/ngrx/platform/issues/3278#issuecomment-1575689719
 */
export abstract class EffectsWrapper {
    constructor(protected readonly actions$: Actions, protected readonly store: Store<AppState>) {}
}

@Injectable()
export class EditorEffects extends EffectsWrapper {
  consoleLogActions$ = createEffect(
    () =>
      this.actions$.pipe(
        tap((action) => {
          if (false) {
            console.log(action);
          }
        })
      ),
    {
      dispatch: false,
    }
  );
  

  saveTemplates$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(
            EditorActions.loadTemplates,
            EditorActions.addTemplate,
            EditorActions.duplicateTemplate,
            EditorActions.updateTemplate,
            EditorActions.deleteTemplate,
            EditorActions.setActiveTemplate,
            EditorActions.setLastTemplateAsActive,
            EditorActions.createDefaultTemplate,
            EditorActions.addSection,
            EditorActions.duplicateSection,
            EditorActions.updateSection,
            EditorActions.createLinkedSection,
            EditorActions.deleteSection,
            EditorActions.selectAllSections,
            EditorActions.updateAllLinkedSections,
        ),
        withLatestFrom(this.store.select(EditorSelectors.templates)),
        tap(([action, templates]) => {
          setToDatabase("notecraftr-templates", templates);
        })
      ),
    {
      dispatch: false,
    }
  );

  saveSectionsFilter$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(
            EditorActions.updateSectionFilter,
        ),
        withLatestFrom(this.store.select(EditorSelectors.sectionsFilter)),
        tap(([action, sectionsFilter]) => {
          setToDatabase("notecraftr-sections-filter", sectionsFilter);
        })
      ),
    {
      dispatch: false,
    }
  );

  savePreviewVisible$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(
            EditorActions.updatePreviewVisible,
        ),
        withLatestFrom(this.store.select(EditorSelectors.previewVisible)),
        tap(([action, previewVisible]) => {
          setToDatabase("notecraftr-preview-visible", previewVisible);
        })
      ),
    {
      dispatch: false,
    }
  );

 

  constructor(actions$: Actions, store: Store<AppState>) {
    super(actions$, store);
  }
}
