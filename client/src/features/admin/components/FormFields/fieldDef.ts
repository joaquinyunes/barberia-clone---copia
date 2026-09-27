export interface FieldDef {
  name: string;
  label: string;
  type?: "text" | "number" | "money" | "textarea" | "select" | "checkbox" | "date" | "time" | "email" | "tel" | "multiselect" | "list";
  options?: { value: string; label: string }[];
  placeholder?: string;
  hint?: string;
  required?: boolean;
  span?: 1 | 2;
  hidden?: boolean;
}
