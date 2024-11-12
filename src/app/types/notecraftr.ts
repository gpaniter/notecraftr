export type Section = {
    title: string;
    type: "multiple" | "single" | "input" | "date";
    id: number;
    templateId: number;
    linked: boolean;
    linkedId: number;
    active: boolean;
    options: string[];
    separator: string;
    prefix: string;
    suffix: string;
    singleTextValue?: string;
    multipleTextValue?: string[];
    inputValue?: string;
    dateValue?: Date;
    dateFormat?: string;
    customDateFormat?: string;
    backgroundClass: string;
};

export type Template = {
    title: string;
    id: number;
    active: boolean;
    sections: Section[];
};

export type PrimeNgMessageSeverity = 'success' | 'info' | 'warn' | 'error';

export type PrimeNgButtonSeverity =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'info'
  | 'warning'
  | 'help'
  | 'danger';

export type ConfirmDialogData = {
    message: string;
    header?: string;
    yes?: string;
    no?: string;
    buttonAppearance?: PrimeNgButtonSeverity;
  };


export type Note = {
  id: number;
  text: string;
  opened: boolean;
  backgroundClass?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  updatedDate?: Date;
}

