import { Injectable } from "@angular/core";
import { EffectsWrapper } from "../editor/editor.effects";
import { Actions, createEffect, ofType } from "@ngrx/effects";
import * as WindowActions from "./window.actions";
import { Store } from "@ngrx/store";
import { AppState } from "../app.state";

@Injectable()
export class WindowEffects extends EffectsWrapper {
  

  saveTemplates$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(
            WindowActions.maximize,
        ),

        
      ),
    {
      dispatch: false,
    }
  );

  constructor(actions$: Actions, store: Store<AppState>) {
    super(actions$, store);
  }
}