/**
 * Describes a single field or a nested section in a form.
 *
 * - Leaf nodes have no `children` and produce a single `page.fill()` call.
 * - Branch nodes have `children` and represent a section (fieldset).
 * - The `path` is a dot-separated path into the data object (e.g. "vendor.address.street").
 *   If omitted, it defaults to `key` for leaves or is ignored for branches.
 */
export interface FieldDescriptor {
  /** data-testid segment for this field or section */
  key: string;
  /** Dot-path into the data object to resolve the value (leaf nodes only) */
  path?: string;
  /** Nested fields (branch nodes only) */
  children?: FieldDescriptor[];
}

/**
 * Configuration for a dynamic items table within a form.
 */
export interface ItemsConfig {
  /** data-testid of the "Add Item" button */
  addButtonTestId: string;
  /** Fields that make up each row */
  rowFields: FieldDescriptor[];
}

/**
 * Complete declarative definition of a form.
 */
export interface FormConfig {
  /** data-testid prefix, e.g. "po" or "cc" */
  prefix: string;
  /** Top-level field tree */
  fields: FieldDescriptor[];
  /** Optional items table configuration */
  items?: ItemsConfig;
  /** data-testid of the submit button (defaults to "{prefix}-submit-btn") */
  submitTestId?: string;
  /** data-testid of the success message element (defaults to "{prefix}-success-message") */
  successTestId?: string;
}
